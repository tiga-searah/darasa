import { and, count, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import type { Storage } from "../../lib/ports";
import { type DbOrTx, recomputePlaceStats } from "../../lib/ranking";
import {
	conflict,
	isUniqueViolation,
	notFound,
	paginationMeta,
} from "../../utils";
import {
	assertOwnedReadyMedia,
	resolveMediaUrl,
	resolveMediaUrlMap,
} from "../media/service";

export async function submitClaim(
	placeId: string,
	userId: string,
	body: {
		evidence: {
			note: string;
			documentMediaIds: string[];
			contactPhone: string;
			businessRole?: string;
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
			claimant: { columns: { name: true } },
			place: {
				columns: { id: true, slug: true, name: true },
				with: { coverMedia: true },
			},
		},
	});

	return Promise.all(
		rows.map(async (row) => ({
			id: row.id,
			placeId: row.placeId,
			placeName: row.place?.name ?? "",
			claimantName: row.claimant?.name ?? "",
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
								? await resolveMediaUrl(storage, row.place.coverMedia.key)
								: null,
					}
				: null,
		})),
	);
}

export async function listAdminClaims(
	storage: Storage | undefined,
	query: {
		status?: "all" | "pending" | "approved" | "rejected";
		q?: string;
		page?: number;
		limit?: number;
	},
) {
	const status = query.status ?? "pending";
	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [];
	if (status !== "all") {
		conditions.push(eq(schema.businessClaims.status, status));
	}
	if (query.q?.trim()) {
		const q = `%${query.q.trim()}%`;
		conditions.push(
			or(
				ilike(schema.users.name, q),
				ilike(schema.users.email, q),
				ilike(schema.places.name, q),
				ilike(sql`${schema.businessClaims.evidence}->>'note'`, q),
				ilike(sql`${schema.businessClaims.evidence}->>'businessRole'`, q),
			)!,
		);
	}
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: schema.businessClaims.id,
				placeId: schema.businessClaims.placeId,
				claimantId: schema.businessClaims.claimantId,
				status: schema.businessClaims.status,
				evidence: schema.businessClaims.evidence,
				reviewedById: schema.businessClaims.reviewedById,
				reviewedAt: schema.businessClaims.reviewedAt,
				decisionNote: schema.businessClaims.decisionNote,
				createdAt: schema.businessClaims.createdAt,
				updatedAt: schema.businessClaims.updatedAt,
				claimant: {
					id: schema.users.id,
					name: schema.users.name,
					email: schema.users.email,
				},
				place: {
					id: schema.places.id,
					slug: schema.places.slug,
					name: schema.places.name,
				},
			})
			.from(schema.businessClaims)
			.leftJoin(
				schema.users,
				eq(schema.businessClaims.claimantId, schema.users.id),
			)
			.leftJoin(
				schema.places,
				eq(schema.businessClaims.placeId, schema.places.id),
			)
			.where(where)
			.orderBy(desc(schema.businessClaims.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.businessClaims)
			.leftJoin(
				schema.users,
				eq(schema.businessClaims.claimantId, schema.users.id),
			)
			.leftJoin(
				schema.places,
				eq(schema.businessClaims.placeId, schema.places.id),
			)
			.where(where),
	]);

	const allDocIds = rows.flatMap((r) => r.evidence.documentMediaIds);
	const docUrlMap = await resolveMediaUrlMap(storage, allDocIds);

	const total = totalRows[0]?.total ?? 0;
	return {
		data: rows.map((r) => ({
			...r,
			claimant: r.claimant?.id ? r.claimant : null,
			place: r.place?.id ? r.place : null,
			documentUrls: r.evidence.documentMediaIds
				.map((id) => docUrlMap.get(id))
				.filter((u): u is string => Boolean(u)),
		})),
		meta: paginationMeta(page, limit, total),
	};
}

async function resolvePendingClaim(
	tx: DbOrTx,
	claimId: string,
	adminId: string,
	status: "approved" | "rejected",
	note?: string,
) {
	const [claim] = await tx
		.select()
		.from(schema.businessClaims)
		.where(eq(schema.businessClaims.id, claimId))
		.for("update");

	if (!claim) throw notFound("Claim");
	if (claim.status !== "pending") throw conflict("Claim is not pending");

	const [updated] = await tx
		.update(schema.businessClaims)
		.set({
			status,
			reviewedById: adminId,
			reviewedAt: new Date(),
			decisionNote: note ?? null,
		})
		.where(eq(schema.businessClaims.id, claimId))
		.returning();

	return updated;
}

export async function approveClaim(
	claimId: string,
	adminId: string,
	body: { note?: string },
) {
	return db.transaction(async (tx) => {
		const updated = await resolvePendingClaim(
			tx,
			claimId,
			adminId,
			"approved",
			body.note,
		);

		await tx
			.update(schema.places)
			.set({ ownerVerified: true })
			.where(eq(schema.places.id, updated.placeId));

		await recomputePlaceStats(tx, updated.placeId);

		await tx
			.update(schema.users)
			.set({ role: "owner" })
			.where(
				and(
					eq(schema.users.id, updated.claimantId),
					eq(schema.users.role, "user"),
				),
			);

		return updated;
	});
}

export async function rejectClaim(
	claimId: string,
	adminId: string,
	body: { note?: string },
) {
	return db.transaction(async (tx) =>
		resolvePendingClaim(tx, claimId, adminId, "rejected", body.note),
	);
}
