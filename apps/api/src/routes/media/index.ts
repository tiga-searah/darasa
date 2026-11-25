import { Elysia, t } from "elysia";
import type { Storage } from "../../lib/ports";
import type { SessionUser } from "../../lib/session";
import { requireAuth } from "../../plugins/guard";
import {
	CommitResponse,
	UploadBody,
	UploadResponse,
	UrlResponse,
} from "./model";
import {
	beginUpload,
	commitUpload,
	deleteUpload,
	getMediaUrl,
} from "./service";

/**
 * `deps` is decorated on the root app and resolved there, so the child plugin only
 * has to read it; a per-request fallback would rebuild the S3 adapter every time.
 */
const storageFrom = (ctx: unknown): Storage => {
	const storage = (ctx as { deps?: { storage?: Storage } }).deps?.storage;
	if (!storage) throw new Error("Storage dependency is missing");
	return storage;
};

export const mediaRoutes = new Elysia({ prefix: "/media" }).group("", (app) =>
	app
		.use(requireAuth)
		.post(
			"/uploads",
			{
				body: UploadBody,
				response: { 201: t.Object({ data: UploadResponse }) },
			},
			async (ctx) => {
				ctx.set.status = 201;
				return {
					data: await beginUpload(storageFrom(ctx), {
						userId: (ctx.sessionUser as SessionUser).id,
						...ctx.body,
					}),
				};
			},
		)
		.post(
			"/:id/commit",
			{
				params: t.Object({ id: t.String({ format: "uuid" }) }),
				response: { 200: t.Object({ data: CommitResponse }) },
			},
			async (ctx) => ({
				data: await commitUpload(storageFrom(ctx), {
					userId: (ctx.sessionUser as SessionUser).id,
					id: ctx.params.id,
				}),
			}),
		)
		.get(
			"/:id/url",
			{
				params: t.Object({ id: t.String({ format: "uuid" }) }),
				response: { 200: t.Object({ data: UrlResponse }) },
			},
			async (ctx) => ({
				data: await getMediaUrl(storageFrom(ctx), {
					userId: (ctx.sessionUser as SessionUser).id,
					id: ctx.params.id,
				}),
			}),
		)
		.delete(
			"/:id",
			{ params: t.Object({ id: t.String({ format: "uuid" }) }) },
			async (ctx) => {
				const user = ctx.sessionUser as SessionUser;
				await deleteUpload(storageFrom(ctx), {
					userId: user.id,
					isAdmin: user.role === "admin",
					id: ctx.params.id,
				});
				return new Response(null, { status: 204 });
			},
		),
);
