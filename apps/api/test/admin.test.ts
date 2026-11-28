import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function adminCookie() {
	const app = freshApp({ storage: memoryStorage() });
	const res = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Admin",
				email: "adm@b.test",
				password: "min8chars",
			}),
		}),
	);
	await db
		.update(schema.users)
		.set({ role: "admin" })
		.where(eq(schema.users.email, "adm@b.test"));
	return cookieOf(res)!;
}

describe("admin moderation", () => {
	beforeEach(resetDb);

	test("PATCH /places/:id enforces status transition state machine", async () => {
		const cookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "p-mod",
				name: "P Mod",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "pending",
			})
			.returning();

		// pending -> archived is invalid (409)
		const bad = await app.handle(
			new Request(`http://test/api/places/${place.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ status: "archived" }),
			}),
		);
		expect(bad.status).toBe(409);

		// pending -> published -> archived -> published
		for (const next of ["published", "archived", "published"] as const) {
			const res = await app.handle(
				new Request(`http://test/api/places/${place.id}`, {
					method: "PATCH",
					headers: { "content-type": "application/json", cookie },
					body: JSON.stringify({ status: next }),
				}),
			);
			expect(res.status).toBe(200);
		}
	});

	test("verification blocks clearing ownerVerified when approved claim exists", async () => {
		const cookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "p-ver",
				name: "P Ver",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
				ownerVerified: true,
			})
			.returning();
		const [owner] = await db
			.insert(schema.users)
			.values({ name: "Own", email: "o@b.test" })
			.returning();
		await db.insert(schema.businessClaims).values({
			placeId: place.id,
			claimantId: owner.id,
			status: "approved",
			evidence: { note: "NIB", documentMediaIds: [], contactPhone: "+62" },
		});

		const blocked = await app.handle(
			new Request(`http://test/api/admin/places/${place.id}/verification`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ ownerVerified: false }),
			}),
		);
		expect(blocked.status).toBe(409);

		const community = await app.handle(
			new Request(`http://test/api/admin/places/${place.id}/verification`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ communityVerified: true }),
			}),
		);
		expect(community.status).toBe(200);
		const communityBody = await json(community);
		expect(communityBody.data.communityVerified).toBe(true);
		expect(communityBody.data.exploreScore).toBeGreaterThan(0);
	});

	test("review moderation recomputes place stats and anomaly resolve does not", async () => {
		const cookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "p-rev",
				name: "P Rev",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
				ratingAvg: 5,
				reviewCount: 1,
			})
			.returning();
		const [u] = await db
			.insert(schema.users)
			.values({ name: "U", email: "u@b.test" })
			.returning();
		const [rev] = await db
			.insert(schema.reviews)
			.values({
				placeId: place.id,
				userId: u.id,
				rating: 5,
				status: "published",
			})
			.returning();
		const [flag] = await db
			.insert(schema.anomalyFlags)
			.values({
				placeId: place.id,
				reviewId: rev.id,
				userId: u.id,
				kind: "rating_outlier",
				metrics: {
					zScore: 3,
					mean: 2,
					stdDev: 1,
					windowDays: 30,
					sampleSize: 10,
				},
				reason: "Outlier",
			})
			.returning();

		// resolve anomaly -> review remains published
		const resFlag = await app.handle(
			new Request(`http://test/api/admin/anomalies/${flag.id}/resolve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					status: "dismissed",
					note: "Valid local customer",
				}),
			}),
		);
		expect(resFlag.status).toBe(200);

		const resFlagAgain = await app.handle(
			new Request(`http://test/api/admin/anomalies/${flag.id}/resolve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					status: "confirmed",
					note: "Duplicate resolve",
				}),
			}),
		);
		expect(resFlagAgain.status).toBe(409);

		// hide review -> place reviewCount drops to 0
		const hide = await app.handle(
			new Request(`http://test/api/admin/reviews/${rev.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ status: "hidden" }),
			}),
		);
		expect(hide.status).toBe(200);
		const updatedPlace = await db.query.places.findFirst({
			where: { id: place.id },
		});
		expect(updatedPlace?.reviewCount).toBe(0);
	});

	test("GET /admin/places, GET /admin/anomalies, DELETE /places/:id, and 403 non-admin", async () => {
		const admCookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const reg = await app.handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "User",
					email: "usr@b.test",
					password: "min8chars",
				}),
			}),
		);
		const userCookie = cookieOf(reg) ?? "";

		const forbiddenRes = await app.handle(
			new Request("http://test/api/admin/places", {
				headers: { cookie: userCookie },
			}),
		);
		expect(forbiddenRes.status).toBe(403);

		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "p-list",
				name: "P List",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "pending",
			})
			.returning();
		await db.insert(schema.anomalyFlags).values({
			placeId: place.id,
			kind: "review_burst",
			metrics: {
				zScore: 3,
				mean: 1,
				stdDev: 0.5,
				windowDays: 7,
				sampleSize: 5,
			},
			reason: "Burst",
		});

		const placesRes = await app.handle(
			new Request("http://test/api/admin/places?status=pending", {
				headers: { cookie: admCookie },
			}),
		);
		expect(placesRes.status).toBe(200);
		expect((await json(placesRes)).data).toHaveLength(1);

		const anomaliesRes = await app.handle(
			new Request("http://test/api/admin/anomalies?status=open", {
				headers: { cookie: admCookie },
			}),
		);
		expect(anomaliesRes.status).toBe(200);
		expect((await json(anomaliesRes)).data).toHaveLength(1);

		const delRes = await app.handle(
			new Request(`http://test/api/places/${place.id}`, {
				method: "DELETE",
				headers: { cookie: admCookie },
			}),
		);
		expect(delRes.status).toBe(204);
	});

	test("resolve anomaly with status cleared and omitted note persists dismissed", async () => {
		const cookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung-anom", sortOrder: 1 })
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "p-anom",
				name: "P Anom",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
			})
			.returning();
		const [anom, otherAnom] = await db
			.insert(schema.anomalyFlags)
			.values([
				{
					placeId: place.id,
					kind: "review_burst",
					status: "open",
					reason: "burst",
					metrics: {
						zScore: 2,
						mean: 1,
						stdDev: 0.5,
						windowDays: 7,
						sampleSize: 5,
					},
				},
				{
					placeId: place.id,
					kind: "rating_outlier",
					status: "open",
					reason: "outlier",
					metrics: {
						zScore: 3,
						mean: 1,
						stdDev: 0.5,
						windowDays: 7,
						sampleSize: 5,
					},
				},
			])
			.returning();

		const res = await app.handle(
			new Request(`http://test/api/admin/anomalies/${anom.id}/resolve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ status: "cleared" }),
			}),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.status).toBe("dismissed");
		const [untouched] = await db
			.select({ status: schema.anomalyFlags.status })
			.from(schema.anomalyFlags)
			.where(eq(schema.anomalyFlags.id, otherAnom.id));
		expect(untouched?.status).toBe("open");
	});

	test("GET /admin/places and GET /admin/anomalies support status=all, q, district, verified", async () => {
		const admCookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [p1, p2] = await db
			.insert(schema.places)
			.values([
				{
					slug: "warung-maju",
					name: "Warung Maju",
					address: "Jl. Merdeka 1",
					district: "Batang",
					categoryId: cat.id,
					latitude: -6.91,
					longitude: 109.73,
					status: "pending",
					communityVerified: true,
				},
				{
					slug: "kedai-senja",
					name: "Kedai Senja",
					address: "Jl. Sudirman 2",
					district: "Pekalongan",
					categoryId: cat.id,
					latitude: -6.92,
					longitude: 109.74,
					status: "published",
					ownerVerified: true,
				},
			])
			.returning();
		await db.insert(schema.anomalyFlags).values([
			{
				placeId: p1.id,
				kind: "review_burst",
				metrics: {
					zScore: 3,
					mean: 1,
					stdDev: 0.5,
					windowDays: 7,
					sampleSize: 5,
				},
				reason: "Sudden burst",
				status: "open",
			},
			{
				placeId: p2.id,
				kind: "review_burst",
				metrics: {
					zScore: 4,
					mean: 1,
					stdDev: 0.5,
					windowDays: 7,
					sampleSize: 6,
				},
				reason: "Old dismissed",
				status: "dismissed",
			},
		]);

		const allPlaces = await app.handle(
			new Request("http://test/api/admin/places?status=all", {
				headers: { cookie: admCookie },
			}),
		);
		expect(allPlaces.status).toBe(200);
		expect((await json(allPlaces)).data).toHaveLength(2);

		const filteredPlaces = await app.handle(
			new Request(
				"http://test/api/admin/places?status=all&q=Senja&district=Pekalongan&verified=owner",
				{ headers: { cookie: admCookie } },
			),
		);
		expect(filteredPlaces.status).toBe(200);
		const fpBody = await json(filteredPlaces);
		expect(fpBody.data).toHaveLength(1);
		expect(fpBody.data[0].id).toBe(p2.id);

		const allAnomalies = await app.handle(
			new Request("http://test/api/admin/anomalies?status=all&q=burst", {
				headers: { cookie: admCookie },
			}),
		);
		expect(allAnomalies.status).toBe(200);
		const aaBody = await json(allAnomalies);
		expect(aaBody.data).toHaveLength(1);
		expect(aaBody.data[0].place.id).toBe(p1.id);
	});
});
