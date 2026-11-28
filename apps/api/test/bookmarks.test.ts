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
	const cookie = cookieOf(res);
	if (!cookie) throw new Error("Expected auth cookie");
	return cookie;
}

async function seedPlaces() {
	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", sortOrder: 1 })
		.returning();
	const [published1, published2, pending] = await db
		.insert(schema.places)
		.values([
			{
				slug: "warung-satu",
				name: "Warung Satu",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
			},
			{
				slug: "warung-dua",
				name: "Warung Dua",
				categoryId: cat.id,
				latitude: -6.92,
				longitude: 109.74,
				status: "published",
			},
			{
				slug: "warung-pending",
				name: "Warung Pending",
				categoryId: cat.id,
				latitude: -6.93,
				longitude: 109.75,
				status: "pending",
			},
		])
		.returning();
	return { published1, published2, pending };
}

describe("bookmarks", () => {
	beforeEach(resetDb);

	test("unauthenticated requests return 401", async () => {
		const { published1 } = await seedPlaces();
		const app = freshApp({ storage: memoryStorage() });

		const listRes = await app.handle(new Request("http://test/api/bookmarks"));
		expect(listRes.status).toBe(401);

		const addRes = await app.handle(
			new Request(`http://test/api/places/${published1.id}/bookmark`, {
				method: "POST",
			}),
		);
		expect(addRes.status).toBe(401);

		const delRes = await app.handle(
			new Request(`http://test/api/places/${published1.id}/bookmark`, {
				method: "DELETE",
			}),
		);
		expect(delRes.status).toBe(401);
	});

	test("returns 404 for unknown or unpublished place", async () => {
		const { pending } = await seedPlaces();
		const cookie = await registerUser("bm404@b.test");
		const app = freshApp({ storage: memoryStorage() });
		const missingId = "00000000-0000-4000-8000-000000000000";

		const postMissing = await app.handle(
			new Request(`http://test/api/places/${missingId}/bookmark`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(postMissing.status).toBe(404);

		const postPending = await app.handle(
			new Request(`http://test/api/places/${pending.id}/bookmark`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(postPending.status).toBe(404);

		const delMissing = await app.handle(
			new Request(`http://test/api/places/${missingId}/bookmark`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(delMissing.status).toBe(404);
	});

	test("POST bookmark (idempotent), GET /bookmarks, DELETE bookmark", async () => {
		const { published1, published2 } = await seedPlaces();
		const cookie = await registerUser("bm@b.test");
		const app = freshApp({ storage: memoryStorage() });

		// Add bookmark
		const add1 = await app.handle(
			new Request(`http://test/api/places/${published1.id}/bookmark`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(add1.status).toBe(200);
		expect((await json(add1)).data).toEqual({ bookmarked: true });

		// Idempotent repeat
		const addRepeat = await app.handle(
			new Request(`http://test/api/places/${published1.id}/bookmark`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(addRepeat.status).toBe(200);
		expect((await json(addRepeat)).data).toEqual({ bookmarked: true });

		// Add second bookmark
		const add2 = await app.handle(
			new Request(`http://test/api/places/${published2.id}/bookmark`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(add2.status).toBe(200);

		// List bookmarks with pagination
		const listPage1 = await app.handle(
			new Request("http://test/api/bookmarks?page=1&limit=1", {
				headers: { cookie },
			}),
		);
		expect(listPage1.status).toBe(200);
		const body1 = await json(listPage1);
		expect(body1.data).toHaveLength(1);
		expect(body1.data[0].bookmarked).toBe(true);
		expect(body1.meta).toEqual({
			page: 1,
			limit: 1,
			total: 2,
			totalPages: 2,
		});

		// Delete first bookmark
		const del1 = await app.handle(
			new Request(`http://test/api/places/${published1.id}/bookmark`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del1.status).toBe(200);
		expect((await json(del1)).data).toEqual({ bookmarked: false });

		// List bookmarks again -> only published2 remains
		const listAfter = await app.handle(
			new Request("http://test/api/bookmarks", {
				headers: { cookie },
			}),
		);
		expect(listAfter.status).toBe(200);
		const bodyAfter = await json(listAfter);
		expect(bodyAfter.data).toHaveLength(1);
		expect(bodyAfter.data[0].id).toBe(published2.id);
	});

	test("GET /bookmarks?q=... filters bookmarked places by keyword", async () => {
		const { published1, published2 } = await seedPlaces();
		const cookie = await registerUser("bmq@b.test");
		const app = freshApp({ storage: memoryStorage() });

		await app.handle(
			new Request(`http://test/api/places/${published1.id}/bookmark`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		await app.handle(
			new Request(`http://test/api/places/${published2.id}/bookmark`, {
				method: "POST",
				headers: { cookie },
			}),
		);

		const filtered = await app.handle(
			new Request("http://test/api/bookmarks?q=Satu", {
				headers: { cookie },
			}),
		);
		expect(filtered.status).toBe(200);
		const body = await json(filtered);
		expect(body.data.map((p: { slug: string }) => p.slug)).toEqual([
			"warung-satu",
		]);
		expect(body.meta.total).toBe(1);
	});
});
