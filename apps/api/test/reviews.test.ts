import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function registerUser(email: string, name = "User") {
	const res = await freshApp({ storage: memoryStorage() }).handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name, email, password: "min8chars" }),
		}),
	);
	return cookieOf(res)!;
}

async function seedPublishedPlace() {
	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", sortOrder: 1 })
		.returning();
	const [place] = await db
		.insert(schema.places)
		.values({
			slug: "warung-sate",
			name: "Warung Sate",
			categoryId: cat.id,
			latitude: -6.91,
			longitude: 109.73,
			status: "published",
		})
		.returning();
	return place;
}

describe("reviews & anomaly flags", () => {
	beforeEach(resetDb);

	test("create, duplicate 409, patch, and delete recompute place scores", async () => {
		const place = await seedPublishedPlace();
		const cookie = await registerUser("r1@b.test", "R1");
		const app = freshApp({ storage: memoryStorage() });

		const created = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 5, body: "Sambalnya juara sekali." }),
			}),
		);
		expect(created.status).toBe(201);
		const reviewId = (await json(created)).data.id;

		// duplicate -> 409
		const dup = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 4 }),
			}),
		);
		expect(dup.status).toBe(409);

		// patch -> updates place avg
		const patched = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 3 }),
			}),
		);
		expect(patched.status).toBe(200);
		let p = await db.query.places.findFirst({ where: { id: place.id } });
		expect(p!.ratingAvg).toBe(3);
		expect(p!.reviewCount).toBe(1);

		// delete -> soft removed, place avg resets to 0
		const del = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del.status).toBe(204);
		p = await db.query.places.findFirst({ where: { id: place.id } });
		expect(p!.ratingAvg).toBe(0);
		expect(p!.reviewCount).toBe(0);
	});

	test("rejects unowned or wrong-purpose photoMediaIds with 403", async () => {
		const place = await seedPublishedPlace();
		const ownerCookie = await registerUser("own@b.test");
		const otherCookie = await registerUser("other@b.test");
		const storage = memoryStorage();
		const app = freshApp({ storage });

		const up = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie: ownerCookie },
				body: JSON.stringify({
					purpose: "review_photo",
					mime: "image/png",
					sizeBytes: 12,
				}),
			}),
		);
		const { id: mediaId } = (await json(up)).data;

		const res = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: otherCookie },
				body: JSON.stringify({ rating: 5, photoMediaIds: [mediaId] }),
			}),
		);
		expect(res.status).toBe(403);
	});

	test("zero stdDev baseline does not crash or flag, while outlier triggers rating_outlier", async () => {
		const place = await seedPublishedPlace();
		const app = freshApp({ storage: memoryStorage() });

		// seed 10 identical 5-star reviews directly
		const users = await db
			.insert(schema.users)
			.values(
				Array.from({ length: 10 }, (_, i) => ({
					name: `U${i}`,
					email: `u${i}@b.test`,
				})),
			)
			.returning();
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		await db.insert(schema.reviews).values(
			users.map((u) => ({
				placeId: place.id,
				userId: u.id,
				rating: 5,
				status: "published" as const,
				createdAt: twoDaysAgo,
			})),
		);

		// 11th user posts a 5 -> stdDev = 0, must succeed without flagging
		const c11 = await registerUser("u11@b.test");
		const ok = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: c11 },
				body: JSON.stringify({ rating: 5 }),
			}),
		);
		expect(ok.status).toBe(201);
		expect((await db.select().from(schema.anomalyFlags)).length).toBe(0);

		// add one 4-star review so stdDev > 0, then a 1-star outlier
		const [u12] = await db
			.insert(schema.users)
			.values({ name: "U12", email: "u12@b.test" })
			.returning();
		await db.insert(schema.reviews).values({
			placeId: place.id,
			userId: u12.id,
			rating: 4,
			status: "published",
			createdAt: twoDaysAgo,
		});

		const c13 = await registerUser("u13@b.test");
		const outlier = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: c13 },
				body: JSON.stringify({ rating: 1 }),
			}),
		);
		expect(outlier.status).toBe(201);
		const flags = await db.select().from(schema.anomalyFlags);
		expect(flags.some((f) => f.kind === "rating_outlier")).toBe(true);
	});
});
