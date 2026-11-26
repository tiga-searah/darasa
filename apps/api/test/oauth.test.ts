import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import type { GoogleClient } from "../src/lib/ports";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

function fakeGoogle(
	sub = "google-sub-1",
	email = "g@b.test",
	emailVerified = true,
): GoogleClient {
	const idToken = `x.${Buffer.from(JSON.stringify({ sub, email, email_verified: emailVerified, name: "Arya", picture: "https://img/x.png" })).toString("base64url")}.y`;
	return {
		createAuthorizationURL: (
			state: string,
			verifier: string,
			scopes: string[],
		) => {
			const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
			u.searchParams.set("state", state);
			u.searchParams.set("code_challenge", verifier);
			u.searchParams.set("scope", scopes.join(" "));
			return u;
		},
		validateAuthorizationCode: async (code: string, verifier: string) => {
			if (code !== "good-code" || !verifier) throw new Error("bad code");
			return { idToken: () => idToken };
		},
	};
}

const start = (google: GoogleClient, redirectTo?: string) =>
	freshApp({ google }).handle(
		new Request(
			`http://test/api/auth/google${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`,
		),
	);

describe("GET /auth/google", () => {
	beforeEach(resetDb);

	test("redirects to Google with state, PKCE and a handshake cookie", async () => {
		const res = await start(fakeGoogle());
		expect(res.status).toBe(307);
		const location = new URL(res.headers.get("location")!);
		expect(location.host).toBe("accounts.google.com");
		expect(location.searchParams.get("state")).toBeTruthy();
		expect(location.searchParams.get("code_challenge")).toBeTruthy();
		expect(location.searchParams.get("scope")).toBe("openid email profile");
		const setCookie = res.headers.get("set-cookie")!;
		expect(setCookie).toContain("darasa_oauth=");
		expect(setCookie).toContain("HttpOnly");
		expect(setCookie).toContain("Path=/api/auth");
		expect(setCookie).toContain("Max-Age=600");
	});

	test("rejects an absolute redirectTo (open redirect guard)", async () => {
		const res = await start(fakeGoogle(), "https://evil.example/");
		expect(res.status).toBe(307);
		const cookie = decodeURIComponent(cookieOf(res)!.split("=")[1]);
		expect(JSON.parse(cookie).redirectTo).toBe("/");
	});

	test("rejects a protocol-relative redirectTo", async () => {
		const res = await start(fakeGoogle(), "//evil.example/x");
		expect(res.status).toBe(307);
		const cookie = decodeURIComponent(cookieOf(res)!.split("=")[1]);
		expect(JSON.parse(cookie).redirectTo).toBe("/");
	});
});

describe("GET /auth/google/callback", () => {
	beforeEach(resetDb);

	async function begin() {
		const res = await start(fakeGoogle());
		const setCookie = res.headers.get("set-cookie")!;
		const pair = setCookie.split(";")[0];
		const state = new URL(res.headers.get("location")!).searchParams.get(
			"state",
		)!;
		return { pair, state };
	}

	test("creates the user, sets a session, and redirects to the app", async () => {
		const { pair, state } = await begin();
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				`http://test/api/auth/google/callback?code=good-code&state=${state}`,
				{
					headers: { cookie: pair },
				},
			),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe("http://localhost:5173/");
		expect(res.headers.get("set-cookie")).toContain("darasa_session=");

		// Two Set-Cookie headers go out: the cleared handshake and the session.
		const sessionPair = res.headers
			.getSetCookie()
			.find((c) => c.startsWith("darasa_session="))!
			.split(";")[0];
		const me = await freshApp({ google: fakeGoogle() }).handle(
			new Request("http://test/api/auth/me", {
				headers: { cookie: sessionPair },
			}),
		);
		const meBody = await json(me);
		expect(meBody.data.email).toBe("g@b.test");
		expect(meBody.data.hasPassword).toBe(false);
		expect(meBody.data.linkedProviders).toEqual(["google"]);
	});

	test("state mismatch redirects with oauth_state and creates no session", async () => {
		const { pair } = await begin();
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				"http://test/api/auth/google/callback?code=good-code&state=wrong",
				{
					headers: { cookie: pair },
				},
			),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe(
			"http://localhost:5173/login?error=oauth_state",
		);
		expect(res.headers.get("set-cookie") ?? "").not.toContain(
			"darasa_session=",
		);
	});

	test("missing handshake cookie redirects with oauth_state", async () => {
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				"http://test/api/auth/google/callback?code=good-code&state=abc",
			),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toContain("error=oauth_state");
	});

	test("provider error param redirects with oauth_denied", async () => {
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request("http://test/api/auth/google/callback?error=access_denied"),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toContain("error=oauth_denied");
	});

	test("exchange failure redirects with oauth_exchange and logs", async () => {
		const { pair, state } = await begin();
		const logged = spyOn(console, "error").mockImplementation(() => {});
		try {
			const res = await freshApp({ google: fakeGoogle() }).handle(
				new Request(
					`http://test/api/auth/google/callback?code=bad-code&state=${state}`,
					{
						headers: { cookie: pair },
					},
				),
			);
			expect(res.status).toBe(302);
			expect(res.headers.get("location")).toContain("error=oauth_exchange");
			// A swallowed failure is invisible to the operator; pin the signal.
			expect(logged).toHaveBeenCalled();
		} finally {
			logged.mockRestore();
		}
	});

	test("unverified email fails closed: no session, no user row", async () => {
		const { pair, state } = await begin();
		const logged = spyOn(console, "error").mockImplementation(() => {});
		let res: Response;
		try {
			res = await freshApp({
				google: fakeGoogle("google-sub-1", "g@b.test", false),
			}).handle(
				new Request(
					`http://test/api/auth/google/callback?code=good-code&state=${state}`,
					{
						headers: { cookie: pair },
					},
				),
			);
		} finally {
			logged.mockRestore();
		}
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toContain("error=oauth_exchange");
		expect(res.headers.get("set-cookie") ?? "").not.toContain(
			"darasa_session=",
		);
		expect(await db.select().from(schema.users)).toHaveLength(0);
		expect(await db.select().from(schema.oauthAccounts)).toHaveLength(0);
	});

	test("unverified email does not attach to an existing password account", async () => {
		await freshApp().handle(
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
		const { pair, state } = await begin();
		const logged = spyOn(console, "error").mockImplementation(() => {});
		let res: Response;
		try {
			res = await freshApp({
				google: fakeGoogle("google-sub-1", "g@b.test", false),
			}).handle(
				new Request(
					`http://test/api/auth/google/callback?code=good-code&state=${state}`,
					{
						headers: { cookie: pair },
					},
				),
			);
		} finally {
			logged.mockRestore();
		}
		expect(res.headers.get("location")).toContain("error=oauth_exchange");
		expect(await db.select().from(schema.oauthAccounts)).toHaveLength(0);
	});

	test("verified email links to an existing password account", async () => {
		const registered = await freshApp().handle(
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
		expect(registered.status).toBe(201);

		const { pair, state } = await begin();
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				`http://test/api/auth/google/callback?code=good-code&state=${state}`,
				{
					headers: { cookie: pair },
				},
			),
		);
		expect(res.headers.get("location")).toBe("http://localhost:5173/");
		const users = await db.select().from(schema.users);
		expect(users).toHaveLength(1);
		expect(users[0].passwordHash).not.toBeNull();
		expect(await db.select().from(schema.oauthAccounts)).toHaveLength(1);
	});

	test("second login with the same sub links to the same user", async () => {
		const { pair, state } = await begin();
		await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				`http://test/api/auth/google/callback?code=good-code&state=${state}`,
				{
					headers: { cookie: pair },
				},
			),
		);
		const again = await begin();
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				`http://test/api/auth/google/callback?code=good-code&state=${again.state}`,
				{
					headers: { cookie: again.pair },
				},
			),
		);
		expect(res.status).toBe(302);
		const rows = await db.select().from(schema.users);
		expect(rows.length).toBe(1);
		const linked = await db.select().from(schema.oauthAccounts);
		expect(linked.length).toBe(1);
	});
});
