import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
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

	test("persists district, priceRange (with parsed priceMin/priceMax), and string openingHours on POST and PATCH", async () => {
		const { app, cookie, cat } = await setupUserAndCat();
		const res = await app.handle(
			new Request("http://test/api/places", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					name: "Warung Harga",
					categoryId: cat.id,
					latitude: -6.91,
					longitude: 109.73,
					district: "Batang",
					priceRange: "Rp 10.000 - 25.000",
					openingHours: "08:00 - 21:00 setiap hari",
				}),
			}),
		);
		expect(res.status).toBe(201);
		const created = (await json(res)).data;
		expect(created.district).toBe("Batang");
		expect(created.priceRange).toBe("Rp 10.000 - 25.000");
		expect(created.openingHours).toBe("08:00 - 21:00 setiap hari");

		const row = await db.query.places.findFirst({
			where: { id: created.id },
		});
		expect(row?.priceMin).toBe(10000);
		expect(row?.priceMax).toBe(25000);

		// Promote user to admin and PATCH district & priceRange
		await db
			.update(schema.users)
			.set({ role: "admin" })
			.where(eq(schema.users.email, "p@b.test"));

		const patchRes = await app.handle(
			new Request(`http://test/api/places/${created.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					district: "Subah",
					priceRange: "30rb - 60rb",
				}),
			}),
		);
		expect(patchRes.status).toBe(200);
		const patched = (await json(patchRes)).data;
		expect(patched.district).toBe("Subah");
		expect(patched.priceRange).toBe("30rb - 60rb");

		const updatedRow = await db.query.places.findFirst({
			where: { id: created.id },
		});
		expect(updatedRow?.priceMin).toBe(30000);
		expect(updatedRow?.priceMax).toBe(60000);
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

describe("place photos", () => {
	beforeEach(resetDb);

	test("POST adds photos and DELETE promotes next cover photo", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "warung-foto",
				name: "Warung Foto",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
			})
			.returning();

		const commitPhoto = async () => {
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
			const { id } = (await json(up)).data;
			const row = await db.query.media.findFirst({ where: { id } });
			await storage.put(row!.key, PNG, "image/png");
			await app.handle(
				new Request(`http://test/api/media/${id}/commit`, {
					method: "POST",
					headers: { cookie },
				}),
			);
			return id as string;
		};

		const m1 = await commitPhoto();
		const m2 = await commitPhoto();
		const add = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [m1, m2] }),
			}),
		);
		expect(add.status).toBe(201);
		const added = (await json(add)).data;
		expect(added.length).toBe(2);

		const del = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos/${added[0].id}`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del.status).toBe(204);

		const updated = await db.query.places.findFirst({
			where: { id: place.id },
		});
		expect(updated!.coverMediaId).toBe(m2);
	});

	test("DELETE resets coverMediaId to null when last photo is deleted", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "warung-satu-foto",
				name: "Warung Satu Foto",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
			})
			.returning();

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

		const add = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [mediaId] }),
			}),
		);
		const added = (await json(add)).data;

		const del = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos/${added[0].id}`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del.status).toBe(204);

		const updated = await db.query.places.findFirst({
			where: { id: place.id },
		});
		expect(updated!.coverMediaId).toBeNull();
	});

	test("DELETE returns 403 for unrelated user and 204 for approved owner or admin", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "warung-auth",
				name: "Warung Auth",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
			})
			.returning();

		const commitPhoto = async () => {
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
			const { id } = (await json(up)).data;
			const row = await db.query.media.findFirst({ where: { id } });
			await storage.put(row!.key, PNG, "image/png");
			await app.handle(
				new Request(`http://test/api/media/${id}/commit`, {
					method: "POST",
					headers: { cookie },
				}),
			);
			return id as string;
		};

		const m1 = await commitPhoto();
		const m2 = await commitPhoto();
		const add = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [m1, m2] }),
			}),
		);
		const added = (await json(add)).data;

		const regOther = await app.handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Other",
					email: "other@b.test",
					password: "min8chars",
				}),
			}),
		);
		const otherCookie = cookieOf(regOther)!;
		const otherUser = (await db.query.users.findFirst({
			where: { email: "other@b.test" },
		}))!;

		const del403 = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos/${added[0].id}`, {
				method: "DELETE",
				headers: { cookie: otherCookie },
			}),
		);
		expect(del403.status).toBe(403);

		await db.insert(schema.businessClaims).values({
			placeId: place.id,
			claimantId: otherUser.id,
			evidence: {
				note: "SIUP",
				documentMediaIds: [],
				contactPhone: "08123456789",
			},
			status: "approved",
		});
		const delOwner = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos/${added[0].id}`, {
				method: "DELETE",
				headers: { cookie: otherCookie },
			}),
		);
		expect(delOwner.status).toBe(204);

		const regAdmin = await app.handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Admin",
					email: "admin@b.test",
					password: "min8chars",
				}),
			}),
		);
		const adminCookie = cookieOf(regAdmin)!;
		const adminUser = (await db.query.users.findFirst({
			where: { email: "admin@b.test" },
		}))!;
		await db
			.update(schema.users)
			.set({ role: "admin" })
			.where(eq(schema.users.id, adminUser.id));

		const delAdmin = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos/${added[1].id}`, {
				method: "DELETE",
				headers: { cookie: adminCookie },
			}),
		);
		expect(delAdmin.status).toBe(204);
	});

	test("POST on pending place returns 404 for outsiders", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);
		const [place] = await db
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

		const res = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [crypto.randomUUID()] }),
			}),
		);
		expect(res.status).toBe(404);
	});

	test("POST rejects duplicate or empty photoMediaIds with 422 and unowned media with 403", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "warung-val",
				name: "Warung Val",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
			})
			.returning();

		const emptyRes = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [] }),
			}),
		);
		expect(emptyRes.status).toBe(422);

		const dupId = crypto.randomUUID();
		const dupRes = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [dupId, dupId] }),
			}),
		);
		expect(dupRes.status).toBe(422);

		const unownedRes = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [crypto.randomUUID()] }),
			}),
		);
		expect(unownedRes.status).toBe(403);
	});
});
