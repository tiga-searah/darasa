import { t } from "elysia";

export const ReviewListQuery = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50, default: 20 })),
	sort: t.Optional(
		t.Union([t.Literal("recent"), t.Literal("highest"), t.Literal("lowest")]),
	),
	withPhotos: t.Optional(t.BooleanString()),
});

export const CreateReviewBody = t.Object({
	rating: t.Integer({ minimum: 1, maximum: 5 }),
	body: t.Optional(t.String({ maxLength: 4000 })),
	photoMediaIds: t.Optional(t.Array(t.String(), { maxItems: 5 })),
});

export const UpdateReviewBody = t.Object({
	rating: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
	body: t.Optional(t.Union([t.String({ maxLength: 4000 }), t.Null()])),
	photoMediaIds: t.Optional(t.Array(t.String(), { maxItems: 5 })),
});

export const ReviewPhotoSchema = t.Object({
	id: t.String(),
	url: t.String(),
});

export const ReviewUserSchema = t.Object({
	id: t.String(),
	name: t.String(),
	avatarUrl: t.Nullable(t.String()),
});

export const OwnerReplySchema = t.Object({
	id: t.String(),
	body: t.String(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export const ReviewItem = t.Object({
	id: t.String(),
	placeId: t.String(),
	rating: t.Integer(),
	body: t.Nullable(t.String()),
	createdAt: t.Date(),
	updatedAt: t.Date(),
	user: ReviewUserSchema,
	photos: t.Array(ReviewPhotoSchema),
	ownerReply: t.Nullable(OwnerReplySchema),
	mine: t.Boolean(),
});

export const ReviewResponse = t.Object({
	data: ReviewItem,
});

export const PaginatedReviewsResponse = t.Object({
	data: t.Array(ReviewItem),
	meta: t.Object({
		page: t.Number(),
		limit: t.Number(),
		total: t.Number(),
		totalPages: t.Number(),
	}),
});
