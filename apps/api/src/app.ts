import { cors } from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { Elysia, t } from "elysia";
import { env } from "./env";
import type { GoogleClient, Storage } from "./lib/ports";
import { errorPlugin } from "./plugins/errors";
import { ApiError } from "./utils";

export type AppDeps = {
	storage?: Storage;
	google?: GoogleClient;
};

export const createApp = (deps: AppDeps = {}) =>
	new Elysia({ prefix: "/api" })
		.use(cors({ origin: env.webAppUrl, credentials: true }))
		.use(
			openapi({
				path: "/docs",
				documentation: { info: { title: "Darasa API", version: "1.0.0" } },
			}),
		)
		.use(errorPlugin)
		.decorate("deps", deps)
		.get("/health", () => ({ data: { ok: true } }))
		// ponytail: temporary routes proving validation + ApiError mapping; delete in Task 2.
		.post("/echo", { body: t.Object({ n: t.Number() }) }, ({ body }) => ({
			data: body,
		}))
		.get("/boom", () => {
			throw new ApiError("CONFLICT", 409, "Already reviewed");
		});
