import { type Cookie, Elysia } from "elysia";
import {
	resolveSession,
	SESSION_COOKIE,
	type SessionUser,
	setSessionCookie,
} from "../lib/session";
import { ApiError } from "../utils";

const tokenFrom = (cookie: Record<string, { value?: unknown }>) => {
	const value = cookie[SESSION_COOKIE]?.value;
	return typeof value === "string" && value.length > 0 ? value : null;
};

/**
 * Never reuse or mutate a guard instance — one fresh instance per export.
 * Remounting a mutated instance silently drops the hooks added after its first mount.
 */
const sessionPlugin = (name: string) =>
	new Elysia({ name })
		.derive("plugin", async ({ cookie }) => {
			const cookies = cookie as Record<string, Cookie>;
			const token = tokenFrom(cookies);
			const resolved = token ? await resolveSession(token) : null;
			// Keep the browser's Max-Age in step with the slid expiry. Emitting a
			// Set-Cookie from derive is verified to reach the response.
			if (resolved?.renewedToken)
				setSessionCookie(
					cookies[SESSION_COOKIE],
					resolved.renewedToken,
					resolved.expiresAt,
				);
			// Runtime stays `null` so onBeforeHandle below can reject it; the cast only
			// spares every consumer a non-null assertion. Safe because the guard always
			// throws before a handler runs with a null session.
			return { sessionUser: (resolved?.user ?? null) as SessionUser };
		})
		.onBeforeHandle("plugin", ({ sessionUser }) => {
			if (sessionUser === null)
				throw new ApiError("UNAUTHENTICATED", 401, "Sign in required");
		});

/** Resolves the session cookie once per request and rejects anonymous requests. */
export const requireAuth = sessionPlugin("require-auth");

/** `requireAuth` plus a role check. */
export const requireAdmin = sessionPlugin("require-admin").onBeforeHandle(
	"plugin",
	({ sessionUser }) => {
		if (sessionUser.role !== "admin")
			throw new ApiError("FORBIDDEN", 403, "Administrator access required");
	},
);
