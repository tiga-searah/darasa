import { beforeEach, describe, expect, test } from "bun:test";
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

describe("requireAuth", () => {
	beforeEach(resetDb);

	test("401 without a cookie", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me"),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
	});

	test("exposes sessionUser with a live cookie", async () => {
		const cookie = await registerAndLogin();
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.email).toBe("g@b.test");
	});

	test("401 for a forged token", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me", {
				headers: { cookie: "darasa_session=forged" },
			}),
		);
		expect(res.status).toBe(401);
	});

	test("401 when the session's user row was deleted", async () => {
		const cookie = await registerAndLogin();
		await resetDb(); // truncates users + sessions, cookie still present client-side
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
	});
});

describe("requireAdmin", () => {
	beforeEach(resetDb);

	test("401 without a cookie", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/admin"),
		);
		expect(res.status).toBe(401);
	});

	test("403 for a signed-in non-admin", async () => {
		const cookie = await registerAndLogin();
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/admin", { headers: { cookie } }),
		);
		expect(res.status).toBe(403);
		expect((await json(res)).error.code).toBe("FORBIDDEN");
	});

	test("200 for an admin", async () => {
		const cookie = await registerAndLogin();
		await db.update(schema.users).set({ role: "admin" });
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/admin", { headers: { cookie } }),
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
