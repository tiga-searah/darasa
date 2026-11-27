import { t } from "elysia";
import { OpeningHoursSchema } from "../places/model";
import { OwnerReplySchema } from "../reviews/model";
export const OwnerPlaceParams = t.Object({
	id: t.String({ format: "uuid" }),
});

export const OwnerPlaceStatsQuery = t.Object({
	days: t.Optional(t.Union([t.Literal("7"), t.Literal("30"), t.Literal("90")])),
});

export const UpdateOwnerPlaceBody = t.Object({
	name: t.Optional(t.String({ minLength: 2, maxLength: 120 })),
	address: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
	description: t.Optional(t.Union([t.String({ maxLength: 5000 }), t.Null()])),
	phone: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])),
	priceRange: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
	openingHours: t.Optional(
		t.Union([OpeningHoursSchema, t.String({ maxLength: 200 }), t.Null()]),
	),
	coverMediaId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
	// Identity fields: accepted in schema so handler can reject with 403 + fields
	categoryId: t.Optional(t.Unknown()),
	latitude: t.Optional(t.Unknown()),
	longitude: t.Optional(t.Unknown()),
	status: t.Optional(t.Unknown()),
});

export type UpdateOwnerPlaceInput = {
	name?: string;
	address?: string | null;
	description?: string | null;
	phone?: string | null;
	priceRange?: string | null;
	openingHours?:
		| Record<string, { open: string; close: string } | null>
		| string
		| null;
	coverMediaId?: string | null;
	categoryId?: unknown;
	latitude?: unknown;
	longitude?: unknown;
	status?: unknown;
};

export const OwnerReviewsQuery = t.Object({
	page: t.Optional(t.Integer({ minimum: 1 })),
	limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
	unanswered: t.Optional(
		t.Union([t.Boolean(), t.Literal("true"), t.Literal("false")]),
	),
});

export const UpsertReplyBody = t.Object({
	body: t.String({ minLength: 1, maxLength: 1000 }),
});

export const OwnerPlaceListItem = t.Object({
	id: t.String(),
	slug: t.String(),
	name: t.String(),
	categoryId: t.String(),
	address: t.Nullable(t.String()),
	phone: t.Nullable(t.String()),
	status: t.Union([
		t.Literal("pending"),
		t.Literal("published"),
		t.Literal("rejected"),
		t.Literal("archived"),
	]),
	ownerVerified: t.Boolean(),
	coverUrl: t.Nullable(t.String()),
	district: t.Nullable(t.String()),
	priceRange: t.Nullable(t.String()),
	views: t.Number(),
	exploreScore: t.Number(),
	hiddenGemScore: t.Number(),
	description: t.Nullable(t.String()),
	openingHours: t.Nullable(t.Any()),
	ratingAvg: t.Number(),
	reviewCount: t.Number(),
	pendingClaims: t.Number(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export const OwnerPlacesListResponse = t.Object({
	data: t.Array(OwnerPlaceListItem),
});

export const OwnerPlaceStatsResponse = t.Object({
	data: t.Object({
		days: t.Number(),
		totalViews: t.Number(),
		ratingAvg: t.Number(),
		reviewCount: t.Number(),
		lastReviewAt: t.Nullable(t.String()),
		unansweredReviews: t.Number(),
		daily: t.Array(
			t.Object({
				day: t.Number(),
				views: t.Number(),
			}),
		),
	}),
});

export const OwnerReplyResponse = t.Object({
	data: OwnerReplySchema,
});
