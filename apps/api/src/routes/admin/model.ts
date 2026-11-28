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
	status: t.Union([
		t.Literal("dismissed"),
		t.Literal("confirmed"),
		t.Literal("cleared"),
		t.Literal("flagged_hold"),
	]),
	note: t.Optional(t.String({ maxLength: 500 })),
});

export type ResolveAnomalyBodyType = {
	status: "dismissed" | "confirmed" | "cleared" | "flagged_hold";
	note?: string;
};

const PlaceStatusSchema = t.Union([
	t.Literal("pending"),
	t.Literal("published"),
	t.Literal("rejected"),
	t.Literal("archived"),
]);

const ReviewStatusSchema = t.Union([
	t.Literal("published"),
	t.Literal("hidden"),
	t.Literal("removed"),
]);

const AnomalyKindSchema = t.Union([
	t.Literal("rating_outlier"),
	t.Literal("review_burst"),
]);

const AnomalyStatusSchema = t.Union([
	t.Literal("open"),
	t.Literal("dismissed"),
	t.Literal("confirmed"),
]);

const AnomalyMetricsSchema = t.Object({
	zScore: t.Number(),
	mean: t.Number(),
	stdDev: t.Number(),
	windowDays: t.Number(),
	sampleSize: t.Number(),
});

const PaginationMetaSchema = t.Object({
	page: t.Number(),
	limit: t.Number(),
	total: t.Number(),
	totalPages: t.Number(),
});

export const AdminPlaceItem = t.Object({
	id: t.String(),
	slug: t.String(),
	name: t.String(),
	categoryId: t.String(),
	description: t.Nullable(t.String()),
	address: t.Nullable(t.String()),
	district: t.Nullable(t.String()),
	priceRange: t.Nullable(t.String()),
	views: t.Number(),
	latitude: t.Number(),
	longitude: t.Number(),
	phone: t.Nullable(t.String()),
	openingHours: t.Nullable(t.Any()),
	coverMediaId: t.Nullable(t.String()),
	legalityDocumentMediaId: t.Nullable(t.String()),
	legalityDocumentUrl: t.Nullable(t.String()),
	status: PlaceStatusSchema,
	createdById: t.Nullable(t.String()),
	communityVerified: t.Boolean(),
	ownerVerified: t.Boolean(),
	ratingAvg: t.Number(),
	reviewCount: t.Number(),
	lastReviewAt: t.Nullable(t.String()),
	exploreScore: t.Number(),
	hiddenGemScore: t.Number(),
	createdAt: t.String(),
	updatedAt: t.String(),
	category: t.Object({
		id: t.String(),
		name: t.String(),
		slug: t.String(),
	}),
	createdBy: t.Nullable(
		t.Object({
			id: t.String(),
			name: t.String(),
			email: t.String(),
		}),
	),
});

export const AdminPlacesResponse = t.Object({
	data: t.Array(AdminPlaceItem),
	meta: PaginationMetaSchema,
});

export const AdminPlaceVerificationResponse = t.Object({
	data: t.Object({
		id: t.String(),
		slug: t.String(),
		name: t.String(),
		categoryId: t.String(),
		description: t.Nullable(t.String()),
		address: t.Nullable(t.String()),
		latitude: t.Number(),
		longitude: t.Number(),
		phone: t.Nullable(t.String()),
		openingHours: t.Nullable(t.Any()),
		coverMediaId: t.Nullable(t.String()),
		legalityDocumentMediaId: t.Nullable(t.String()),
		status: PlaceStatusSchema,
		createdById: t.Nullable(t.String()),
		communityVerified: t.Boolean(),
		ownerVerified: t.Boolean(),
		ratingAvg: t.Number(),
		reviewCount: t.Number(),
		lastReviewAt: t.Nullable(t.Date()),
		exploreScore: t.Number(),
		hiddenGemScore: t.Number(),
		createdAt: t.Date(),
		updatedAt: t.Date(),
	}),
});

export const AdminReviewModerationResponse = t.Object({
	data: t.Object({
		id: t.String(),
		placeId: t.String(),
		userId: t.String(),
		rating: t.Integer(),
		body: t.Nullable(t.String()),
		status: ReviewStatusSchema,
		createdAt: t.Date(),
		updatedAt: t.Date(),
	}),
});

export const AdminAnomalyItem = t.Object({
	id: t.String(),
	kind: AnomalyKindSchema,
	status: AnomalyStatusSchema,
	metrics: AnomalyMetricsSchema,
	reason: t.String(),
	resolutionNote: t.Nullable(t.String()),
	resolvedAt: t.Nullable(t.String()),
	createdAt: t.String(),
	place: t.Object({
		id: t.String(),
		slug: t.String(),
		name: t.String(),
	}),
	review: t.Nullable(
		t.Object({
			id: t.String(),
			rating: t.Integer(),
			status: ReviewStatusSchema,
			body: t.Nullable(t.String()),
		}),
	),
	user: t.Nullable(
		t.Object({
			id: t.String(),
			name: t.String(),
			email: t.String(),
		}),
	),
});

export const AdminAnomaliesResponse = t.Object({
	data: t.Array(AdminAnomalyItem),
	meta: PaginationMetaSchema,
});

export const AdminAnomalyResolveResponse = t.Object({
	data: t.Object({
		id: t.String(),
		placeId: t.String(),
		reviewId: t.Nullable(t.String()),
		userId: t.Nullable(t.String()),
		kind: AnomalyKindSchema,
		status: AnomalyStatusSchema,
		metrics: AnomalyMetricsSchema,
		reason: t.String(),
		resolvedById: t.Nullable(t.String()),
		resolvedAt: t.Nullable(t.Date()),
		resolutionNote: t.Nullable(t.String()),
		createdAt: t.Date(),
	}),
});
