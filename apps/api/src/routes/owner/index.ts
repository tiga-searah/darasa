import { Elysia } from "elysia";
import type { Storage } from "../../lib/ports";
import { s3Storage } from "../../lib/storage";
import { requireAuth } from "../../plugins/guard";
import { PlaceDetailResponse } from "../places/model";
import { PaginatedReviewsResponse } from "../reviews/model";
import {
	OwnerPlaceParams,
	OwnerPlaceStatsQuery,
	OwnerPlaceStatsResponse,
	OwnerPlacesListResponse,
	OwnerReplyResponse,
	OwnerReviewsQuery,
	UpdateOwnerPlaceBody,
	UpsertReplyBody,
} from "./model";
import {
	deleteOwnerReply,
	getOwnerPlace,
	getOwnerPlaceStats,
	listOwnerPlaces,
	listOwnerReviews,
	updateOwnerPlace,
	upsertOwnerReply,
} from "./service";

const storageOf = (ctx: object): Storage => {
	if (
		"deps" in ctx &&
		ctx.deps &&
		typeof ctx.deps === "object" &&
		"storage" in ctx.deps &&
		ctx.deps.storage
	) {
		return ctx.deps.storage as Storage;
	}
	return s3Storage();
};

export const ownerRoutes = new Elysia({ prefix: "/owner" })
	.use(requireAuth)
	.get(
		"/places",
		{
			response: { 200: OwnerPlacesListResponse },
		},
		async (ctx) => ({
			data: await listOwnerPlaces(storageOf(ctx), ctx.sessionUser),
		}),
	)
	.get(
		"/places/:id",
		{
			params: OwnerPlaceParams,
			response: { 200: PlaceDetailResponse },
		},
		async (ctx) => ({
			data: await getOwnerPlace(storageOf(ctx), ctx.sessionUser, ctx.params.id),
		}),
	)
	.patch(
		"/places/:id",
		{
			params: OwnerPlaceParams,
			body: UpdateOwnerPlaceBody,
			response: { 200: PlaceDetailResponse },
		},
		async (ctx) => ({
			data: await updateOwnerPlace(
				storageOf(ctx),
				ctx.sessionUser,
				ctx.params.id,
				ctx.body,
			),
		}),
	)
	.get(
		"/places/:id/stats",
		{
			params: OwnerPlaceParams,
			query: OwnerPlaceStatsQuery,
			response: { 200: OwnerPlaceStatsResponse },
		},
		async ({ sessionUser, params, query }) => {
			const days = query.days ? (Number(query.days) as 7 | 30 | 90) : 30;
			return {
				data: await getOwnerPlaceStats(sessionUser, params.id, days),
			};
		},
	)
	.get(
		"/places/:id/reviews",
		{
			params: OwnerPlaceParams,
			query: OwnerReviewsQuery,
			response: { 200: PaginatedReviewsResponse },
		},
		async (ctx) =>
			listOwnerReviews(
				storageOf(ctx),
				ctx.sessionUser,
				ctx.params.id,
				ctx.query,
			),
	)
	.put(
		"/reviews/:id/reply",
		{
			params: OwnerPlaceParams,
			body: UpsertReplyBody,
			response: { 200: OwnerReplyResponse, 201: OwnerReplyResponse },
		},
		async ({ sessionUser, params, body, set }) => {
			const result = await upsertOwnerReply(sessionUser, params.id, body.body);
			set.status = result.created ? 201 : 200;
			return { data: result.data };
		},
	)
	.delete(
		"/reviews/:id/reply",
		{
			params: OwnerPlaceParams,
		},
		async ({ sessionUser, params, set }) => {
			await deleteOwnerReply(sessionUser, params.id);
			set.status = 204;
		},
	);
