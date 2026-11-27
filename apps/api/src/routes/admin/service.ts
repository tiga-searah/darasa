import { and, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import { recomputePlaceStats } from "../../lib/ranking";
import type { SessionUser } from "../../lib/session";
import { conflict, notFound } from "../../utils";
import type {
	AdminAnomaliesQueryType,
	AdminPlacesQueryType,
	ModerateReviewBodyType,
	ResolveAnomalyBodyType,
	UpdateVerificationBodyType,
} from "./model";

export async function listAdminPlaces(query: AdminPlacesQueryType) {
	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const offset = (page - 1) * limit;
	const status = query.status ?? "pending";

	const conditions: SQL[] = [eq(schema.places.status, status)];
	if (query.q?.trim()) {
		conditions.push(ilike(schema.places.name, `%${query.q.trim()}%`));
	}
	const where = and(...conditions);

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: schema.places.id,
				slug: schema.places.slug,
				name: schema.places.name,
				categoryId: schema.places.categoryId,
				description: schema.places.description,
				address: schema.places.address,
				district: schema.places.district,
				priceRange: schema.places.priceRange,
				views: schema.places.viewsTotal,
				latitude: schema.places.latitude,
				longitude: schema.places.longitude,
				phone: schema.places.phone,
				openingHours: schema.places.openingHours,
				coverMediaId: schema.places.coverMediaId,
				status: schema.places.status,
				createdById: schema.places.createdById,
				communityVerified: schema.places.communityVerified,
				ownerVerified: schema.places.ownerVerified,
				ratingAvg: schema.places.ratingAvg,
				reviewCount: schema.places.reviewCount,
				lastReviewAt: schema.places.lastReviewAt,
				exploreScore: schema.places.exploreScore,
				hiddenGemScore: schema.places.hiddenGemScore,
				createdAt: schema.places.createdAt,
				updatedAt: schema.places.updatedAt,
				category: {
					id: schema.categories.id,
					name: schema.categories.name,
					slug: schema.categories.slug,
				},
				createdBy: {
					id: schema.users.id,
					name: schema.users.name,
					email: schema.users.email,
				},
			})
			.from(schema.places)
			.innerJoin(
				schema.categories,
				eq(schema.places.categoryId, schema.categories.id),
			)
			.leftJoin(schema.users, eq(schema.places.createdById, schema.users.id))
			.where(where)
			.orderBy(desc(schema.places.createdAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.places).where(where),
	]);

	const total = totalRows[0]?.total ?? 0;
	return {
		data: rows.map((r) => ({
			...r,
			lastReviewAt: r.lastReviewAt ? r.lastReviewAt.toISOString() : null,
			createdAt: r.createdAt.toISOString(),
			updatedAt: r.updatedAt.toISOString(),
			createdBy: r.createdBy?.id ? r.createdBy : null,
		})),
		meta: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		},
	};
}

export async function updatePlaceVerification(
	placeId: string,
	body: UpdateVerificationBodyType,
) {
	return db.transaction(async (tx) => {
		const [place] = await tx
			.select()
			.from(schema.places)
			.where(eq(schema.places.id, placeId))
			.for("update");
		if (!place) throw notFound("Place");

		if (body.ownerVerified === false) {
			const [approvedClaim] = await tx
				.select({ id: schema.businessClaims.id })
				.from(schema.businessClaims)
				.where(
					and(
						eq(schema.businessClaims.placeId, placeId),
						eq(schema.businessClaims.status, "approved"),
					),
				)
				.limit(1);
			if (approvedClaim) {
				throw conflict(
					"Cannot clear owner verification while an approved claim exists",
				);
			}
		}

		const updates: Partial<typeof schema.places.$inferInsert> = {
			updatedAt: new Date(),
		};
		if (body.communityVerified !== undefined) {
			updates.communityVerified = body.communityVerified;
		}
		if (body.ownerVerified !== undefined) {
			updates.ownerVerified = body.ownerVerified;
		}

		await tx
			.update(schema.places)
			.set(updates)
			.where(eq(schema.places.id, placeId));

		await recomputePlaceStats(tx, placeId);
		const [refreshed] = await tx
			.select()
			.from(schema.places)
			.where(eq(schema.places.id, placeId));
		return refreshed;
	});
}

export async function moderateReview(
	reviewId: string,
	body: ModerateReviewBodyType,
) {
	return db.transaction(async (tx) => {
		const [updated] = await tx
			.update(schema.reviews)
			.set({ status: body.status, updatedAt: new Date() })
			.where(eq(schema.reviews.id, reviewId))
			.returning();
		if (!updated) throw notFound("Review");

		await recomputePlaceStats(tx, updated.placeId);
		return updated;
	});
}

export async function listAnomalies(query: AdminAnomaliesQueryType) {
	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const offset = (page - 1) * limit;
	const status = query.status ?? "open";

	const conditions: SQL[] = [eq(schema.anomalyFlags.status, status)];
	if (query.kind) conditions.push(eq(schema.anomalyFlags.kind, query.kind));
	if (query.placeId) {
		conditions.push(eq(schema.anomalyFlags.placeId, query.placeId));
	}
	const where = and(...conditions);

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: schema.anomalyFlags.id,
				kind: schema.anomalyFlags.kind,
				status: schema.anomalyFlags.status,
				metrics: schema.anomalyFlags.metrics,
				reason: schema.anomalyFlags.reason,
				resolutionNote: schema.anomalyFlags.resolutionNote,
				resolvedAt: schema.anomalyFlags.resolvedAt,
				createdAt: schema.anomalyFlags.createdAt,
				place: {
					id: schema.places.id,
					slug: schema.places.slug,
					name: schema.places.name,
				},
				review: {
					id: schema.reviews.id,
					rating: schema.reviews.rating,
					status: schema.reviews.status,
					body: schema.reviews.body,
				},
				user: {
					id: schema.users.id,
					name: schema.users.name,
					email: schema.users.email,
				},
			})
			.from(schema.anomalyFlags)
			.innerJoin(
				schema.places,
				eq(schema.anomalyFlags.placeId, schema.places.id),
			)
			.leftJoin(
				schema.reviews,
				eq(schema.anomalyFlags.reviewId, schema.reviews.id),
			)
			.leftJoin(schema.users, eq(schema.anomalyFlags.userId, schema.users.id))
			.where(where)
			.orderBy(desc(schema.anomalyFlags.createdAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.anomalyFlags).where(where),
	]);

	const total = totalRows[0]?.total ?? 0;
	return {
		data: rows.map((r) => ({
			...r,
			resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
			createdAt: r.createdAt.toISOString(),
			review: r.review?.id ? r.review : null,
			user: r.user?.id ? r.user : null,
		})),
		meta: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		},
	};
}

export async function resolveAnomaly(
	user: SessionUser,
	flagId: string,
	body: ResolveAnomalyBodyType,
) {
	return db.transaction(async (tx) => {
		const [flag] = await tx
			.select()
			.from(schema.anomalyFlags)
			.where(eq(schema.anomalyFlags.id, flagId))
			.for("update");
		if (!flag) throw notFound("Anomaly flag");
		if (flag.status !== "open") {
			throw conflict("Anomaly flag already resolved");
		}

		const mappedStatus =
			body.status === "cleared"
				? "dismissed"
				: body.status === "flagged_hold"
					? "confirmed"
					: body.status;

		const [updated] = await tx
			.update(schema.anomalyFlags)
			.set({
				status: mappedStatus,
				resolvedById: user.id,
				resolvedAt: new Date(),
				resolutionNote: body.note ?? null,
			})
			.returning();

		return updated;
	});
}
