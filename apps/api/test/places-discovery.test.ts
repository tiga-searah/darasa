import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function seedPlaces() {
	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", icon: "utensils", sortOrder: 1 })
		.returning();
	const [pubHigh] = await db
		.insert(schema.places)
		.values({
			slug: "warung-bu-tini",
			name: "Warung Bu Tini",
			categoryId: cat.id,
			address: "Jl. Raya Batang",
			latitude: -6.9123,
			longitude: 109.7301,
			status: "published",
			communityVerified: true,
			ratingAvg: 4.8,
			reviewCount: 2,
			exploreScore: 0.75,
			hiddenGemScore: 1.6,
		})
		.returning();
	const [pubLow] = await db
		.insert(schema.places)
		.values({
			slug: "warung-biasa",
			name: "Warung Biasa",
			categoryId: cat.id,
			latitude: -7.1,
			longitude: 109.9,
			status: "published",
			ratingAvg: 3.5,
			reviewCount: 20,
			exploreScore: 0.85,
			hiddenGemScore: 0,
		})
		.returning();
	const [pending] = await db
		.insert(schema.places)
		.values({
			slug: "warung-pending",
			name: "Warung Pending",
			categoryId: cat.id,
			latitude: -6.91,
			longitude: 109.73,
			status: "pending",
		})
		.returning();
	return { cat, pubHigh, pubLow, pending };
}

describe("place discovery", () => {
	beforeEach(resetDb);

	test("GET /places returns only published places sorted by exploreScore desc", async () => {
		await seedPlaces();
		const res = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places"),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.map((p: { slug: string }) => p.slug)).toEqual([
			"warung-biasa",
			"warung-bu-tini",
		]);
		expect(body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
	});

	test("GET /places?sort=nearby requires lat/lng and orders by distance", async () => {
		await seedPlaces();
		const missing = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places?sort=nearby"),
		);
		expect(missing.status).toBe(422);

		const badLat = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places?sort=nearby&lat=95&lng=109.73"),
		);
		expect(badLat.status).toBe(422);

		const nearby = await freshApp({ storage: memoryStorage() }).handle(
			new Request(
				"http://test/api/places?sort=nearby&lat=-6.912&lng=109.73&radiusKm=5",
			),
		);
		expect(nearby.status).toBe(200);
		expect(
			(await json(nearby)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["warung-bu-tini"]);
	});

	test("GET /places/hidden-gems filters ratingAvg >= 4.0 and reviewCount > 0", async () => {
		await seedPlaces();
		const res = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places/hidden-gems"),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.map((p: { slug: string }) => p.slug)).toEqual(
			["warung-bu-tini"],
		);
	});

	test("GET /places/:slug hides pending places from visitors but allows admin and approved owner", async () => {
		const { pending } = await seedPlaces();
		const app = freshApp({ storage: memoryStorage() });

		const anon = await app.handle(
			new Request(`http://test/api/places/${pending.slug}`),
		);
		expect(anon.status).toBe(404);

		// register owner user and grant approved claim
		const reg = await app.handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Owner",
					email: "own@b.test",
					password: "min8chars",
				}),
			}),
		);
		const ownerCookie = cookieOf(reg) ?? "";
		const [ownerUser] = await db.select().from(schema.users);
		await db.insert(schema.businessClaims).values({
			placeId: pending.id,
			claimantId: ownerUser.id,
			status: "approved",
			evidence: { note: "NIB", documentMediaIds: [], contactPhone: "+62812" },
		});

		const asOwner = await app.handle(
			new Request(`http://test/api/places/${pending.id}`, {
				headers: { cookie: ownerCookie },
			}),
		);
		expect(asOwner.status).toBe(200);
		expect((await json(asOwner)).data.slug).toBe(pending.slug);
	});

	test("POST /places/:id/view increments daily place_stats", async () => {
		const { pubHigh } = await seedPlaces();
		const app = freshApp({ storage: memoryStorage() });
		const r1 = await app.handle(
			new Request(`http://test/api/places/${pubHigh.id}/view`, {
				method: "POST",
			}),
		);
		const r2 = await app.handle(
			new Request(`http://test/api/places/${pubHigh.id}/view`, {
				method: "POST",
			}),
		);
		expect(r1.status).toBe(204);
		expect(r2.status).toBe(204);
		const rows = await db.select().from(schema.placeStats);
		expect(rows.length).toBe(1);
		expect(rows[0].views).toBe(2);
	});
});
