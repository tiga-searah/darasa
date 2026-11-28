import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { getContributorLevel } from "../src/lib/xp";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

type TestApp = { handle: (request: Request) => Promise<Response> };

async function registerAndCookie(
	app: TestApp,
	email = "user@test.local",
	name = "Tester",
) {
	const res = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name, email, password: "password123" }),
		}),
	);
	expect(res.status).toBe(201);
	const body = await json(res);
	const cookie = cookieOf(res);
	if (!cookie) throw new Error("Expected auth cookie");
	return { cookie, user: body.data };
}

async function uploadAndCommitPhoto(
	app: TestApp,
	storage: ReturnType<typeof memoryStorage>,
	cookie: string,
) {
	const up = await app.handle(
		new Request("http://test/api/media/uploads", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify({
				purpose: "place_photo",
				mime: "image/png",
				sizeBytes: PNG.byteLength,
			}),
		}),
	);
	expect(up.status).toBe(201);
	const { id: mediaId } = (await json(up)).data;
	const row = await db.query.media.findFirst({ where: { id: mediaId } });
	if (!row) throw new Error("Expected media row");
	await storage.put(row.key, PNG, "image/png");
	const commit = await app.handle(
		new Request(`http://test/api/media/${mediaId}/commit`, {
			method: "POST",
			headers: { cookie },
		}),
	);
	expect(commit.status).toBe(200);
	return mediaId as string;
}

describe("GET /api/me/contributions & XP awards", () => {
	beforeEach(resetDb);

	test("returns 401 when unauthenticated", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/me/contributions"),
		);
		expect(res.status).toBe(401);
	});

	test("fresh user starts with 0 XP, level 1, zeroed counts, empty timeline, and xpTotal on /auth/me", async () => {
		const app = freshApp();
		const { cookie, user } = await registerAndCookie(app);
		expect(user.xpTotal).toBe(0);

		const meRes = await app.handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(meRes.status).toBe(200);
		const meBody = await json(meRes);
		expect(meBody.data.xpTotal).toBe(0);

		const contribRes = await app.handle(
			new Request("http://test/api/me/contributions", { headers: { cookie } }),
		);
		expect(contribRes.status).toBe(200);
		const body = await json(contribRes);
		expect(body.data).toEqual({
			xpTotal: 0,
			level: {
				level: 1,
				title: "Penjelajah Baru",
				xp: 0,
				currentLevelMinXp: 0,
				nextLevelXp: 100,
				nextLevelTitle: "Penjelajah Aktif",
				progressPercent: 0,
				xpToNext: 100,
			},
			counts: { places: 0, reviews: 0, photos: 0, edits: 0 },
			timeline: [],
		});
	});

	test("creating place (+15), review (+8), and photo (+5) awards XP and updates timeline newest-first", async () => {
		const storage = memoryStorage();
		const app = freshApp({ storage });
		const { cookie } = await registerAndCookie(app);

		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();

		const [publishedPlace] = await db
			.insert(schema.places)
			.values({
				slug: "warung-sate-published",
				name: "Warung Sate",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
			})
			.returning();

		// 1. Create place -> +15 XP
		const createPlaceRes = await app.handle(
			new Request("http://test/api/places", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					name: "Soto Batang Enak",
					categoryId: cat.id,
					latitude: -6.912,
					longitude: 109.731,
				}),
			}),
		);
		expect(createPlaceRes.status).toBe(201);
		const createdPlace = (await json(createPlaceRes)).data;

		// 2. Create review -> +8 XP
		const reviewRes = await app.handle(
			new Request(`http://test/api/places/${publishedPlace.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 5, body: "Sambalnya enak dan gurih." }),
			}),
		);
		expect(reviewRes.status).toBe(201);

		// 3. Add photo -> +5 XP
		const mediaId = await uploadAndCommitPhoto(app, storage, cookie);
		const photoRes = await app.handle(
			new Request(`http://test/api/places/${publishedPlace.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [mediaId] }),
			}),
		);
		expect(photoRes.status).toBe(201);

		// Check /auth/me xpTotal = 15 + 8 + 5 = 28
		const meRes = await app.handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(meRes.status).toBe(200);
		expect((await json(meRes)).data.xpTotal).toBe(28);

		// Check /me/contributions
		const contribRes = await app.handle(
			new Request("http://test/api/me/contributions", { headers: { cookie } }),
		);
		expect(contribRes.status).toBe(200);
		const { data } = await json(contribRes);

		expect(data.xpTotal).toBe(28);
		expect(data.level).toEqual({
			level: 1,
			title: "Penjelajah Baru",
			xp: 28,
			currentLevelMinXp: 0,
			nextLevelXp: 100,
			nextLevelTitle: "Penjelajah Aktif",
			progressPercent: 28,
			xpToNext: 72,
		});
		expect(data.counts).toEqual({
			places: 1,
			reviews: 1,
			photos: 1,
			edits: 0,
		});
		expect(data.timeline).toHaveLength(3);
		expect(data.timeline.map((e: { action: string }) => e.action)).toEqual([
			"add_photo",
			"write_review",
			"add_place",
		]);
		expect(data.timeline[0]).toMatchObject({
			action: "add_photo",
			xpDelta: 5,
			summary: "Menambahkan 1 foto",
			placeId: publishedPlace.id,
			placeSlug: publishedPlace.slug,
			placeName: publishedPlace.name,
		});
		expect(data.timeline[1]).toMatchObject({
			action: "write_review",
			xpDelta: 8,
			summary: "Mengulas Warung Sate",
			placeId: publishedPlace.id,
			placeSlug: publishedPlace.slug,
			placeName: publishedPlace.name,
		});
		expect(data.timeline[2]).toMatchObject({
			action: "add_place",
			xpDelta: 15,
			summary: "Menambahkan tempat Soto Batang Enak",
			placeId: createdPlace.id,
			placeSlug: createdPlace.slug,
			placeName: createdPlace.name,
		});
	});

	test("getContributorLevel maps boundaries through level 15", () => {
		expect(getContributorLevel(-5)).toMatchObject({
			level: 1,
			title: "Penjelajah Baru",
			xp: 0,
			currentLevelMinXp: 0,
			nextLevelXp: 100,
			xpToNext: 100,
		});
		expect(getContributorLevel(100)).toMatchObject({
			level: 2,
			title: "Penjelajah Aktif",
			xp: 100,
			currentLevelMinXp: 100,
			nextLevelXp: 220,
			progressPercent: 0,
			xpToNext: 120,
		});
		expect(getContributorLevel(5500)).toEqual({
			level: 15,
			title: "Duta Kuliner Batang",
			xp: 5500,
			currentLevelMinXp: 5200,
			nextLevelXp: null,
			nextLevelTitle: null,
			progressPercent: 100,
			xpToNext: 0,
		});
	});
});
