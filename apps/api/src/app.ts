import { cors } from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
import { env } from "./env";
import { googleClient } from "./lib/google";
import type { GoogleClient, Storage } from "./lib/ports";
import { s3Storage } from "./lib/storage";
import { errorPlugin } from "./plugins/errors";
import { authRoutes } from "./routes/auth";
import { categoryRoutes } from "./routes/categories";
import { mediaRoutes } from "./routes/media";
import { placeRoutes } from "./routes/places";
import { reviewRoutes } from "./routes/reviews";

export type AppDeps = {
	storage?: Storage;
	google?: GoogleClient;
};

export const createApp = (deps: AppDeps = {}) => {
	// `s3Storage()` is lazy (no client until a key is used) so building it here is
	// free; resolving once also stops a fresh adapter — and a fresh 500 — per request.
	// `googleClient()` throws when unconfigured, so it stays behind a getter: only a
	// Google auth request pays for it, and a test that injects a client never does.
	const resolved: AppDeps = {
		storage: deps.storage ?? s3Storage(),
		get google() {
			return deps.google ?? googleClient();
		},
	};

	return new Elysia({ prefix: "/api" })
		.use(cors({ origin: env.webAppUrl, credentials: true }))
		.use(
			openapi({
				path: "/docs",
				documentation: { info: { title: "Darasa API", version: "1.0.0" } },
			}),
		)
		.use(errorPlugin)
		.decorate("deps", resolved)
		.get("/health", () => ({ data: { ok: true } }))
		.use(authRoutes)
		.use(mediaRoutes)
		.use(categoryRoutes)
		.use(placeRoutes)
		.use(reviewRoutes);
};
