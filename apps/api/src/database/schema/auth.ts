import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { oauthProvider, userRole } from "./enums";

export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		email: text("email").notNull(),
		/** null when the account only has an OAuth identity. */
		passwordHash: text("password_hash"),
		// 'owner' is granted when the first claim is approved; per-place authority
		// still comes from business_claims, never from this flag alone.
		role: userRole("role").notNull().default("user"),
		avatarUrl: text("avatar_url"),
		xpTotal: integer("xp_total").notNull().default(0),
		...timestamps(),
	},
	(t) => [uniqueIndex("users_email_uq").on(t.email)],
);

/** One row per linked external identity; a user may link several. */
export const oauthAccounts = pgTable(
	"oauth_accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		provider: oauthProvider("provider").notNull(),
		/** provider's stable subject id (`sub` for Google), never the email. */
		providerAccountId: text("provider_account_id").notNull(),
		email: text("email"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("oauth_accounts_provider_account_uq").on(
			t.provider,
			t.providerAccountId,
		),
		index("oauth_accounts_user_idx").on(t.userId),
	],
);

export const sessions = pgTable(
	"sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		// sha256 of the raw cookie token; the token itself is never stored.
		tokenHash: text("token_hash").notNull(),
		// Sliding idle expiry: pushed to now + 30 days on use. Hard-capped by
		// createdAt + 180 days so a stolen token cannot live forever.
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("sessions_token_hash_uq").on(t.tokenHash),
		index("sessions_user_idx").on(t.userId),
	],
);
