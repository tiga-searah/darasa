import { Elysia } from "elysia";
import { CategoryListResponse } from "./model";
import { listCategories } from "./service";

export const categoryRoutes = new Elysia({ prefix: "/categories" }).get(
	"/",
	{ response: { 200: CategoryListResponse } },
	async () => ({ data: await listCategories() }),
);
