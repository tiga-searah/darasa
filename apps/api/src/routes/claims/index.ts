import { Elysia, t } from "elysia";
import type { Storage } from "../../lib/ports";
import { requireAdmin, requireAuth } from "../../plugins/guard";
import {
	AdminClaimsQuery,
	AdminClaimsResponse,
	ApproveClaimBody,
	ClaimResponse,
	MyClaimsResponse,
	RejectClaimBody,
	SubmitClaimBody,
} from "./model";
import {
	approveClaim,
	listAdminClaims,
	listMyClaims,
	rejectClaim,
	submitClaim,
} from "./service";

const storageFrom = (ctx: unknown): Storage | undefined =>
	(ctx as { deps?: { storage?: Storage } }).deps?.storage;

export const claimRoutes = new Elysia()
	.group("", (app) =>
		app
			.use(requireAuth)
			.post(
				"/places/:id/claims",
				{
					params: t.Object({ id: t.String({ format: "uuid" }) }),
					body: SubmitClaimBody,
					response: { 201: ClaimResponse },
				},
				async (ctx) => {
					ctx.set.status = 201;
					return {
						data: await submitClaim(
							ctx.params.id,
							ctx.sessionUser.id,
							ctx.body,
						),
					};
				},
			)
			.get(
				"/claims/mine",
				{ response: { 200: MyClaimsResponse } },
				async (ctx) => ({
					data: await listMyClaims(storageFrom(ctx), ctx.sessionUser.id),
				}),
			),
	)
	.group("", (app) =>
		app
			.use(requireAdmin)
			.get(
				"/admin/claims",
				{
					query: AdminClaimsQuery,
					response: { 200: AdminClaimsResponse },
				},
				async (ctx) => listAdminClaims(storageFrom(ctx), ctx.query),
			)
			.post(
				"/admin/claims/:id/approve",
				{
					params: t.Object({ id: t.String({ format: "uuid" }) }),
					body: ApproveClaimBody,
					response: { 200: ClaimResponse },
				},
				async (ctx) => ({
					data: await approveClaim(ctx.params.id, ctx.sessionUser.id, ctx.body),
				}),
			)
			.post(
				"/admin/claims/:id/reject",
				{
					params: t.Object({ id: t.String({ format: "uuid" }) }),
					body: RejectClaimBody,
					response: { 200: ClaimResponse },
				},
				async (ctx) => ({
					data: await rejectClaim(ctx.params.id, ctx.sessionUser.id, ctx.body),
				}),
			),
	);
