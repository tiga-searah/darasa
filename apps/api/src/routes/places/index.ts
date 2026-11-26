import { Elysia, t } from "elysia";
import type { Storage } from "../../lib/ports";
import { optionalAuth } from "../../plugins/guard";
import {
	HiddenGemsQuery,
	PaginatedPlacesResponse,
	PlaceDetailResponse,
	PlaceListQuery,
} from "./model";
import {
	getPlaceDetail,
	listHiddenGems,
	listPlaces,
	recordPlaceView,
} from "./service";

const storageFrom = (ctx: unknown): Storage | undefined =>
	(ctx as { deps?: { storage?: Storage } }).deps?.storage;

export const placeRoutes = new Elysia({ prefix: "/places" })
	.get(
		"/",
		{
			query: PlaceListQuery,
			response: { 200: PaginatedPlacesResponse },
		},
		async (ctx) => listPlaces(storageFrom(ctx), ctx.query),
	)
	.get(
		"/hidden-gems",
		{
			query: HiddenGemsQuery,
			response: { 200: PaginatedPlacesResponse },
		},
		async (ctx) => listHiddenGems(storageFrom(ctx), ctx.query),
	)
	.use(optionalAuth)
	.get(
		"/:slug",
		{
			params: t.Object({ slug: t.String() }),
			response: { 200: PlaceDetailResponse },
		},
		async (ctx) => ({
			data: await getPlaceDetail(
				storageFrom(ctx),
				ctx.params.slug,
				ctx.sessionUser,
			),
		}),
	)
	.post(
		"/:id/view",
		{
			params: t.Object({ id: t.String() }),
		},
		async ({ params, set }) => {
			await recordPlaceView(params.id);
			set.status = 204;
			return;
		},
	);
