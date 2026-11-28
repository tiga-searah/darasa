import { t } from "elysia";

export const RegisterBody = t.Object({
	name: t.String({ minLength: 2, maxLength: 80 }),
	email: t.String({ format: "email" }),
	password: t.String({ minLength: 8, maxLength: 72 }),
});

export const LoginBody = t.Object({
	email: t.String({ format: "email" }),
	password: t.String({ minLength: 1, maxLength: 72 }),
});

export const UserResponse = t.Object({
	id: t.String(),
	name: t.String(),
	email: t.String(),
	role: t.Union([t.Literal("user"), t.Literal("owner"), t.Literal("admin")]),
	avatarUrl: t.Union([t.String(), t.Null()]),
	xpTotal: t.Number(),
	hasPassword: t.Boolean(),
	linkedProviders: t.Array(t.String()),
	createdAt: t.Date(),
	session: t.Optional(t.Object({ expiresAt: t.Date() })),
});
