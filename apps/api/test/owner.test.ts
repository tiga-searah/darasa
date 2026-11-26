import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function seedOwnerSetup() {
	const app = freshApp({ storage: memoryStorage() });
	const reg = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Owner A",
				email: "ownA@b.test",
				password: "min8chars",
			}),
		}),
	);
	const cookie = cookieOf(reg)!;
	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, "owna@b.test"));
	await db
		.update(schema.users)
		.set({ role: "owner" })
		.where(eq(schema.users.id, user.id));

	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", sortOrder: 1 })
		.returning();
	const [placeA, placeB] = await db
		.insert(schema.places)
		.values([
			{
				slug: "place-a",
				name: "Place A",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
				ownerVerified: true,
			},
			{
				slug: "place-b",
				name: "Place B",
				categoryId: cat.id,
				latitude: -6.92,
				longitude: 109.74,
				status: "published",
			},
		])
		.returning();
	await db.insert(schema.businessClaims).values({
		placeId: placeA.id,
		claimantId: user.id,
		status: "approved",
		evidence: { note: "NIB", documentMediaIds: [], contactPhone: "+628" },
	});
	return { app, cookie, user, placeA, placeB };
}

describe("owner dashboard places & stats", () => {
	beforeEach(resetDb);

	test("lists owned places, updates business info, rejects identity fields and other places", async () => {
		const { app, cookie, user, placeA, placeB } = await seedOwnerSetup();

		const list = await app.handle(
			new Request("http://test/api/owner/places", { headers: { cookie } }),
		);
		expect(list.status).toBe(200);
		expect((await json(list)).data.map((p: { id: string }) => p.id)).toEqual([
			placeA.id,
		]);

		// owner role cannot touch Place B without approved claim
		const other = await app.handle(
			new Request(`http://test/api/owner/places/${placeB.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ address: "Hacked" }),
			}),
		);
		expect(other.status).toBe(403);

		// identity fields rejected with 403 + fields
		const identity = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ name: "New Name", status: "archived" }),
			}),
		);
		expect(identity.status).toBe(403);
		const idBody = await json(identity);
		expect(idBody.error.fields).toHaveProperty("name");
		expect(idBody.error.fields).toHaveProperty("status");

		// valid update
		const ok = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					address: "Jl. Baru 1",
					phone: "+628123",
				}),
			}),
		);
		expect(ok.status).toBe(200);
		expect((await json(ok)).data.address).toBe("Jl. Baru 1");

		// invalid coverMediaId (not in place_photos) -> 422
		const badCover = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					coverMediaId: "00000000-0000-0000-0000-000000000000",
				}),
			}),
		);
		expect(badCover.status).toBe(422);

		// valid coverMediaId -> 200 and coverUrl populated in list & detail
		const [media] = await db
			.insert(schema.media)
			.values({
				ownerId: user.id,
				key: "places/cover.jpg",
				mime: "image/jpeg",
				sizeBytes: 123,
				purpose: "place_photo",
			})
			.returning();
		await db.insert(schema.placePhotos).values({
			placeId: placeA.id,
			mediaId: media.id,
			sortOrder: 0,
		});
		const goodCover = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ coverMediaId: media.id }),
			}),
		);
		expect(goodCover.status).toBe(200);
		expect((await json(goodCover)).data.coverUrl).toBeString();

		const listAfter = await app.handle(
			new Request("http://test/api/owner/places", { headers: { cookie } }),
		);
		expect(listAfter.status).toBe(200);
		expect((await json(listAfter)).data[0].coverUrl).toBeString();

		const detail = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}`, {
				headers: { cookie },
			}),
		);
		expect(detail.status).toBe(200);
		expect((await json(detail)).data.id).toBe(placeA.id);
	});

	test("GET /owner/places/:id/stats returns daily views and unanswered count", async () => {
		const { app, cookie, placeA } = await seedOwnerSetup();
		await app.handle(
			new Request(`http://test/api/places/${placeA.id}/view`, {
				method: "POST",
			}),
		);
		const res = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}/stats?days=7`, {
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.days).toBe(7);
		expect(body.data.totalViews).toBe(1);
		expect(body.data.ratingAvg).toBe(0);
		expect(body.data.reviewCount).toBe(0);
		expect(body.data.lastReviewAt).toBeNull();
		expect(body.data.unansweredReviews).toBe(0);
		expect(body.data.daily.length).toBe(1);
	});
});

describe("owner review replies", () => {
	beforeEach(resetDb);

	test("lists unanswered reviews, creates reply (201), updates reply (200), deletes reply (204)", async () => {
		const { app, cookie, placeA } = await seedOwnerSetup();
		const [reviewer] = await db
			.insert(schema.users)
			.values({ name: "Rev", email: "rev@b.test" })
			.returning();
		const [review] = await db
			.insert(schema.reviews)
			.values({
				placeId: placeA.id,
				userId: reviewer.id,
				rating: 5,
				body: "Mantap sekali rasanya!",
				status: "published",
			})
			.returning();

		const unanswered = await app.handle(
			new Request(
				`http://test/api/owner/places/${placeA.id}/reviews?unanswered=true`,
				{ headers: { cookie } },
			),
		);
		expect(unanswered.status).toBe(200);
		expect((await json(unanswered)).data.length).toBe(1);

		const createReply = await app.handle(
			new Request(`http://test/api/owner/reviews/${review.id}/reply`, {
				method: "PUT",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ body: "Terima kasih!" }),
			}),
		);
		expect(createReply.status).toBe(201);

		const updateReply = await app.handle(
			new Request(`http://test/api/owner/reviews/${review.id}/reply`, {
				method: "PUT",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ body: "Terima kasih banyak!" }),
			}),
		);
		expect(updateReply.status).toBe(200);
		expect((await json(updateReply)).data.body).toBe("Terima kasih banyak!");

		const afterReply = await app.handle(
			new Request(
				`http://test/api/owner/places/${placeA.id}/reviews?unanswered=true`,
				{ headers: { cookie } },
			),
		);
		expect((await json(afterReply)).data.length).toBe(0);

		const del = await app.handle(
			new Request(`http://test/api/owner/reviews/${review.id}/reply`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del.status).toBe(204);
	});
});
