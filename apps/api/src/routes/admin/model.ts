import { t } from "elysia";

export const AdminPlacesQuery = t.Object({
	status: t.Optional(
		t.Union([
			t.Literal("pending"),
			t.Literal("published"),
			t.Literal("rejected"),
			t.Literal("archived"),
		]),
	),
	q: t.Optional(t.String({ maxLength: 80 })),
	page: t.Optional(t.Integer({ minimum: 1 })),
	limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
});

export type AdminPlacesQueryType = {
	status?: "pending" | "published" | "rejected" | "archived";
	q?: string;
	page?: number;
	limit?: number;
};

export const UpdateVerificationBody = t.Object({
	communityVerified: t.Optional(t.Boolean()),
	ownerVerified: t.Optional(t.Boolean()),
});

export type UpdateVerificationBodyType = {
	communityVerified?: boolean;
	ownerVerified?: boolean;
};

export const ModerateReviewBody = t.Object({
	status: t.Union([
		t.Literal("published"),
		t.Literal("hidden"),
		t.Literal("removed"),
	]),
});

export type ModerateReviewBodyType = {
	status: "published" | "hidden" | "removed";
};

export const AdminAnomaliesQuery = t.Object({
	status: t.Optional(
		t.Union([
			t.Literal("open"),
			t.Literal("dismissed"),
			t.Literal("confirmed"),
		]),
	),
	kind: t.Optional(
		t.Union([t.Literal("rating_outlier"), t.Literal("review_burst")]),
	),
	placeId: t.Optional(t.String({ format: "uuid" })),
	page: t.Optional(t.Integer({ minimum: 1 })),
	limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
});

export type AdminAnomaliesQueryType = {
	status?: "open" | "dismissed" | "confirmed";
	kind?: "rating_outlier" | "review_burst";
	placeId?: string;
	page?: number;
	limit?: number;
};

export const ResolveAnomalyBody = t.Object({
	status: t.Union([t.Literal("dismissed"), t.Literal("confirmed")]),
	note: t.String({ minLength: 5, maxLength: 500 }),
});

export type ResolveAnomalyBodyType = {
	status: "dismissed" | "confirmed";
	note: string;
};
