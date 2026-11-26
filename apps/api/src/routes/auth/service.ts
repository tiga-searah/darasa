import { eq } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import {
	ApiError,
	hashPassword,
	isUniqueViolation,
	verifyPassword,
} from "../../utils";

/** A user row as stored; `passwordHash` never leaves this module. */
type UserRow = typeof schema.users.$inferSelect;

const DUMMY_HASH = await Bun.password.hash(crypto.randomUUID(), {
	algorithm: "argon2id",
});

/** Anything that must be public: no hash, ever. */
export async function publicUser(user: UserRow, session?: { expiresAt: Date }) {
	const linked = await db
		.select({ provider: schema.oauthAccounts.provider })
		.from(schema.oauthAccounts)
		.where(eq(schema.oauthAccounts.userId, user.id));
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		avatarUrl: user.avatarUrl,
		hasPassword: user.passwordHash !== null,
		linkedProviders: linked.map((row) => row.provider),
		createdAt: user.createdAt,
		...(session ? { session: { expiresAt: session.expiresAt } } : {}),
	};
}

export async function registerUser(input: {
	name: string;
	email: string;
	password: string;
}): Promise<UserRow> {
	const email = input.email.trim().toLowerCase();
	const existing = await db.query.users.findFirst({
		where: { email },
		columns: { id: true },
	});
	if (existing) throw new ApiError("CONFLICT", 409, "Email already registered");

	const passwordHash = await hashPassword(input.password);
	try {
		const [user] = await db
			.insert(schema.users)
			.values({ name: input.name, email, passwordHash })
			.returning();
		return user;
	} catch (error) {
		// Two concurrent registrations can both pass the check above; the unique
		// index is the real guard.
		if (isUniqueViolation(error))
			throw new ApiError("CONFLICT", 409, "Email already registered");
		throw error;
	}
}

export async function authenticate(input: {
	email: string;
	password: string;
}): Promise<UserRow> {
	const email = input.email.trim().toLowerCase();
	const user = await db.query.users.findFirst({ where: { email } });

	if (!user) {
		// Same hash cost as a real check, so timing does not reveal existence.
		await verifyPassword(input.password, DUMMY_HASH);
		throw new ApiError("UNAUTHENTICATED", 401, "Invalid email or password");
	}

	if (user.passwordHash === null)
		throw new ApiError(
			"OAUTH_ONLY_ACCOUNT",
			401,
			"This account uses Google sign-in",
		);

	if (!(await verifyPassword(input.password, user.passwordHash)))
		throw new ApiError("UNAUTHENTICATED", 401, "Invalid email or password");

	return user;
}
