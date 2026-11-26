import { and, count, eq } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import type { Storage } from "../../lib/ports";
import { recomputePlaceStats } from "../../lib/ranking";
import { conflict, isUniqueViolation, notFound } from "../../utils";
import { assertOwnedReadyMedia, resolveMediaUrl } from "../media/service";

export async function submitClaim(
	placeId: string,
	userId: string,
	body: {
		evidence: {
			note: string;
			documentMediaIds: string[];
			contactPhone: string;
		};
	},
) {
	return db.transaction(async (tx) => {
		const [place] = await tx
			.select({ id: schema.places.id, status: schema.places.status })
			.from(schema.places)
			.where(eq(schema.places.id, placeId));

		if (place?.status !== "published") {
			throw notFound("Place");
		}

		if (body.evidence.documentMediaIds.length > 0) {
			await assertOwnedReadyMedia(
				tx,
				userId,
				body.evidence.documentMediaIds,
				"claim_document",
			);
		}

		try {
			const [claim] = await tx
				.insert(schema.businessClaims)
				.values({
					placeId,
					claimantId: userId,
					evidence: body.evidence,
				})
				.returning();
			return claim;
		} catch (error) {
			if (isUniqueViolation(error)) {
				throw conflict("An active claim already exists for this place");
			}
			throw error;
		}
	});
}

export async function listMyClaims(
	storage: Storage | undefined,
	userId: string,
) {
	const rows = await db.query.businessClaims.findMany({
		where: { claimantId: userId },
		orderBy: { createdAt: "desc" },
		with: {
			place: {
				columns: { id: true, slug: true, name: true },
				with: { coverMedia: true },
			},
		},
	});

	return rows.map((row) => ({
		id: row.id,
		placeId: row.placeId,
		status: row.status,
		evidence: row.evidence,
		decisionNote: row.decisionNote,
		reviewedAt: row.reviewedAt,
		createdAt: row.createdAt,
		place: row.place
			? {
					id: row.place.id,
					slug: row.place.slug,
					name: row.place.name,
					coverUrl:
						row.place.coverMedia && storage
							? resolveMediaUrl(storage, row.place.coverMedia.key)
							: null,
				}
			: null,
	}));
}

export async function listAdminClaims(query: {
	status?: "pending" | "approved" | "rejected";
	page?: number;
	limit?: number;
}) {
	const status = query.status ?? "pending";
	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const offset = (page - 1) * limit;

	const [rows, [{ total }]] = await Promise.all([
		db.query.businessClaims.findMany({
			where: { status },
			orderBy: { createdAt: "desc" },
			limit,
			offset,
			with: {
				claimant: { columns: { id: true, name: true, email: true } },
				place: { columns: { id: true, slug: true, name: true } },
			},
		}),
		db
			.select({ total: count() })
			.from(schema.businessClaims)
			.where(eq(schema.businessClaims.status, status)),
	]);

	return {
		data: rows,
		meta: { page, limit, total },
	};
}

export async function approveClaim(
	claimId: string,
	adminId: string,
	body: { note?: string },
) {
	return db.transaction(async (tx) => {
		const [claim] = await tx
			.select()
			.from(schema.businessClaims)
			.where(eq(schema.businessClaims.id, claimId));

		if (!claim) {
			throw notFound("Claim");
		}
		if (claim.status !== "pending") {
			throw conflict("Claim is not pending");
		}

		const [updated] = await tx
			.update(schema.businessClaims)
			.set({
				status: "approved",
				reviewedById: adminId,
				reviewedAt: new Date(),
				decisionNote: body.note ?? null,
			})
			.where(eq(schema.businessClaims.id, claimId))
			.returning();

		await tx
			.update(schema.places)
			.set({ ownerVerified: true })
			.where(eq(schema.places.id, claim.placeId));

		await recomputePlaceStats(tx, claim.placeId);

		await tx
			.update(schema.users)
			.set({ role: "owner" })
			.where(
				and(
					eq(schema.users.id, claim.claimantId),
					eq(schema.users.role, "user"),
				),
			);

		return updated;
	});
}

export async function rejectClaim(
	claimId: string,
	adminId: string,
	body: { note: string },
) {
	return db.transaction(async (tx) => {
		const [claim] = await tx
			.select()
			.from(schema.businessClaims)
			.where(eq(schema.businessClaims.id, claimId));

		if (!claim) {
			throw notFound("Claim");
		}
		if (claim.status !== "pending") {
			throw conflict("Claim is not pending");
		}

		const [updated] = await tx
			.update(schema.businessClaims)
			.set({
				status: "rejected",
				reviewedById: adminId,
				reviewedAt: new Date(),
				decisionNote: body.note,
			})
			.where(eq(schema.businessClaims.id, claimId))
			.returning();

		return updated;
	});
}
