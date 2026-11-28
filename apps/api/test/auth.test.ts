import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

const app = () => freshApp();
const register = (body: unknown) =>
	app().handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);

describe("register", () => {
	beforeEach(resetDb);

	test("creates a user and sets a session cookie", async () => {
		const res = await register({
			name: "Arya",
			email: "Arya@Example.com",
			password: "min8chars",
		});
		expect(res.status).toBe(201);
		const body = await json(res);
		expect(body.data.email).toBe("arya@example.com");
		expect(body.data.role).toBe("user");
		expect(body.data.hasPassword).toBe(true);
		expect(body.data.linkedProviders).toEqual([]);
		expect(body.data).not.toHaveProperty("passwordHash");
		expect(cookieOf(res)).toStartWith("darasa_session=");
	});

	test("rejects a duplicate email with 409", async () => {
		await register({ name: "Arya", email: "a@b.test", password: "min8chars" });
		const res = await register({
			name: "Other",
			email: "a@b.test",
			password: "min8chars",
		});
		expect(res.status).toBe(409);
		expect((await json(res)).error.code).toBe("CONFLICT");
	});

	test("rejects a 5-character password with 422", async () => {
		const res = await register({
			name: "Arya",
			email: "a@b.test",
			password: "12345",
		});
		expect(res.status).toBe(422);
		expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
	});

	test("accepts a 6-character password with 201", async () => {
		const res = await register({
			name: "Arya",
			email: "a6@b.test",
			password: "123456",
		});
		expect(res.status).toBe(201);
	});
});

describe("login and session", () => {
	beforeEach(async () => {
		await resetDb();
		await register({ name: "Arya", email: "a@b.test", password: "min8chars" });
	});

	test("logs in with the right password", async () => {
		const res = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "a@b.test", password: "min8chars" }),
			}),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.email).toBe("a@b.test");
		expect(cookieOf(res)).toStartWith("darasa_session=");
	});

	test("rejects a wrong password with the same message as unknown email", async () => {
		const wrong = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "a@b.test", password: "wrongpass" }),
			}),
		);
		const unknown = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "nobody@b.test", password: "wrongpass" }),
			}),
		);
		expect(wrong.status).toBe(401);
		expect(unknown.status).toBe(401);
		expect((await json(wrong)).error.message).toBe(
			(await json(unknown)).error.message,
		);
	});

	test("refuses password login for an OAuth-only account", async () => {
		await db.insert(schema.users).values({
			name: "Google Only",
			email: "gonly@b.test",
			passwordHash: null,
		});
		const res = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "gonly@b.test", password: "min8chars" }),
			}),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("OAUTH_ONLY_ACCOUNT");
		expect(res.headers.get("set-cookie") ?? "").not.toContain(
			"darasa_session=",
		);
	});

	test("/auth/me returns the user for a live session and 401 without one", async () => {
		const login = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "a@b.test", password: "min8chars" }),
			}),
		);
		const cookie = cookieOf(login)!;
		const me = await app().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(me.status).toBe(200);
		expect((await json(me)).data.email).toBe("a@b.test");

		const anon = await app().handle(new Request("http://test/api/auth/me"));
		expect(anon.status).toBe(401);
		expect((await json(anon)).error.code).toBe("UNAUTHENTICATED");
	});

	test("logout invalidates the session", async () => {
		const login = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "a@b.test", password: "min8chars" }),
			}),
		);
		const cookie = cookieOf(login)!;
		const out = await app().handle(
			new Request("http://test/api/auth/logout", {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(out.status).toBe(204);
		const me = await app().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(me.status).toBe(401);
	});
});

describe("malformed request bodies", () => {
	beforeEach(resetDb);

	test("malformed JSON body returns 400 without logging", async () => {
		const logged = spyOn(console, "error").mockImplementation(() => {});
		try {
			const res = await app().handle(
				new Request("http://test/api/auth/login", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{",
				}),
			);
			expect(res.status).toBe(400);
			expect(await json(res)).toEqual({
				error: { code: "VALIDATION_ERROR", message: "Malformed request body" },
			});
			expect(logged).not.toHaveBeenCalled();
		} finally {
			logged.mockRestore();
		}
	});

	test("unsupported content type returns 415 VALIDATION_ERROR", async () => {
		const res = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "text/plain" },
				body: "hi",
			}),
		);
		expect(res.status).toBe(415);
		expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
	});
});
