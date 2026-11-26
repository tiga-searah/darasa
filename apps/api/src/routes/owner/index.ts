import { Elysia } from "elysia";
import type { Storage } from "../../lib/ports";
import { s3Storage } from "../../lib/storage";
import { requireAuth } from "../../plugins/guard";
import {
	OwnerPlaceParams,
	OwnerPlaceStatsQuery,
	UpdateOwnerPlaceBody,
} from "./model";
import {
	getOwnerPlace,
	getOwnerPlaceStats,
	listOwnerPlaces,
	updateOwnerPlace,
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
	.get("/places", async (ctx) => ({
		data: await listOwnerPlaces(storageOf(ctx), ctx.sessionUser),
	}))
	.get("/places/:id", { params: OwnerPlaceParams }, async (ctx) => ({
		data: await getOwnerPlace(storageOf(ctx), ctx.sessionUser, ctx.params.id),
	}))
	.patch(
		"/places/:id",
		{
			params: OwnerPlaceParams,
			body: UpdateOwnerPlaceBody,
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
		},
		async ({ sessionUser, params, query }) => {
			const days = query.days ? (Number(query.days) as 7 | 30 | 90) : 30;
			return {
				data: await getOwnerPlaceStats(sessionUser, params.id, days),
			};
		},
	);
