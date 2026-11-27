import { Elysia, t } from "elysia";
import type { Storage } from "../../lib/ports";
import { optionalAuth, requireAdmin, requireAuth } from "../../plugins/guard";
import {
	AddPlacePhotosBody,
	AddPlacePhotosResponse,
	AdminUpdatePlaceBody,
	CreatePlaceBody,
	HiddenGemsQuery,
	PaginatedPlacesResponse,
	PlaceDetailResponse,
	PlaceListQuery,
} from "./model";
import {
	addPlacePhotos,
	adminArchivePlace,
	adminUpdatePlace,
	createPlace,
	deletePlacePhoto,
	getPlaceDetail,
	listHiddenGems,
	listPlaces,
	recordPlaceView,
} from "./service";

const storageFrom = (ctx: unknown): Storage | undefined =>
	(ctx as { deps?: { storage?: Storage } }).deps?.storage;

export const placeRoutes = new Elysia({ prefix: "/places" })
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
	)
	.group("", (app) =>
		app
			.use(optionalAuth)
			.get(
				"/",
				{
					query: PlaceListQuery,
					response: { 200: PaginatedPlacesResponse },
				},
				async (ctx) => listPlaces(storageFrom(ctx), ctx.query, ctx.sessionUser),
			)
			.get(
				"/hidden-gems",
				{
					query: HiddenGemsQuery,
					response: { 200: PaginatedPlacesResponse },
				},
				async (ctx) =>
					listHiddenGems(storageFrom(ctx), ctx.query, ctx.sessionUser),
			)
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
			),
	)
	.use(requireAuth)
	.post(
		"/",
		{
			body: CreatePlaceBody,
			response: { 201: PlaceDetailResponse },
		},
		async (ctx) => {
			ctx.set.status = 201;
			return {
				data: await createPlace(storageFrom(ctx), ctx.sessionUser, ctx.body),
			};
		},
	)
	.post(
		"/:id/photos",
		{
			params: t.Object({ id: t.String() }),
			body: AddPlacePhotosBody,
			response: { 201: AddPlacePhotosResponse },
		},
		async (ctx) => {
			ctx.set.status = 201;
			return {
				data: await addPlacePhotos(
					storageFrom(ctx),
					ctx.sessionUser,
					ctx.params.id,
					ctx.body.photoMediaIds,
				),
			};
		},
	)
	.delete(
		"/:id/photos/:photoId",
		{
			params: t.Object({ id: t.String(), photoId: t.String() }),
		},
		async (ctx) => {
			await deletePlacePhoto(
				ctx.sessionUser,
				ctx.params.id,
				ctx.params.photoId,
			);
			ctx.set.status = 204;
			return;
		},
	)
	.group("", (g) =>
		g
			.use(requireAdmin)
			.patch(
				"/:id",
				{
					params: t.Object({ id: t.String({ format: "uuid" }) }),
					body: AdminUpdatePlaceBody,
					response: { 200: PlaceDetailResponse },
				},
				async (ctx) => ({
					data: await adminUpdatePlace(
						storageFrom(ctx),
						ctx.sessionUser,
						ctx.params.id,
						ctx.body,
					),
				}),
			)
			.delete(
				"/:id",
				{
					params: t.Object({ id: t.String({ format: "uuid" }) }),
				},
				async ({ params, set }) => {
					await adminArchivePlace(params.id);
					set.status = 204;
				},
			),
	);
