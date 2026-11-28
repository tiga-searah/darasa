import { Elysia } from "elysia";
import { requireAuth } from "../../plugins/guard";
import { ContributionsResponse } from "./model";
import { getMyContributions } from "./service";

export const contributionRoutes = new Elysia()
	.use(requireAuth)
	.get(
		"/me/contributions",
		{ response: { 200: ContributionsResponse } },
		async ({ sessionUser }) => ({
			data: await getMyContributions(sessionUser.id),
		}),
	);
