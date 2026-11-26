import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

async function setupUserAndCat(storage = memoryStorage()) {
	const app = freshApp({ storage });
	const reg = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Arya",
				email: "p@b.test",
				password: "min8chars",
			}),
		}),
	);
	const cookie = cookieOf(reg)!;
	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", sortOrder: 1 })
		.returning();
	return { app, cookie, cat };
}

describe("POST /places", () => {
	beforeEach(resetDb);

	test("creates a pending place with committed photos and sets coverMediaId", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);

		// upload + commit a photo
		const up = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					purpose: "place_photo",
					mime: "image/png",
					sizeBytes: 12,
				}),
			}),
		);
		const { id: mediaId } = (await json(up)).data;
		const row = await db.query.media.findFirst({ where: { id: mediaId } });
		await storage.put(row!.key, PNG, "image/png");
		await app.handle(
			new Request(`http://test/api/media/${mediaId}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);

		const res = await app.handle(
			new Request("http://test/api/places", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					name: "Warung Bu Tini",
					categoryId: cat.id,
					latitude: -6.9123,
					longitude: 109.7301,
					address: "Jl. Raya Batang No. 12",
					photoMediaIds: [mediaId],
				}),
			}),
		);
		expect(res.status).toBe(201);
		const body = await json(res);
		expect(body.data.slug).toStartWith("warung-bu-tini-");
		expect(body.data.photos.length).toBe(1);
		expect(body.data.coverUrl).toBeTruthy();

		const dbPlace = await db.query.places.findFirst({
			where: { id: body.data.id },
		});
		expect(dbPlace!.status).toBe("pending");
	});

	test("enforces 3 submissions per user per day with 429", async () => {
		const { app, cookie, cat } = await setupUserAndCat();
		const post = (name: string) =>
			app.handle(
				new Request("http://test/api/places", {
					method: "POST",
					headers: { "content-type": "application/json", cookie },
					body: JSON.stringify({
						name,
						categoryId: cat.id,
						latitude: -6.91,
						longitude: 109.73,
					}),
				}),
			);
		expect((await post("P1")).status).toBe(201);
		expect((await post("P2")).status).toBe(201);
		expect((await post("P3")).status).toBe(201);
		const fourth = await post("P4");
		expect(fourth.status).toBe(429);
		expect((await json(fourth)).error.code).toBe("RATE_LIMITED");
	});

	test("accepts openingHours object payload", async () => {
		const { app, cookie, cat } = await setupUserAndCat();
		const res = await app.handle(
			new Request("http://test/api/places", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					name: "Warung Jam",
					categoryId: cat.id,
					latitude: -6.91,
					longitude: 109.73,
					openingHours: { mon: { open: "08:00", close: "20:00" }, sun: null },
				}),
			}),
		);
		expect(res.status).toBe(201);
	});

	test("rejects >5 photoMediaIds with 422", async () => {
		const { app, cookie, cat } = await setupUserAndCat();
		const ids = Array.from({ length: 6 }, () => crypto.randomUUID());
		const res = await app.handle(
			new Request("http://test/api/places", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					name: "Warung Banyak Foto",
					categoryId: cat.id,
					latitude: -6.91,
					longitude: 109.73,
					photoMediaIds: ids,
				}),
			}),
		);
		expect(res.status).toBe(422);
	});

	test("rejects unowned or wrong-purpose photoMediaIds with 403", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);
		const up = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					purpose: "review_photo",
					mime: "image/png",
					sizeBytes: 12,
				}),
			}),
		);
		const { id: mediaId } = (await json(up)).data;
		const row = await db.query.media.findFirst({ where: { id: mediaId } });
		await storage.put(row!.key, PNG, "image/png");
		await app.handle(
			new Request(`http://test/api/media/${mediaId}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		const res = await app.handle(
			new Request("http://test/api/places", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					name: "Warung Salah Media",
					categoryId: cat.id,
					latitude: -6.91,
					longitude: 109.73,
					photoMediaIds: [mediaId],
				}),
			}),
		);
		expect(res.status).toBe(403);
	});
});