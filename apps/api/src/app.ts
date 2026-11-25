import { cors } from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
import { env } from "./env";
import type { GoogleClient, Storage } from "./lib/ports";
import { errorPlugin } from "./plugins/errors";
import { authRoutes } from "./routes/auth";

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
		.use(authRoutes);
