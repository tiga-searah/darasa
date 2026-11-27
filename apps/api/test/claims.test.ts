import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function registerAs(email: string, role: "user" | "admin" = "user") {
	const app = freshApp({ storage: memoryStorage() });
	const res = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: email, email, password: "min8chars" }),
		}),
	);
	if (role === "admin") {
		await db
			.update(schema.users)
			.set({ role: "admin" })
			.where(eq(schema.users.email, email));
	}
	return cookieOf(res)!;
}

async function seedPlace(status: "published" | "pending" = "published") {
	const [cat] = await db
		.insert(schema.categories)
		.values({
			name: "Warung",
			slug: `w-${crypto.randomUUID().slice(0, 6)}`,
			sortOrder: 1,
		})
		.returning();
	const [place] = await db
		.insert(schema.places)
		.values({
			slug: `p-${crypto.randomUUID().slice(0, 6)}`,
			name: "Warung Klaim",
			categoryId: cat.id,
			latitude: -6.91,
			longitude: 109.73,
			status,
		})
		.returning();
	return place;
}

describe("business claims", () => {
	beforeEach(resetDb);

	test("submit claim, reject frees slot, re-submit and approve promotes owner", async () => {
		const place = await seedPlace("published");
		const pendingPlace = await seedPlace("pending");
		const userCookie = await registerAs("owner@b.test");
		const adminCookie = await registerAs("admin@b.test", "admin");
		const app = freshApp({ storage: memoryStorage() });

		// 404 on non-published place
		const onPending = await app.handle(
			new Request(`http://test/api/places/${pendingPlace.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "Pemilik",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(onPending.status).toBe(404);

		// submit valid claim
		const c1 = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB 123",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(c1.status).toBe(201);
		const claim1Id = (await json(c1)).data.id;

		// duplicate live claim -> 409
		const dup = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB 123",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(dup.status).toBe(409);

		// reject claim -> frees slot
		const rej = await app.handle(
			new Request(`http://test/api/admin/claims/${claim1Id}/reject`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: adminCookie },
				body: JSON.stringify({ note: "Dokumen kurang jelas" }),
			}),
		);
		expect(rej.status).toBe(200);
		expect((await json(rej)).data.status).toBe("rejected");

		// re-submit and approve
		const c2 = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB jelas",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(c2.status).toBe(201);
		const claim2Id = (await json(c2)).data.id;

		const appRes = await app.handle(
			new Request(`http://test/api/admin/claims/${claim2Id}/approve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: adminCookie },
				body: JSON.stringify({ note: "Terverifikasi" }),
			}),
		);
		expect(appRes.status).toBe(200);

		const updatedPlace = await db.query.places.findFirst({
			where: { id: place.id },
		});
		expect(updatedPlace!.ownerVerified).toBe(true);
		expect(updatedPlace!.exploreScore).toBeGreaterThan(0);

		const [ownerUser] = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, "owner@b.test"));
		expect(ownerUser.role).toBe("owner");
	});

	test("GET /claims/mine with coverUrl, GET /admin/claims, 403s, and 409 on resolved claim", async () => {
		const userCookie = await registerAs("claimant@b.test");
		const otherCookie = await registerAs("other@b.test");
		const adminCookie = await registerAs("admin2@b.test", "admin");
		const app = freshApp({ storage: memoryStorage() });

		const [claimantUser] = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, "claimant@b.test"));
		const [otherUser] = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, "other@b.test"));

		const [coverMedia] = await db
			.insert(schema.media)
			.values({
				key: "places/cover-1.jpg",
				purpose: "place_photo",
				status: "ready",
				isPrivate: false,
				ownerId: claimantUser.id,
			})
			.returning();

		const [wrongPurposeMedia] = await db
			.insert(schema.media)
			.values({
				key: "reviews/r-1.jpg",
				purpose: "review_photo",
				status: "ready",
				isPrivate: false,
				ownerId: claimantUser.id,
			})
			.returning();

		const [unownedMedia] = await db
			.insert(schema.media)
			.values({
				key: "claims/c-other.pdf",
				purpose: "claim_document",
				status: "ready",
				isPrivate: true,
				ownerId: otherUser.id,
			})
			.returning();

		const [cat] = await db
			.insert(schema.categories)
			.values({
				name: "Kafe",
				slug: `k-${crypto.randomUUID().slice(0, 6)}`,
				sortOrder: 1,
			})
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: `p-${crypto.randomUUID().slice(0, 6)}`,
				name: "Kafe Cover",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
				coverMediaId: coverMedia.id,
			})
			.returning();

		// 403 on wrong-purpose media
		const wrongPurposeRes = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB",
						documentMediaIds: [wrongPurposeMedia.id],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(wrongPurposeRes.status).toBe(403);

		// 403 on unowned media
		const unownedRes = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB",
						documentMediaIds: [unownedMedia.id],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(unownedRes.status).toBe(403);

		// submit valid claim
		const createRes = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB 999",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(createRes.status).toBe(201);
		const claimId = (await json(createRes)).data.id;

		// GET /claims/mine verifies coverUrl string
		const mineRes = await app.handle(
			new Request("http://test/api/claims/mine", {
				headers: { cookie: userCookie },
			}),
		);
		expect(mineRes.status).toBe(200);
		const mineBody = await json(mineRes);
		expect(mineBody.data.length).toBe(1);
		expect(typeof mineBody.data[0].place.coverUrl).toBe("string");
		expect(mineBody.data[0].place.coverUrl).toContain("places/cover-1.jpg");

		// 403 non-admin on /admin/claims
		const nonAdminRes = await app.handle(
			new Request("http://test/api/admin/claims", {
				headers: { cookie: userCookie },
			}),
		);
		expect(nonAdminRes.status).toBe(403);

		// GET /admin/claims
		const adminListRes = await app.handle(
			new Request(
				"http://test/api/admin/claims?status=pending&page=1&limit=10",
				{
					headers: { cookie: adminCookie },
				},
			),
		);
		expect(adminListRes.status).toBe(200);
		const adminListBody = await json(adminListRes);
		expect(adminListBody.data.length).toBe(1);
		expect(adminListBody.meta.totalPages).toBe(1);

		// approve claim
		const approveRes = await app.handle(
			new Request(`http://test/api/admin/claims/${claimId}/approve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: adminCookie },
				body: JSON.stringify({ note: "OK" }),
			}),
		);
		expect(approveRes.status).toBe(200);

		// 409 on approving or rejecting already-resolved claim
		const reApprove = await app.handle(
			new Request(`http://test/api/admin/claims/${claimId}/approve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: adminCookie },
				body: JSON.stringify({ note: "Again" }),
			}),
		);
		expect(reApprove.status).toBe(409);

		const reReject = await app.handle(
			new Request(`http://test/api/admin/claims/${claimId}/reject`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: adminCookie },
				body: JSON.stringify({ note: "Too late" }),
			}),
		);
		expect(reReject.status).toBe(409);
	});

	test("submit claim with businessRole, reject without note, GET /claims/mine includes placeName, claimantName, evidence", async () => {
		const place = await seedPlace("published");
		const userCookie = await registerAs("claimant@b.test");
		const adminCookie = await registerAs("admin2@b.test", "admin");
		const app = freshApp({ storage: memoryStorage() });

		const submitRes = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "Owner",
						documentMediaIds: [],
						contactPhone: "+6281234",
						businessRole: "Founder",
					},
				}),
			}),
		);
		expect(submitRes.status).toBe(201);
		const claimId = (await json(submitRes)).data.id;

		const mineRes = await app.handle(
			new Request("http://test/api/claims/mine", {
				headers: { cookie: userCookie },
			}),
		);
		expect(mineRes.status).toBe(200);
		const mineBody = await json(mineRes);
		expect(mineBody.data).toHaveLength(1);
		expect(mineBody.data[0].placeName).toBe("Warung Klaim");
		expect(mineBody.data[0].claimantName).toBe("claimant@b.test");
		expect(mineBody.data[0].evidence.businessRole).toBe("Founder");

		const rejRes = await app.handle(
			new Request(`http://test/api/admin/claims/${claimId}/reject`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: adminCookie },
				body: JSON.stringify({}),
			}),
		);
		expect(rejRes.status).toBe(200);
		expect((await json(rejRes)).data.status).toBe("rejected");
	});
});
