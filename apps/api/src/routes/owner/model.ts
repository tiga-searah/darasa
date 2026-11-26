import { t } from "elysia";
import { OpeningHoursSchema } from "../places/model";

export const OwnerPlaceParams = t.Object({
	id: t.String({ format: "uuid" }),
});

export const OwnerPlaceStatsQuery = t.Object({
	days: t.Optional(t.Union([t.Literal("7"), t.Literal("30"), t.Literal("90")])),
});

export const UpdateOwnerPlaceBody = t.Object({
	address: t.Optional(t.Union([t.String({ maxLength: 300 }), t.Null()])),
	description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
	phone: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])),
	openingHours: t.Optional(t.Union([OpeningHoursSchema, t.Null()])),
	coverMediaId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
	// Identity fields: accepted in schema so handler can reject with 403 + fields
	name: t.Optional(t.Unknown()),
	categoryId: t.Optional(t.Unknown()),
	latitude: t.Optional(t.Unknown()),
	longitude: t.Optional(t.Unknown()),
	status: t.Optional(t.Unknown()),
});

export type UpdateOwnerPlaceInput = {
	address?: string | null;
	description?: string | null;
	phone?: string | null;
	openingHours?: Record<string, { open: string; close: string } | null> | null;
	coverMediaId?: string | null;
	name?: unknown;
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
