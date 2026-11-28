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
			description: "Authentic Soto Batang",
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

	test("GET /places rejects fractional page, searches description, and defaults radiusKm to 5", async () => {
		await seedPlaces();
		const app = freshApp({ storage: memoryStorage() });

		const floatPage = await app.handle(
			new Request("http://test/api/places?page=1.5"),
		);
		expect(floatPage.status).toBe(422);

		const byDesc = await app.handle(
			new Request("http://test/api/places?q=Soto%20Batang"),
		);
		expect(byDesc.status).toBe(200);
		expect(
			(await json(byDesc)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["warung-bu-tini"]);

		const defaultRadius = await app.handle(
			new Request("http://test/api/places?lat=-6.912&lng=109.73"),
		);
		expect(defaultRadius.status).toBe(200);
		expect(
			(await json(defaultRadius)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["warung-bu-tini"]);
	});

	test("GET /places supports district, minRating, priceTier, onlyHiddenGem, verified=unverified, q on address/district, and sort=reviews|views|az|za", async () => {
		const { cat } = await seedPlaces();
		const [cheap] = await db
			.insert(schema.places)
			.values({
				slug: "es-tebu-murah",
				name: "Es Tebu Murah",
				categoryId: cat.id,
				address: "Jl. Pemuda No. 5",
				district: "Subah",
				priceRange: "Rp 5.000 - 15.000",
				priceMin: 5000,
				priceMax: 15000,
				viewsTotal: 420,
				latitude: -6.95,
				longitude: 109.85,
				status: "published",
				communityVerified: false,
				ownerVerified: false,
				ratingAvg: 4.3,
				reviewCount: 5,
				exploreScore: 0.5,
				hiddenGemScore: 1.2,
			})
			.returning();
		await db.insert(schema.places).values({
			slug: "kafe-mahal",
			name: "Kafe Mahal",
			categoryId: cat.id,
			address: "Jl. Jenderal Sudirman",
			district: "Batang",
			priceRange: "Rp 120.000 - 200.000",
			priceMin: 120000,
			priceMax: 200000,
			viewsTotal: 99,
			latitude: -6.91,
			longitude: 109.73,
			status: "published",
			communityVerified: true,
			ownerVerified: false,
			ratingAvg: 3.9,
			reviewCount: 12,
			exploreScore: 0.6,
			hiddenGemScore: 0,
		});

		const app = freshApp({ storage: memoryStorage() });

		const byDistrict = await app.handle(
			new Request("http://test/api/places?district=Subah"),
		);
		expect(byDistrict.status).toBe(200);
		expect(
			(await json(byDistrict)).data.map((p: { slug: string }) => p.slug),
		).toEqual([cheap.slug]);

		const byQueryDistrict = await app.handle(
			new Request("http://test/api/places?q=Sudirman"),
		);
		expect(byQueryDistrict.status).toBe(200);
		expect(
			(await json(byQueryDistrict)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["kafe-mahal"]);

		const byMinRating = await app.handle(
			new Request("http://test/api/places?minRating=4.0"),
		);
		expect(byMinRating.status).toBe(200);
		expect(
			(await json(byMinRating)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["warung-bu-tini", "es-tebu-murah"]);

		const byPriceTier = await app.handle(
			new Request("http://test/api/places?priceTier=under_25k"),
		);
		expect(byPriceTier.status).toBe(200);
		expect(
			(await json(byPriceTier)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["es-tebu-murah"]);

		const byOver100k = await app.handle(
			new Request("http://test/api/places?priceTier=over_100k"),
		);
		expect(byOver100k.status).toBe(200);
		expect(
			(await json(byOver100k)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["kafe-mahal"]);

		const byHiddenGem = await app.handle(
			new Request("http://test/api/places?onlyHiddenGem=true"),
		);
		expect(byHiddenGem.status).toBe(200);
		expect(
			(await json(byHiddenGem)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["warung-bu-tini", "es-tebu-murah"]);

		const byUnverified = await app.handle(
			new Request("http://test/api/places?verified=unverified"),
		);
		expect(byUnverified.status).toBe(200);
		expect(
			(await json(byUnverified)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["warung-biasa", "es-tebu-murah"]);

		const sortReviews = await app.handle(
			new Request("http://test/api/places?sort=reviews"),
		);
		expect(sortReviews.status).toBe(200);
		expect(
			(await json(sortReviews)).data.map((p: { slug: string }) => p.slug),
		).toEqual([
			"warung-biasa",
			"kafe-mahal",
			"es-tebu-murah",
			"warung-bu-tini",
		]);

		const sortViews = await app.handle(
			new Request("http://test/api/places?sort=views"),
		);
		expect(sortViews.status).toBe(200);
		const viewsData = (await json(sortViews)).data;
		expect(viewsData[0].slug).toBe("es-tebu-murah");
		expect(viewsData[0].views).toBe(420);
		expect(viewsData[0].district).toBe("Subah");
		expect(viewsData[0].priceRange).toBe("Rp 5.000 - 15.000");
		expect(viewsData[0].bookmarked).toBe(false);

		const sortAz = await app.handle(
			new Request("http://test/api/places?sort=az"),
		);
		expect(sortAz.status).toBe(200);
		expect(
			(await json(sortAz)).data.map((p: { slug: string }) => p.slug),
		).toEqual([
			"es-tebu-murah",
			"kafe-mahal",
			"warung-biasa",
			"warung-bu-tini",
		]);

		const sortZa = await app.handle(
			new Request("http://test/api/places?sort=za"),
		);
		expect(sortZa.status).toBe(200);
		expect(
			(await json(sortZa)).data.map((p: { slug: string }) => p.slug),
		).toEqual([
			"warung-bu-tini",
			"warung-biasa",
			"kafe-mahal",
			"es-tebu-murah",
		]);
	});

	test("GET /places?onlyBookmarked=true returns empty for visitor and bookmarked places for authed user", async () => {
		const { pubHigh } = await seedPlaces();
		const app = freshApp({ storage: memoryStorage() });

		const anon = await app.handle(
			new Request("http://test/api/places?onlyBookmarked=true"),
		);
		expect(anon.status).toBe(200);
		const anonBody = await json(anon);
		expect(anonBody.data).toEqual([]);
		expect(anonBody.meta.total).toBe(0);

		const reg = await app.handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Bookmarker",
					email: "bm@b.test",
					password: "min8chars",
				}),
			}),
		);
		const cookie = cookieOf(reg) ?? "";
		const [user] = await db.select().from(schema.users);
		await db.insert(schema.bookmarks).values({
			userId: user.id,
			placeId: pubHigh.id,
		});

		const authed = await app.handle(
			new Request("http://test/api/places?onlyBookmarked=true", {
				headers: { cookie },
			}),
		);
		expect(authed.status).toBe(200);
		const authedBody = await json(authed);
		expect(authedBody.data.map((p: { slug: string }) => p.slug)).toEqual([
			pubHigh.slug,
		]);
		expect(authedBody.data[0].bookmarked).toBe(true);
	});

	test("GET /places/hidden-gems filters by district and verified", async () => {
		const { cat } = await seedPlaces();
		await db.insert(schema.places).values({
			slug: "gem-subah",
			name: "Gem Subah",
			categoryId: cat.id,
			district: "Subah",
			latitude: -6.95,
			longitude: 109.85,
			status: "published",
			communityVerified: false,
			ownerVerified: false,
			ratingAvg: 4.5,
			reviewCount: 3,
			hiddenGemScore: 1.9,
		});

		const app = freshApp({ storage: memoryStorage() });
		const res = await app.handle(
			new Request(
				"http://test/api/places/hidden-gems?district=Subah&verified=unverified",
			),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.map((p: { slug: string }) => p.slug)).toEqual(
			["gem-subah"],
		);
	});

	test("GET /places/:slug returns district, priceRange, views, bookmarked, createdByName, ownerId", async () => {
		const { cat } = await seedPlaces();
		const app = freshApp({ storage: memoryStorage() });

		const reg = await app.handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Creator User",
					email: "creator@b.test",
					password: "min8chars",
				}),
			}),
		);
		const cookie = cookieOf(reg) ?? "";
		const [user] = await db.select().from(schema.users);

		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "detail-place",
				name: "Detail Place",
				categoryId: cat.id,
				district: "Limpung",
				priceRange: "Rp 15.000 - 30.000",
				viewsTotal: 17,
				latitude: -6.98,
				longitude: 109.92,
				status: "published",
				createdById: user.id,
			})
			.returning();

		await db.insert(schema.businessClaims).values({
			placeId: place.id,
			claimantId: user.id,
			status: "approved",
			evidence: { note: "NIB", documentMediaIds: [], contactPhone: "+62812" },
		});
		await db.insert(schema.bookmarks).values({
			userId: user.id,
			placeId: place.id,
		});

		const authed = await app.handle(
			new Request(`http://test/api/places/${place.slug}`, {
				headers: { cookie },
			}),
		);
		expect(authed.status).toBe(200);
		const body = (await json(authed)).data;
		expect(body.district).toBe("Limpung");
		expect(body.priceRange).toBe("Rp 15.000 - 30.000");
		expect(body.views).toBe(17);
		expect(body.bookmarked).toBe(true);
		expect(body.createdByName).toBe("Creator User");
		expect(body.ownerId).toBe(user.id);

		const anon = await app.handle(
			new Request(`http://test/api/places/${place.slug}`),
		);
		expect(anon.status).toBe(200);
		expect((await json(anon)).data.bookmarked).toBe(false);
	});

	test("GET /places filters priceTier=25k_50k and 50k_100k and excludes null priceRange", async () => {
		const { cat } = await seedPlaces();
		await db.insert(schema.places).values([
			{
				slug: "bakso-sedang",
				name: "Bakso Sedang",
				categoryId: cat.id,
				priceRange: "Rp 30.000 - 45.000",
				priceMin: 30000,
				priceMax: 45000,
				latitude: -6.92,
				longitude: 109.74,
				status: "published",
			},
			{
				slug: "resto-menengah",
				name: "Resto Menengah",
				categoryId: cat.id,
				priceRange: "Rp 60.000 - 90.000",
				priceMin: 60000,
				priceMax: 90000,
				latitude: -6.93,
				longitude: 109.75,
				status: "published",
			},
		]);

		const app = freshApp({ storage: memoryStorage() });

		for (const [tier, expected] of [
			["25k_50k", ["bakso-sedang"]],
			["50k_100k", ["resto-menengah"]],
			["under_25k", []],
			["over_100k", []],
		] as const) {
			const res = await app.handle(
				new Request(`http://test/api/places?priceTier=${tier}`),
			);
			expect(res.status).toBe(200);
			const slugs = (await json(res)).data.map((p: { slug: string }) => p.slug);
			expect(slugs).toEqual([...expected]);
			expect(slugs).not.toContain("warung-bu-tini");
			expect(slugs).not.toContain("warung-biasa");
		}
	});
	test("GET /places returns description and openingHours, and supports verified=community_verified and owner_verified", async () => {
		const { cat } = await seedPlaces();
		const hours = { mon: { open: "08:00", close: "21:00" } };
		await db.insert(schema.places).values([
			{
				slug: "kopi-owner",
				name: "Kopi Owner",
				categoryId: cat.id,
				description: "Manual brew coffee",
				openingHours: hours,
				latitude: -6.92,
				longitude: 109.74,
				status: "published",
				ownerVerified: true,
			},
		]);

		const app = freshApp({ storage: memoryStorage() });
		const allRes = await app.handle(new Request("http://test/api/places"));
		expect(allRes.status).toBe(200);
		const allBody = await json(allRes);
		const kopi = allBody.data.find(
			(p: { slug: string }) => p.slug === "kopi-owner",
		);
		expect(kopi.description).toBe("Manual brew coffee");
		expect(kopi.openingHours).toEqual(hours);

		const communityRes = await app.handle(
			new Request("http://test/api/places?verified=community_verified"),
		);
		expect(communityRes.status).toBe(200);
		expect(
			(await json(communityRes)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["warung-bu-tini"]);

		const ownerRes = await app.handle(
			new Request("http://test/api/places?verified=owner_verified"),
		);
		expect(ownerRes.status).toBe(200);
		expect(
			(await json(ownerRes)).data.map((p: { slug: string }) => p.slug),
		).toEqual(["kopi-owner"]);
	});

	test("GET /places/hidden-gems?q=... filters by keyword", async () => {
		const { cat } = await seedPlaces();
		await db.insert(schema.places).values({
			slug: "bakmi-hidden",
			name: "Bakmi Tersembunyi",
			categoryId: cat.id,
			description: "Bakmi jawa malam hari",
			latitude: -6.92,
			longitude: 109.74,
			status: "published",
			ratingAvg: 4.9,
			reviewCount: 4,
			hiddenGemScore: 2.1,
		});

		const res = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places/hidden-gems?q=Bakmi"),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.map((p: { slug: string }) => p.slug)).toEqual(
			["bakmi-hidden"],
		);
	});

	test("GET /places/:slug returns ratingHistogram from published reviews only", async () => {
		const { pubHigh, pubLow } = await seedPlaces();
		const [u1, u2, u3, u4] = await db
			.insert(schema.users)
			.values([
				{ name: "R1", email: "r1@b.test" },
				{ name: "R2", email: "r2@b.test" },
				{ name: "R3", email: "r3@b.test" },
				{ name: "R4", email: "r4@b.test" },
			])
			.returning();

		await db.insert(schema.reviews).values([
			{
				placeId: pubHigh.id,
				userId: u1.id,
				rating: 5,
				body: "Enak banget sotonya!",
				status: "published",
			},
			{
				placeId: pubHigh.id,
				userId: u2.id,
				rating: 5,
				body: "Kuahnya mantap sekali!",
				status: "published",
			},
			{
				placeId: pubHigh.id,
				userId: u3.id,
				rating: 3,
				body: "Lumayan buat makan siang.",
				status: "published",
			},
			{
				placeId: pubHigh.id,
				userId: u4.id,
				rating: 1,
				body: "Hidden spam review here.",
				status: "hidden",
			},
		]);

		const app = freshApp({ storage: memoryStorage() });
		const highRes = await app.handle(
			new Request(`http://test/api/places/${pubHigh.slug}`),
		);
		expect(highRes.status).toBe(200);
		expect((await json(highRes)).data.ratingHistogram).toEqual({
			"1": 0,
			"2": 0,
			"3": 1,
			"4": 0,
			"5": 2,
		});

		const lowRes = await app.handle(
			new Request(`http://test/api/places/${pubLow.slug}`),
		);
		expect(lowRes.status).toBe(200);
		expect((await json(lowRes)).data.ratingHistogram).toEqual({
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
		});
	});

	test("GET /activity returns empty array then combined published places and reviews sorted desc", async () => {
		const app = freshApp({ storage: memoryStorage() });

		const emptyRes = await app.handle(new Request("http://test/api/activity"));
		expect(emptyRes.status).toBe(200);
		expect(await json(emptyRes)).toEqual({ data: [] });

		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [user] = await db
			.insert(schema.users)
			.values({ name: "Andi", email: "andi@b.test" })
			.returning();

		const t1 = new Date("2026-01-01T10:00:00Z");
		const t2 = new Date("2026-01-02T10:00:00Z");
		const t3 = new Date("2026-01-03T10:00:00Z");
		const t4 = new Date("2026-01-04T10:00:00Z");

		const [placeA] = await db
			.insert(schema.places)
			.values({
				slug: "place-a",
				name: "Place A",
				categoryId: cat.id,
				district: "Batang",
				description: "First place",
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
				createdById: user.id,
				createdAt: t1,
				updatedAt: t1,
			})
			.returning();

		const [placeB] = await db
			.insert(schema.places)
			.values({
				slug: "place-b",
				name: "Place B",
				categoryId: cat.id,
				district: "Limpung",
				description: "Second place",
				latitude: -6.92,
				longitude: 109.74,
				status: "published",
				createdAt: t2,
				updatedAt: t2,
			})
			.returning();

		const [pendingPlace] = await db
			.insert(schema.places)
			.values({
				slug: "place-pending",
				name: "Place Pending",
				categoryId: cat.id,
				latitude: -6.93,
				longitude: 109.75,
				status: "pending",
				createdAt: t4,
				updatedAt: t4,
			})
			.returning();

		const [reviewA] = await db
			.insert(schema.reviews)
			.values([
				{
					placeId: placeA.id,
					userId: user.id,
					rating: 5,
					body: "Sangat direkomendasikan!",
					status: "published",
					createdAt: t3,
					updatedAt: t3,
				},
				{
					placeId: pendingPlace.id,
					userId: user.id,
					rating: 4,
					body: "Review on pending place should not show.",
					status: "published",
					createdAt: t4,
					updatedAt: t4,
				},
			])
			.returning();

		await db.insert(schema.reviews).values({
			placeId: placeB.id,
			userId: user.id,
			rating: 2,
			body: "Hidden review should not show.",
			status: "hidden",
			createdAt: t4,
			updatedAt: t4,
		});

		const res = await app.handle(new Request("http://test/api/activity"));
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data).toEqual([
			{
				id: reviewA.id,
				kind: "review",
				placeId: placeA.id,
				placeSlug: "place-a",
				placeName: "Place A",
				district: "Batang",
				coverUrl: null,
				description: "First place",
				authorName: "Andi",
				rating: 5,
				comment: "Sangat direkomendasikan!",
				createdAt: t3.toISOString(),
			},
			{
				id: placeB.id,
				kind: "place",
				placeId: placeB.id,
				placeSlug: "place-b",
				placeName: "Place B",
				district: "Limpung",
				coverUrl: null,
				description: "Second place",
				authorName: null,
				rating: null,
				comment: null,
				createdAt: t2.toISOString(),
			},
			{
				id: placeA.id,
				kind: "place",
				placeId: placeA.id,
				placeSlug: "place-a",
				placeName: "Place A",
				district: "Batang",
				coverUrl: null,
				description: "First place",
				authorName: "Andi",
				rating: null,
				comment: null,
				createdAt: t1.toISOString(),
			},
		]);

		const limited = await app.handle(
			new Request("http://test/api/activity?limit=2"),
		);
		expect(limited.status).toBe(200);
		expect((await json(limited)).data).toHaveLength(2);

		const tooMany = await app.handle(
			new Request("http://test/api/activity?limit=21"),
		);
		expect(tooMany.status).toBe(422);
	});
});
