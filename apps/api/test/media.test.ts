import { beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "../src/database";
import type { Storage } from "../src/lib/ports";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

async function login(): Promise<string> {
	const res = await freshApp().handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Arya",
				email: "m@b.test",
				password: "min8chars",
			}),
		}),
	);
	return cookieOf(res)!;
}

function presign(cookie: string, body: unknown) {
	return freshApp({ storage: memoryStorage() }).handle(
		new Request("http://test/api/media/uploads", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify(body),
		}),
	);
}

describe("POST /media/uploads", () => {
	beforeEach(resetDb);

	test("returns a presigned URL and a pending row", async () => {
		const cookie = await login();
		const res = await presign(cookie, {
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: 12,
		});
		expect(res.status).toBe(201);
		const body = await json(res);
		expect(body.data.uploadUrl).toContain("memory://");
		expect(body.data.method).toBe("PUT");
		expect(body.data.headers["Content-Type"]).toBe("image/png");
		expect(body.data.expiresIn).toBe(600);
	});

	test("rejects a disallowed mime with 415", async () => {
		const cookie = await login();
		const res = await presign(cookie, {
			purpose: "place_photo",
			mime: "text/html",
			sizeBytes: 12,
		});
		expect(res.status).toBe(415);
		expect((await json(res)).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
	});

	test("rejects an oversize image with 413", async () => {
		const cookie = await login();
		const res = await presign(cookie, {
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: 6 * 1024 * 1024,
		});
		expect(res.status).toBe(413);
	});

	test("routes pending claim documents into the private prefix", async () => {
		const cookie = await login();
		const claim = await presign(cookie, {
			purpose: "claim_document",
			mime: "application/pdf",
			sizeBytes: 100,
		});
		const claimId = (await json(claim)).data.id;
		const claimRow = await db.query.media.findFirst({
			where: { id: claimId },
		});
		// Private bucket from the first byte: the presigned PUT URL is logged.
		expect(claimRow!.key).toStartWith("claims/tmp/");

		const photo = await presign(cookie, {
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: 12,
		});
		const photoId = (await json(photo)).data.id;
		const photoRow = await db.query.media.findFirst({
			where: { id: photoId },
		});
		expect(photoRow!.key).toStartWith("tmp/");
	});

	test("requires a session", async () => {
		const res = await presign("", {
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: 12,
		});
		expect(res.status).toBe(401);
	});
});

describe("POST /media/:id/commit", () => {
	beforeEach(resetDb);

	async function uploaded(storage = memoryStorage()) {
		const cookie = await login();
		const app = freshApp({ storage });
		const created = await app.handle(
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
		const { id } = (await json(created)).data;
		return { app, cookie, id, storage };
	}

	test("commits real PNG bytes and rewrites the content type", async () => {
		const storage = memoryStorage();
		const { app, cookie, id } = await uploaded(storage);
		// the browser "uploads" then the API commits
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(row!.key, PNG, "application/octet-stream");

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.mime).toBe("image/png");
		expect(body.data.sizeBytes).toBe(12);
		expect(body.data.url).toContain("memory://");
		expect(await storage.stat(row!.key)).toBeNull(); // tmp key cleaned
	});

	test("rejects HTML masquerading as an image with 415 and deletes it", async () => {
		const storage = memoryStorage();
		const { app, cookie, id } = await uploaded(storage);
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(
			row!.key,
			new TextEncoder().encode("<html><script>alert(1)</script>"),
			"image/png",
		);

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(415);
		expect(await storage.stat(row!.key)).toBeNull();
		const after = await db.query.media.findFirst({ where: { id } });
		expect(after!.status).toBe("pending");
	});

	test("rejects an object bigger than the limit with 413 without reading it", async () => {
		const base = memoryStorage();
		let reads = 0;
		const storage: typeof base = {
			...base,
			get: (key) => {
				reads += 1;
				return base.get(key);
			},
		};
		const { app, cookie, id } = await uploaded(storage);
		const row = await db.query.media.findFirst({ where: { id } });
		const big = new Uint8Array(5 * 1024 * 1024 + 1);
		big.set(PNG);
		await base.put(row!.key, big, "image/png");

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(413);
		// `stat` carries the size: a multi-GB object must never be buffered first.
		expect(reads).toBe(0);
		expect(await base.stat(row!.key)).toBeNull();
		const after = await db.query.media.findFirst({ where: { id } });
		expect(after!.status).toBe("pending");
	});

	test("rejects a 5-byte PDF stub with 415", async () => {
		const storage = memoryStorage();
		const cookie = await login();
		const app = freshApp({ storage });
		const created = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					purpose: "claim_document",
					mime: "application/pdf",
					sizeBytes: 100,
				}),
			}),
		);
		const { id } = (await json(created)).data;
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(
			row!.key,
			new TextEncoder().encode("%PDF-"),
			"application/pdf",
		);

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(415);
		expect(await storage.stat(row!.key)).toBeNull();
		const after = await db.query.media.findFirst({ where: { id } });
		expect(after!.status).toBe("pending");
	});

	test("commits a claim PDF into the private prefix with no public URL", async () => {
		const storage = memoryStorage();
		const cookie = await login();
		const app = freshApp({ storage });
		const created = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					purpose: "claim_document",
					mime: "application/pdf",
					sizeBytes: 100,
				}),
			}),
		);
		const { id } = (await json(created)).data;
		const row = await db.query.media.findFirst({ where: { id } });
		expect(row!.isPrivate).toBe(true);
		await storage.put(
			row!.key,
			new TextEncoder().encode("%PDF-1.7 small"),
			"application/octet-stream",
		);

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.mime).toBe("application/pdf");
		expect(body.data.url).toContain("memory://");
		const after = await db.query.media.findFirst({ where: { id } });
		expect(after!.key).toStartWith(`claims/${row!.ownerId}/`);
		expect(storage.publicUrl(after!.key)).toBeNull();
	});

	test("rejects a PDF uploaded for a place photo with 415", async () => {
		const storage = memoryStorage();
		const { app, cookie, id } = await uploaded(storage);
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(
			row!.key,
			new TextEncoder().encode("%PDF-1.7 small"),
			"application/pdf",
		);

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(415);
		expect(await storage.stat(row!.key)).toBeNull();
	});

	test("rejects a 3-byte upload with 415", async () => {
		const storage = memoryStorage();
		const { app, cookie, id } = await uploaded(storage);
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(row!.key, new Uint8Array([1, 2, 3]), "image/png");

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(415);
	});

	test("404 when the browser never uploaded to the tmp key", async () => {
		const { app, cookie, id } = await uploaded();
		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(404);
	});

	test("409 on a second commit", async () => {
		const storage = memoryStorage();
		const { app, cookie, id } = await uploaded(storage);
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(row!.key, PNG, "image/png");
		const commit = () =>
			app.handle(
				new Request(`http://test/api/media/${id}/commit`, {
					method: "POST",
					headers: { cookie },
				}),
			);
		expect((await commit()).status).toBe(200);
		expect((await commit()).status).toBe(409);
	});

	test("403 when committing someone else's upload", async () => {
		const { app, id } = await uploaded();
		const other = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Bee",
					email: "b@b.test",
					password: "min8chars",
				}),
			}),
		);
		const otherCookie = cookieOf(other)!;
		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie: otherCookie },
			}),
		);
		expect(res.status).toBe(403);
	});
});

describe("GET /media/:id/url", () => {
	beforeEach(resetDb);

	async function placeUpload(cookie: string, storage: Storage) {
		const app = freshApp({ storage });
		const created = await app.handle(
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
		const { id } = (await json(created)).data;
		const row = await db.query.media.findFirst({ where: { id } });
		return { app, id, key: row!.key };
	}

	test("pending media gets a presigned URL, ready media the public one", async () => {
		const storage = memoryStorage();
		const cookie = await login();
		const { app, id, key } = await placeUpload(cookie, storage);

		const pending = await app.handle(
			new Request(`http://test/api/media/${id}/url`, { headers: { cookie } }),
		);
		// A never-sniffed object may hold browser-chosen `text/html`; no permanent URL.
		expect((await json(pending)).data.url).toContain("presigned=1");

		await storage.put(key, PNG, "image/png");
		const commit = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(commit.status).toBe(200);

		const ready = await app.handle(
			new Request(`http://test/api/media/${id}/url`, { headers: { cookie } }),
		);
		const url = (await json(ready)).data.url;
		expect(url).not.toContain("presigned=1");
		expect(url).toStartWith("memory://places/");
	});

	test("admin can read another user's media, a plain user cannot", async () => {
		const storage = memoryStorage();
		const ownerCookie = await login();
		const { app, id } = await placeUpload(ownerCookie, storage);

		const stranger = await freshApp().handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Bee",
					email: "admin@b.test",
					password: "min8chars",
				}),
			}),
		);
		const strangerCookie = cookieOf(stranger)!;
		const denied = await app.handle(
			new Request(`http://test/api/media/${id}/url`, {
				headers: { cookie: strangerCookie },
			}),
		);
		expect(denied.status).toBe(404);

		await db.execute(
			sql`UPDATE "users" SET "role" = 'admin' WHERE "email" = 'admin@b.test'`,
		);
		const allowed = await app.handle(
			new Request(`http://test/api/media/${id}/url`, {
				headers: { cookie: strangerCookie },
			}),
		);
		expect(allowed.status).toBe(200);
		expect((await json(allowed)).data.url).toStartWith("memory://");
	});

	test("404 for a stranger, presigned URL for the owner", async () => {
		const cookie = await login();
		const storage = memoryStorage();
		const app = freshApp({ storage });
		const created = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					purpose: "claim_document",
					mime: "application/pdf",
					sizeBytes: 100,
				}),
			}),
		);
		const { id } = (await json(created)).data;
		// Claim evidence is private: a `claims/` key never gets a public URL.
		expect(storage.publicUrl("claims/u/x.pdf")).toBeNull();
		expect(storage.publicUrl("places/u/x.png")).toBe("memory://places/u/x.png");

		const owner = await app.handle(
			new Request(`http://test/api/media/${id}/url`, { headers: { cookie } }),
		);
		expect(owner.status).toBe(200);
		const url = (await json(owner)).data.url;
		// Still pending, so the key is `tmp/...` in the public bucket. Privacy must
		// come from the row: a bare public URL here would be permanent and anonymous.
		expect(url).toContain("sig=test&presigned=1");

		const stranger = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Bee",
					email: "s@b.test",
					password: "min8chars",
				}),
			}),
		);
		const strangerCookie = cookieOf(stranger)!;
		const denied = await app.handle(
			new Request(`http://test/api/media/${id}/url`, {
				headers: { cookie: strangerCookie },
			}),
		);
		expect(denied.status).toBe(404);
	});
});

describe("DELETE /media/:id", () => {
	beforeEach(resetDb);

	test("owner deletes the row and object, stranger gets 404", async () => {
		const storage = memoryStorage();
		const cookie = await login();
		const app = freshApp({ storage });
		const created = await app.handle(
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
		const { id } = (await json(created)).data;
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(row!.key, PNG, "image/png");

		const stranger = await freshApp().handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Bee",
					email: "d@b.test",
					password: "min8chars",
				}),
			}),
		);
		const denied = await app.handle(
			new Request(`http://test/api/media/${id}`, {
				method: "DELETE",
				headers: { cookie: cookieOf(stranger)! },
			}),
		);
		expect(denied.status).toBe(404);

		const res = await app.handle(
			new Request(`http://test/api/media/${id}`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(204);
		expect(await storage.stat(row!.key)).toBeNull();
		expect(await db.query.media.findFirst({ where: { id } })).toBeUndefined();
	});
});
