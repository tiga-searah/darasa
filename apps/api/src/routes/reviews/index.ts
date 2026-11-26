import { Elysia, t } from "elysia";
import type { Storage } from "../../lib/ports";
import { optionalAuth, requireAuth } from "../../plugins/guard";
import {
	CreateReviewBody,
	PaginatedReviewsResponse,
	ReviewListQuery,
	ReviewResponse,
	UpdateReviewBody,
} from "./model";
import {
	createReview,
	deleteReview,
	listPlaceReviews,
	updateReview,
} from "./service";

const storageFrom = (ctx: unknown): Storage | undefined =>
	(ctx as { deps?: { storage?: Storage } }).deps?.storage;

export const reviewRoutes = new Elysia()
	.use(optionalAuth)
	.get(
		"/places/:id/reviews",
		{
			params: t.Object({ id: t.String() }),
			query: ReviewListQuery,
			response: { 200: PaginatedReviewsResponse },
		},
		async (ctx) =>
			listPlaceReviews(
				storageFrom(ctx),
				ctx.params.id,
				ctx.query,
				ctx.sessionUser,
			),
	)
	.use(requireAuth)
	.post(
		"/places/:id/reviews",
		{
			params: t.Object({ id: t.String() }),
			body: CreateReviewBody,
			response: { 201: ReviewResponse },
		},
		async (ctx) => {
			ctx.set.status = 201;
			return {
				data: await createReview(
					storageFrom(ctx),
					ctx.params.id,
					ctx.sessionUser,
					ctx.body,
				),
			};
		},
	)
	.patch(
		"/reviews/:id",
		{
			params: t.Object({ id: t.String() }),
			body: UpdateReviewBody,
			response: { 200: ReviewResponse },
		},
		async (ctx) => ({
			data: await updateReview(
				storageFrom(ctx),
				ctx.params.id,
				ctx.sessionUser,
				ctx.body,
			),
		}),
	)
	.delete(
		"/reviews/:id",
		{
			params: t.Object({ id: t.String() }),
		},
		async ({ params, sessionUser, set }) => {
			await deleteReview(params.id, sessionUser);
			set.status = 204;
			return null;
		},
	);
