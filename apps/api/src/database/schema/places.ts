import {
	boolean,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { users } from "./auth";
import { placeStatus } from "./enums";
import { media } from "./media";

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		icon: text("icon"),
		sortOrder: integer("sort_order").notNull().default(0),
	},
	(t) => [uniqueIndex("categories_slug_uq").on(t.slug)],
);

/** Weekly opening hours; `null` day = closed. Times are "HH:mm" local (WIB). */
export type OpeningHours = Partial<
	Record<
		"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
		{ open: string; close: string }
	>
>;

export const places = pgTable(
	"places",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: text("slug").notNull(),
		name: text("name").notNull(),
		categoryId: uuid("category_id")
			.notNull()
			.references(() => categories.id, { onDelete: "restrict" }),
		description: text("description"),
		address: text("address"),
		latitude: doublePrecision("latitude").notNull(),
		longitude: doublePrecision("longitude").notNull(),
		phone: text("phone"),
		openingHours: jsonb("opening_hours").$type<OpeningHours>(),
		/** FK to media; URL derived at serialization. */
		coverMediaId: uuid("cover_media_id").references(() => media.id, {
			onDelete: "set null",
		}),
		status: placeStatus("status").notNull().default("pending"),
		/** null for places seeded by the platform; FK keeps contributions attributed. */
		createdById: uuid("created_by_id").references(() => users.id, {
			onDelete: "set null",
		}),
		communityVerified: boolean("community_verified").notNull().default(false),
		ownerVerified: boolean("owner_verified").notNull().default(false),
		// Denormalized ranking inputs/outputs. Written by the review + verification
		// services, read by Explore/Hidden Gem; never hand-edited.
		ratingAvg: doublePrecision("rating_avg").notNull().default(0),
		reviewCount: integer("review_count").notNull().default(0),
		lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
		exploreScore: doublePrecision("explore_score").notNull().default(0),
		hiddenGemScore: doublePrecision("hidden_gem_score").notNull().default(0),
		...timestamps(),
	},
	(t) => [
		uniqueIndex("places_slug_uq").on(t.slug),
		index("places_status_explore_idx").on(t.status, t.exploreScore),
		index("places_status_hidden_gem_idx").on(t.status, t.hiddenGemScore),
		index("places_category_idx").on(t.categoryId),
		index("places_geo_idx").on(t.latitude, t.longitude),
	],
);

export const placePhotos = pgTable(
	"place_photos",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		placeId: uuid("place_id")
			.notNull()
			.references(() => places.id, { onDelete: "cascade" }),
		mediaId: uuid("media_id")
			.notNull()
			.references(() => media.id, { onDelete: "cascade" }),
		/** null = uploaded with the place submission or by staff. */
		uploadedById: uuid("uploaded_by_id").references(() => users.id, {
			onDelete: "set null",
		}),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("place_photos_place_idx").on(t.placeId, t.sortOrder)],
);
