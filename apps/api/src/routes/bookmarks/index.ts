import { Elysia, t } from "elysia";
import type { Storage } from "../../lib/ports";
import { requireAuth } from "../../plugins/guard";
import { PaginatedPlacesResponse } from "../places/model";
import { BookmarkListQuery, BookmarkToggleResponse } from "./model";
import { addBookmark, listBookmarks, removeBookmark } from "./service";

const storageFrom = (ctx: unknown): Storage | undefined =>
	(ctx as { deps?: { storage?: Storage } }).deps?.storage;

export const bookmarkRoutes = new Elysia()
	.use(requireAuth)
	.get(
		"/bookmarks",
		{
			query: BookmarkListQuery,
			response: { 200: PaginatedPlacesResponse },
		},
		async (ctx) => listBookmarks(storageFrom(ctx), ctx.query, ctx.sessionUser),
	)
	.post(
		"/places/:id/bookmark",
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			response: { 200: BookmarkToggleResponse },
		},
		async ({ params, sessionUser }) => ({
			data: await addBookmark(params.id, sessionUser),
		}),
	)
	.delete(
		"/places/:id/bookmark",
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			response: { 200: BookmarkToggleResponse },
		},
		async ({ params, sessionUser }) => ({
			data: await removeBookmark(params.id, sessionUser),
		}),
	);
