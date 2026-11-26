import { Elysia, t } from "elysia";
import { requireAdmin } from "../../plugins/guard";
import {
	AdminAnomaliesQuery,
	AdminPlacesQuery,
	ModerateReviewBody,
	ResolveAnomalyBody,
	UpdateVerificationBody,
} from "./model";
import {
	listAdminPlaces,
	listAnomalies,
	moderateReview,
	resolveAnomaly,
	updatePlaceVerification,
} from "./service";

export const adminRoutes = new Elysia({ prefix: "/admin" })
	.use(requireAdmin)
	.get("/places", { query: AdminPlacesQuery }, async ({ query }) =>
		listAdminPlaces(query),
	)
	.patch(
		"/places/:id/verification",
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			body: UpdateVerificationBody,
		},
		async ({ params, body }) => ({
			data: await updatePlaceVerification(params.id, body),
		}),
	)
	.patch(
		"/reviews/:id",
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			body: ModerateReviewBody,
		},
		async ({ params, body }) => ({
			data: await moderateReview(params.id, body),
		}),
	)
	.get("/anomalies", { query: AdminAnomaliesQuery }, async ({ query }) =>
		listAnomalies(query),
	)
	.post(
		"/anomalies/:id/resolve",
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			body: ResolveAnomalyBody,
		},
		async ({ sessionUser, params, body }) => ({
			data: await resolveAnomaly(sessionUser, params.id, body),
		}),
	);
