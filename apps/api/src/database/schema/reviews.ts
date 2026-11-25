import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { users } from "./auth";
import { reviewStatus } from "./enums";
import { media } from "./media";
import { places } from "./places";

export const reviews = pgTable(
	"reviews",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		placeId: uuid("place_id")
			.notNull()
			.references(() => places.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		rating: smallint("rating").notNull(),
		body: text("body"),
		status: reviewStatus("status").notNull().default("published"),
		...timestamps(),
	},
	(t) => [
		// One review per user per place (PRD open question 5: resolve as edit-in-place).
		uniqueIndex("reviews_place_user_uq").on(t.placeId, t.userId),
		index("reviews_place_created_idx").on(t.placeId, t.createdAt),
		index("reviews_user_idx").on(t.userId),
		check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
		check(
			"reviews_body_length",
			sql`${t.body} is null or char_length(${t.body}) between 10 and 2000`,
		),
	],
);

export const reviewPhotos = pgTable(
	"review_photos",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		reviewId: uuid("review_id")
			.notNull()
			.references(() => reviews.id, { onDelete: "cascade" }),
		mediaId: uuid("media_id")
			.notNull()
			.references(() => media.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("review_photos_review_idx").on(t.reviewId)],
);

export const ownerReplies = pgTable(
	"owner_replies",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		reviewId: uuid("review_id")
			.notNull()
			.references(() => reviews.id, { onDelete: "cascade" }),
		placeId: uuid("place_id")
			.notNull()
			.references(() => places.id, { onDelete: "cascade" }),
		authorId: uuid("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		body: text("body").notNull(),
		...timestamps(),
	},
	(t) => [
		// One owner reply per review; editing replaces the text.
		uniqueIndex("owner_replies_review_uq").on(t.reviewId),
		index("owner_replies_place_idx").on(t.placeId),
	],
);

export const reviewRateLimits = pgTable(
	"review_rate_limits",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		placeId: uuid("place_id")
			.notNull()
			.references(() => places.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("review_rate_limits_user_idx").on(t.userId, t.createdAt)],
);

export const placeStats = pgTable(
	"place_stats",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		placeId: uuid("place_id")
			.notNull()
			.references(() => places.id, { onDelete: "cascade" }),
		day: integer("day").notNull(),
		views: integer("views").notNull().default(0),
	},
	(t) => [uniqueIndex("place_stats_place_day_uq").on(t.placeId, t.day)],
);
