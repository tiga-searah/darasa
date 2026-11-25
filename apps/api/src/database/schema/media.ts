import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { mediaPurpose, mediaStatus } from "./enums";

/**
 * Every uploaded object. `key` is the RustFS object key; the public URL is
 * derived at serialization time so a CDN/domain change needs no data migration.
 */
export const media = pgTable(
	"media",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** null only for platform-seeded images. */
		ownerId: uuid("owner_id").references(() => users.id, {
			onDelete: "set null",
		}),
		purpose: mediaPurpose("purpose").notNull(),
		status: mediaStatus("status").notNull().default("pending"),
		/** true for claim evidence: private bucket, presigned GET only. */
		isPrivate: boolean("is_private").notNull().default(false),
		key: text("key").notNull(),
		mime: text("mime"),
		sizeBytes: integer("size_bytes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("media_key_uq").on(t.key),
		index("media_owner_idx").on(t.ownerId, t.createdAt),
		index("media_pending_idx").on(t.status, t.createdAt),
	],
);
