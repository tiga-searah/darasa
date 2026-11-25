import { eq } from "drizzle-orm";
import type { Cookie } from "elysia";
import { db } from "../database";
import { schema } from "../database/schema";
import { env } from "../env";

export const SESSION_COOKIE = "darasa_session";
export const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 180 * 24 * 60 * 60 * 1000;

export type SessionUser = {
	id: string;
	name: string;
	email: string;
	role: "user" | "owner" | "admin";
	avatarUrl: string | null;
	hasPassword: boolean;
};

const tokenHashOf = (token: string) =>
	new Bun.CryptoHasher("sha256").update(token).digest("hex");

export async function createSession(
	userId: string,
): Promise<{ token: string; expiresAt: Date }> {
	const token = Buffer.from(
		crypto.getRandomValues(new Uint8Array(32)),
	).toString("base64url");
	const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);
	await db
		.insert(schema.sessions)
		.values({ userId, tokenHash: tokenHashOf(token), expiresAt });
	return { token, expiresAt };
}

export async function resolveSession(
	token: string,
): Promise<{ user: SessionUser; expiresAt: Date } | null> {
	const row = await db.query.sessions.findFirst({
		where: { tokenHash: tokenHashOf(token) },
		with: { user: true },
	});
	if (!row?.user || row.expiresAt <= new Date()) return null;
	const user = row.user;
	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			avatarUrl: user.avatarUrl,
			hasPassword: user.passwordHash !== null,
		},
		expiresAt: row.expiresAt,
	};
}

export async function destroySession(token: string): Promise<void> {
	await db
		.delete(schema.sessions)
		.where(eq(schema.sessions.tokenHash, tokenHashOf(token)));
}

export function setSessionCookie(
	cookie: Cookie,
	token: string,
	expiresAt: Date,
): void {
	cookie.set({
		value: token,
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
		secure: env.sessionCookieSecure,
	});
}

export function clearSessionCookie(cookie: Cookie): void {
	cookie.set({
		value: "",
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: 0,
		secure: env.sessionCookieSecure,
	});
}
