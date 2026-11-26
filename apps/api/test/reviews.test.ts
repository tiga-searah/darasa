import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
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
	const cookie = cookieOf(res);
	if (!cookie) throw new Error("Expected auth cookie");
	return cookie;
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
		expect(p?.ratingAvg).toBe(3);
		expect(p?.reviewCount).toBe(1);

		// delete -> soft removed, place avg resets to 0
		const del = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del.status).toBe(204);
		p = await db.query.places.findFirst({ where: { id: place.id } });
		expect(p?.ratingAvg).toBe(0);
		expect(p?.reviewCount).toBe(0);
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

	test("GET list supports sort, withPhotos, and mine", async () => {
		const place = await seedPublishedPlace();
		const c1 = await registerUser("l1@b.test", "L1");
		const c2 = await registerUser("l2@b.test", "L2");
		const app = freshApp({ storage: memoryStorage() });

		await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: c1 },
				body: JSON.stringify({ rating: 2, body: "Lumayan tapi agak lama." }),
			}),
		);
		await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: c2 },
				body: JSON.stringify({ rating: 5, body: "Enak banget dan cepat." }),
			}),
		);

		const highest = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews?sort=highest`, {
				headers: { cookie: c1 },
			}),
		);
		expect(highest.status).toBe(200);
		const highestBody = await json(highest);
		expect(highestBody.data.length).toBe(2);
		expect(highestBody.data[0].rating).toBe(5);
		expect(highestBody.data[0].mine).toBe(false);
		expect(highestBody.data[1].mine).toBe(true);

		const withPhotos = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews?withPhotos=true`),
		);
		expect(withPhotos.status).toBe(200);
		expect((await json(withPhotos)).data.length).toBe(0);
	});

	test("validates body bounds and UUID params with 422", async () => {
		const place = await seedPublishedPlace();
		const cookie = await registerUser("val@b.test");
		const app = freshApp({ storage: memoryStorage() });

		const shortBody = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 5, body: "short" }),
			}),
		);
		expect(shortBody.status).toBe(422);

		const badUuid = await app.handle(
			new Request("http://test/api/places/not-a-uuid/reviews"),
		);
		expect(badUuid.status).toBe(422);
	});

	test("enforces 5/day rate limit (429) and triggers review_burst", async () => {
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Kafe", slug: "kafe", sortOrder: 1 })
			.returning();
		const places = await db
			.insert(schema.places)
			.values(
				Array.from({ length: 6 }, (_, i) => ({
					slug: `place-${i}`,
					name: `Place ${i}`,
					categoryId: cat.id,
					latitude: -6.91,
					longitude: 109.73,
					status: "published" as const,
				})),
			)
			.returning();
		const app = freshApp({ storage: memoryStorage() });
		const cookie = await registerUser("burst@b.test");

		for (let i = 0; i < 5; i++) {
			const res = await app.handle(
				new Request(`http://test/api/places/${places[i].id}/reviews`, {
					method: "POST",
					headers: { "content-type": "application/json", cookie },
					body: JSON.stringify({ rating: 5 }),
				}),
			);
			expect(res.status).toBe(201);
		}

		const sixth = await app.handle(
			new Request(`http://test/api/places/${places[5].id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 5 }),
			}),
		);
		expect(sixth.status).toBe(429);

		// 5 distinct users on places[0] within 24h -> review_burst
		for (let i = 0; i < 4; i++) {
			const c = await registerUser(`bu${i}@b.test`);
			const r = await app.handle(
				new Request(`http://test/api/places/${places[0].id}/reviews`, {
					method: "POST",
					headers: { "content-type": "application/json", cookie: c },
					body: JSON.stringify({ rating: 4 }),
				}),
			);
			expect(r.status).toBe(201);
		}
		const flags = await db.select().from(schema.anomalyFlags);
		expect(flags.some((f) => f.kind === "review_burst")).toBe(true);
	});

	test("foreign PATCH/DELETE 403, admin DELETE 204, and PATCH removed 409", async () => {
		const place = await seedPublishedPlace();
		const authorCookie = await registerUser("auth@b.test");
		const otherCookie = await registerUser("oth@b.test");
		const adminCookie = await registerUser("adm@b.test");
		await db
			.update(schema.users)
			.set({ role: "admin" })
			.where(eq(schema.users.email, "adm@b.test"));

		const app = freshApp({ storage: memoryStorage() });
		const created = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: authorCookie },
				body: JSON.stringify({ rating: 4 }),
			}),
		);
		const reviewId = (await json(created)).data.id;

		const foreignPatch = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie: otherCookie },
				body: JSON.stringify({ rating: 2 }),
			}),
		);
		expect(foreignPatch.status).toBe(403);

		const foreignDel = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "DELETE",
				headers: { cookie: otherCookie },
			}),
		);
		expect(foreignDel.status).toBe(403);

		const adminDel = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "DELETE",
				headers: { cookie: adminCookie },
			}),
		);
		expect(adminDel.status).toBe(204);

		const patchRemoved = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie: authorCookie },
				body: JSON.stringify({ rating: 5 }),
			}),
		);
		expect(patchRemoved.status).toBe(409);
	});

	test("concurrent duplicate POST returns one 201 and one 409", async () => {
		const place = await seedPublishedPlace();
		const cookie = await registerUser("race@b.test");
		const app = freshApp({ storage: memoryStorage() });

		const req = () =>
			app.handle(
				new Request(`http://test/api/places/${place.id}/reviews`, {
					method: "POST",
					headers: { "content-type": "application/json", cookie },
					body: JSON.stringify({ rating: 5 }),
				}),
			);

		const [r1, r2] = await Promise.all([req(), req()]);
		const statuses = [r1.status, r2.status].sort();
		expect(statuses).toEqual([201, 409]);
	});
});
