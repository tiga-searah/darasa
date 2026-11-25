import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { errorPlugin } from "../src/plugins/errors";
import { requireAdmin, requireAuth } from "../src/plugins/guard";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function registerAndLogin() {
	const app = freshApp();
	const res = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Arya",
				email: "g@b.test",
				password: "min8chars",
			}),
		}),
	);
	return cookieOf(res)!;
}

/** `/auth/me` resolves the session inline, so this pins the session contract, not the guard plugin. */
describe("GET /auth/me session resolution", () => {
	beforeEach(resetDb);

	test("401 without a cookie", async () => {
		const res = await freshApp().handle(new Request("http://test/api/auth/me"));
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
	});

	test("exposes sessionUser with a live cookie", async () => {
		const cookie = await registerAndLogin();
		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.email).toBe("g@b.test");
	});

	test("401 for a forged token", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", {
				headers: { cookie: "darasa_session=forged" },
			}),
		);
		expect(res.status).toBe(401);
	});

	test("401 when the session's user row was deleted", async () => {
		const cookie = await registerAndLogin();
		await resetDb(); // truncates users + sessions, cookie still present client-side
		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
	});
});

/** No admin-protected route ships yet, so the guard is mounted locally. */
const adminOnlyApp = () =>
	new Elysia({ prefix: "/api" })
		.use(errorPlugin)
		.group("/admin-only", (g) =>
			g
				.use(requireAdmin)
				.get("/me", ({ sessionUser }) => ({ data: sessionUser })),
		);

describe("requireAdmin", () => {
	beforeEach(resetDb);

	test("401 without a cookie", async () => {
		const res = await adminOnlyApp().handle(
			new Request("http://test/api/admin-only/me"),
		);
		expect(res.status).toBe(401);
	});

	test("403 for a signed-in non-admin", async () => {
		const cookie = await registerAndLogin();
		const res = await adminOnlyApp().handle(
			new Request("http://test/api/admin-only/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(403);
		expect((await json(res)).error.code).toBe("FORBIDDEN");
	});

	test("200 for an admin", async () => {
		const cookie = await registerAndLogin();
		await db.update(schema.users).set({ role: "admin" });
		const res = await adminOnlyApp().handle(
			new Request("http://test/api/admin-only/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.role).toBe("admin");
	});
});

/**
 * Pins the plugin-instance invariant: remounting a mutated instance drops the
 * hooks added after its first mount, so `requireAdmin` would lose its role hook
 * and answer 401 where it must answer 403.
 */
describe("guard instances are independent", () => {
	beforeEach(resetDb);

	const appWithBothGuards = () =>
		new Elysia({ prefix: "/api" })
			.use(errorPlugin)
			.group("/auth-only", (g) =>
				g
					.use(requireAuth)
					.get("/me", ({ sessionUser }) => ({ data: sessionUser })),
			)
			.group("/admin-only", (g) =>
				g
					.use(requireAdmin)
					.get("/me", ({ sessionUser }) => ({ data: sessionUser })),
			);

	test("requireAuth group keeps its 401 hook", async () => {
		const res = await appWithBothGuards().handle(
			new Request("http://test/api/auth-only/me"),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
	});

	test("requireAuth group still passes a live user session", async () => {
		const cookie = await registerAndLogin();
		const res = await appWithBothGuards().handle(
			new Request("http://test/api/auth-only/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.email).toBe("g@b.test");
	});

	test("requireAdmin group keeps its role hook (403, not 401)", async () => {
		const cookie = await registerAndLogin();
		const res = await appWithBothGuards().handle(
			new Request("http://test/api/admin-only/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(403);
		expect((await json(res)).error.code).toBe("FORBIDDEN");
	});

	test("requireAdmin group keeps its 401 hook", async () => {
		const res = await appWithBothGuards().handle(
			new Request("http://test/api/admin-only/me"),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
	});
});

const DAY = 24 * 60 * 60 * 1000;

async function sessionRowFor(cookie: string) {
	const token = cookie.split("=")[1];
	const hash = new Bun.CryptoHasher("sha256").update(token).digest("hex");
	return db.query.sessions.findFirst({ where: { tokenHash: hash } });
}

describe("sliding session expiry", () => {
	beforeEach(resetDb);

	test("a fresh session is not rewritten", async () => {
		const cookie = await registerAndLogin();
		const before = await sessionRowFor(cookie);
		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(res.headers.get("set-cookie")).toBeNull();
		const after = await sessionRowFor(cookie);
		expect(after!.expiresAt.getTime()).toBe(before!.expiresAt.getTime());
	});

	test("a session with 29 days left is pushed back to 30", async () => {
		const cookie = await registerAndLogin();
		const row = await sessionRowFor(cookie);
		const almost = new Date(Date.now() + 29 * DAY);
		await db
			.update(schema.sessions)
			.set({ expiresAt: almost })
			.where(eq(schema.sessions.id, row!.id));

		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(res.headers.get("set-cookie")).toContain("darasa_session=");

		const after = await sessionRowFor(cookie);
		expect(after!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29.9 * DAY);
	});

	test("never slides past createdAt + 180 days", async () => {
		const cookie = await registerAndLogin();
		const row = await sessionRowFor(cookie);
		const old = new Date(Date.now() - 175 * DAY);
		await db
			.update(schema.sessions)
			.set({ createdAt: old, expiresAt: new Date(Date.now() + 1 * DAY) })
			.where(eq(schema.sessions.id, row!.id));

		await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		const after = await sessionRowFor(cookie);
		const capped = old.getTime() + 180 * DAY;
		expect(Math.abs(after!.expiresAt.getTime() - capped)).toBeLessThan(10_000);
	});

	test("an expired session is deleted and returns 401", async () => {
		const cookie = await registerAndLogin();
		const row = await sessionRowFor(cookie);
		await db
			.update(schema.sessions)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(schema.sessions.id, row!.id));

		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(401);
		expect(await sessionRowFor(cookie)).toBeUndefined();
	});

	test("/auth/me reports expiresAt", async () => {
		const cookie = await registerAndLogin();
		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		const body = await json(res);
		expect(new Date(body.data.session.expiresAt).getTime()).toBeGreaterThan(
			Date.now() + 29 * DAY,
		);
	});

	test("a session already pinned to the cap is not rewritten", async () => {
		const cookie = await registerAndLogin();
		const row = await sessionRowFor(cookie);
		// One clock read: two Date.now() calls could straddle a millisecond and make
		// createdAt + 180d land after `pinned`, which would legitimately renew.
		const now = Date.now();
		const pinned = new Date(now + 5 * DAY);
		await db
			.update(schema.sessions)
			.set({ createdAt: new Date(now - 175 * DAY), expiresAt: pinned })
			.where(eq(schema.sessions.id, row!.id));

		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(res.headers.get("set-cookie")).toBeNull();

		const after = await sessionRowFor(cookie);
		expect(after!.expiresAt.getTime()).toBe(pinned.getTime());
	});

	test("/auth/me slides the cookie and reports the new expiry", async () => {
		const cookie = await registerAndLogin();
		const row = await sessionRowFor(cookie);
		await db
			.update(schema.sessions)
			.set({ expiresAt: new Date(Date.now() + 29 * DAY) })
			.where(eq(schema.sessions.id, row!.id));

		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(res.headers.get("set-cookie")).toContain("darasa_session=");
		const body = await json(res);
		expect(new Date(body.data.session.expiresAt).getTime()).toBeGreaterThan(
			Date.now() + 29.9 * DAY,
		);
	});
});
