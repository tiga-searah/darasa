import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { anomalyKind, anomalyStatus } from "./enums";
import { places } from "./places";
import { reviews } from "./reviews";

export type AnomalyMetrics = {
	/** Observed z-score for the metric that triggered the flag. */
	zScore: number;
	mean: number;
	stdDev: number;
	/** Window the baseline was computed over, in days. */
	windowDays: number;
	/** Number of observations in the window. */
	sampleSize: number;
};

export const anomalyFlags = pgTable(
	"anomaly_flags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		placeId: uuid("place_id")
			.notNull()
			.references(() => places.id, { onDelete: "cascade" }),
		reviewId: uuid("review_id").references(() => reviews.id, {
			onDelete: "cascade",
		}),
		userId: uuid("user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		kind: anomalyKind("kind").notNull(),
		status: anomalyStatus("status").notNull().default("open"),
		metrics: jsonb("metrics").$type<AnomalyMetrics>().notNull(),
		/** Human-readable reason, shown to admins. Not a verdict. */
		reason: text("reason").notNull(),
		resolvedById: uuid("resolved_by_id").references(() => users.id, {
			onDelete: "set null",
		}),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		resolutionNote: text("resolution_note"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("anomaly_flags_open_idx")
			.on(t.status, t.createdAt)
			.where(sql`${t.status} = 'open'`),
		index("anomaly_flags_place_idx").on(t.placeId, t.createdAt),
	],
);

/** z-score threshold that produces a flag; kept in one place for tuning. */
export const ANOMALY_Z_THRESHOLD = 2.5;
/** baseline window for rating z-scores, in days. */
export const ANOMALY_WINDOW_DAYS = 30;
