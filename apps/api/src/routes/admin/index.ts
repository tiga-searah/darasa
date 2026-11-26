import { Elysia, t } from "elysia";
import { requireAdmin } from "../../plugins/guard";
import {
	AdminAnomaliesQuery,
	AdminAnomaliesResponse,
	AdminAnomalyResolveResponse,
	AdminPlacesQuery,
	AdminPlacesResponse,
	AdminPlaceVerificationResponse,
	AdminReviewModerationResponse,
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
	.get(
		"/places",
		{
			query: AdminPlacesQuery,
			response: { 200: AdminPlacesResponse },
		},
		async ({ query }) => listAdminPlaces(query),
	)
	.patch(
		"/places/:id/verification",
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			body: UpdateVerificationBody,
			response: { 200: AdminPlaceVerificationResponse },
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
			response: { 200: AdminReviewModerationResponse },
		},
		async ({ params, body }) => ({
			data: await moderateReview(params.id, body),
		}),
	)
	.get(
		"/anomalies",
		{
			query: AdminAnomaliesQuery,
			response: { 200: AdminAnomaliesResponse },
		},
		async ({ query }) => listAnomalies(query),
	)
	.post(
		"/anomalies/:id/resolve",
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			body: ResolveAnomalyBody,
			response: { 200: AdminAnomalyResolveResponse },
		},
		async ({ sessionUser, params, body }) => ({
			data: await resolveAnomaly(sessionUser, params.id, body),
		}),
	);
