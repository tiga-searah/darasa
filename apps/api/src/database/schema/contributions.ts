import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { contributionAction } from "./enums";
import { places } from "./places";

export const xpEvents = pgTable(
	"xp_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		placeId: uuid("place_id").references(() => places.id, {
			onDelete: "set null",
		}),
		action: contributionAction("action").notNull(),
		xpDelta: integer("xp_delta").notNull(),
		summary: text("summary").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("xp_events_user_created_idx").on(t.userId, t.createdAt)],
);
