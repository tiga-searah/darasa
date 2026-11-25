import { decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { type Cookie, Elysia, redirect } from "elysia";
import { db } from "../../database";
import { schema } from "../../database/schema";
import { env } from "../../env";
import { googleClient } from "../../lib/google";
import type { GoogleClient } from "../../lib/ports";
import {
	createSession,
	SESSION_COOKIE,
	setSessionCookie,
} from "../../lib/session";

export const OAUTH_COOKIE = "darasa_oauth";
const OAUTH_COOKIE_PATH = "/api/auth";

export type OAuthHandshake = {
	state: string;
	verifier: string;
	redirectTo: string;
};

const SCOPES = ["openid", "email", "profile"];

/** `deps` is decorated on the root app; the child plugin cannot see that type. */
const googleFrom = (deps: unknown): GoogleClient =>
	(deps as { google?: GoogleClient } | undefined)?.google ?? googleClient();

const handshakeFrom = (value: unknown): OAuthHandshake | null => {
	if (!value || typeof value !== "object") return null;
	const { state, verifier, redirectTo } = value as Partial<OAuthHandshake>;
	if (
		typeof state !== "string" ||
		typeof verifier !== "string" ||
		typeof redirectTo !== "string"
	)
		return null;
	return { state, verifier, redirectTo };
};

/** Only same-origin paths: `//evil.example` and absolute URLs both fall back. */
const safeRedirect = (value: string | undefined): string =>
	value?.startsWith("/") && !value.startsWith("//") ? value : "/";

const setHandshake = (cookie: Cookie, handshake: OAuthHandshake): void => {
	cookie.set({
		value: handshake,
		httpOnly: true,
		sameSite: "lax",
		path: OAUTH_COOKIE_PATH,
		maxAge: 600,
		secure: env.sessionCookieSecure,
	});
};

/** The Path attribute must match the one it was set with, or the browser keeps it. */
const clearHandshake = (cookie: Cookie): void => {
	cookie.set({
		value: "",
		httpOnly: true,
		sameSite: "lax",
		path: OAUTH_COOKIE_PATH,
		maxAge: 0,
		secure: env.sessionCookieSecure,
	});
};

type GoogleClaims = {
	sub: string;
	email?: string;
	/** Absent/false must fail closed: an unverified address cannot own an account. */
	email_verified?: boolean;
	name?: string;
	picture?: string;
};

/** Provider-side failure: always back to the app's login page, never an API error. */
const failTo = (cookie: Cookie, reason: string) => {
	clearHandshake(cookie);
	return redirect(`${env.webAppUrl}/login?error=${reason}`, 302);
};

export const oauthRoutes = new Elysia()
	.get("/google", (ctx) => {
		const { cookie, query } = ctx;
		const state = generateState();
		const verifier = generateCodeVerifier();
		const redirectTo = safeRedirect(query.redirectTo);
		setHandshake(cookie[OAUTH_COOKIE], { state, verifier, redirectTo });
		const url = googleFrom(
			(ctx as unknown as { deps?: unknown }).deps,
		).createAuthorizationURL(state, verifier, SCOPES);
		return redirect(url.toString(), 307);
	})
	.get("/google/callback", async (ctx) => {
		const { cookie, query } = ctx;
		const deps = (ctx as unknown as { deps?: unknown }).deps;
		if (query.error) return failTo(cookie[OAUTH_COOKIE], "oauth_denied");

		const handshake = handshakeFrom(cookie[OAUTH_COOKIE]?.value);
		if (!handshake || query.state !== handshake.state)
			return failTo(cookie[OAUTH_COOKIE], "oauth_state");

		// Single-use: whatever happens next, this handshake cannot be replayed.
		clearHandshake(cookie[OAUTH_COOKIE]);

		// Everything past the state check still ends on the login page, never on a
		// rendered API error: a bad code, a malformed token or a lost race all look
		// the same to the browser.
		try {
			if (!query.code) throw new Error("missing code");
			const tokens = await googleFrom(deps).validateAuthorizationCode(
				query.code,
				handshake.verifier,
			);
			// Unverified decode is correct: this token came from Google's token
			// endpoint over TLS, never through the browser.
			const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
			const email = claims.email?.toLowerCase();
			// `email_verified` gates account linking by email: an unverified address
			// could belong to someone else, and linking it would be a takeover.
			if (!claims.sub || !email || claims.email_verified !== true)
				throw new Error("incomplete claims");

			const userId = await upsertUser(claims.sub, email, claims);
			const { token, expiresAt } = await createSession(userId);
			setSessionCookie(cookie[SESSION_COOKIE], token, expiresAt);
		} catch (error) {
			// The browser must not see this, but the operator must: a database outage
			// otherwise looks identical to a bad authorization code.
			console.error("oauth callback failed", error);
			return redirect(`${env.webAppUrl}/login?error=oauth_exchange`, 302);
		}

		// Re-sanitize: the cookie is httpOnly but unsigned, so never trust it alone.
		return redirect(
			`${env.webAppUrl}${safeRedirect(handshake.redirectTo)}`,
			302,
		);
	});

async function upsertUser(
	sub: string,
	email: string,
	claims: GoogleClaims,
): Promise<string> {
	const account = await db.query.oauthAccounts.findFirst({
		where: { provider: "google", providerAccountId: sub },
		columns: { userId: true },
	});
	if (account) return account.userId;

	const existing = await db.query.users.findFirst({
		where: { email },
		columns: { id: true },
	});
	const user =
		existing ??
		(
			await db
				.insert(schema.users)
				.values({
					name: claims.name ?? email,
					email,
					passwordHash: null,
					avatarUrl: claims.picture ?? null,
				})
				.returning()
		)[0];

	// A concurrent first login may have linked the same sub already; the unique
	// index decides, and the user row above is the same one either way.
	await db
		.insert(schema.oauthAccounts)
		.values({
			userId: user.id,
			provider: "google",
			providerAccountId: sub,
			email,
		})
		.onConflictDoNothing();
	return user.id;
}
