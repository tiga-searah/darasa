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
});
