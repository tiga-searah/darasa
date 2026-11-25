import { Elysia, t } from "elysia";
import { db } from "../../database";
import {
	clearSessionCookie,
	createSession,
	destroySession,
	resolveSession,
	SESSION_COOKIE,
	setSessionCookie,
} from "../../lib/session";
import { ApiError } from "../../utils";
import { LoginBody, RegisterBody, UserResponse } from "./model";
import { authenticate, publicUser, registerUser } from "./service";

const unauthenticated = () =>
	new ApiError("UNAUTHENTICATED", 401, "Not signed in");

const tokenFrom = (
	cookie: Record<string, { value?: unknown }>,
): string | null => {
	const value = cookie[SESSION_COOKIE]?.value;
	return typeof value === "string" && value.length > 0 ? value : null;
};

export const authRoutes = new Elysia({ prefix: "/auth" })
	.post(
		"/register",
		{ body: RegisterBody, response: { 201: t.Object({ data: UserResponse }) } },
		async ({ body, cookie, set }) => {
			const user = await registerUser(body);
			const { token, expiresAt } = await createSession(user.id);
			setSessionCookie(cookie[SESSION_COOKIE], token, expiresAt);
			set.status = 201;
			return { data: publicUser(user) };
		},
	)
	.post(
		"/login",
		{ body: LoginBody, response: { 200: t.Object({ data: UserResponse }) } },
		async ({ body, cookie }) => {
			const user = await authenticate(body);
			const { token, expiresAt } = await createSession(user.id);
			setSessionCookie(cookie[SESSION_COOKIE], token, expiresAt);
			return { data: publicUser(user) };
		},
	)
	.post("/logout", async ({ cookie }) => {
		const token = tokenFrom(cookie);
		if (token) await destroySession(token);
		clearSessionCookie(cookie[SESSION_COOKIE]);
		return new Response(null, { status: 204 });
	})
	.get(
		"/me",
		{ response: { 200: t.Object({ data: UserResponse }) } },
		async ({ cookie }) => {
			const token = tokenFrom(cookie);
			if (!token) throw unauthenticated();
			const session = await resolveSession(token);
			if (!session) throw unauthenticated();
			if (session.renewedToken)
				setSessionCookie(
					cookie[SESSION_COOKIE],
					session.renewedToken,
					session.expiresAt,
				);
			const user = await db.query.users.findFirst({
				where: { id: session.user.id },
			});
			if (!user) throw unauthenticated();
			return { data: publicUser(user, session) };
		},
	);
