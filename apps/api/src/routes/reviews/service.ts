import { and, asc, count, desc, eq, exists, gte, inArray } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import { evaluateReviewAnomalies } from "../../lib/anomaly";
import type { Storage } from "../../lib/ports";
import { type DbOrTx, recomputePlaceStats } from "../../lib/ranking";

type SessionUser = { id: string; role?: string };

import {
	ApiError,
	conflict,
	forbidden,
	isUniqueViolation,
	notFound,
} from "../../utils";
import { assertOwnedReadyMedia, resolveMediaUrl } from "../media/service";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function hydrateReviews(
	tx: DbOrTx,
	storage: Storage | undefined,
	rows: Array<typeof schema.reviews.$inferSelect>,
	viewerId?: string,
) {
	if (rows.length === 0) return [];

	const reviewIds = rows.map((r) => r.id);
	const userIds = [...new Set(rows.map((r) => r.userId))];

	const [users, photos, replies] = await Promise.all([
		tx
			.select({
				id: schema.users.id,
				name: schema.users.name,
				avatarUrl: schema.users.avatarUrl,
			})
			.from(schema.users)
			.where(inArray(schema.users.id, userIds)),
		tx
			.select({
				id: schema.reviewPhotos.id,
				reviewId: schema.reviewPhotos.reviewId,
				key: schema.media.key,
			})
			.from(schema.reviewPhotos)
			.innerJoin(schema.media, eq(schema.reviewPhotos.mediaId, schema.media.id))
			.where(inArray(schema.reviewPhotos.reviewId, reviewIds)),
		tx
			.select({
				id: schema.ownerReplies.id,
				reviewId: schema.ownerReplies.reviewId,
				body: schema.ownerReplies.body,
				createdAt: schema.ownerReplies.createdAt,
				updatedAt: schema.ownerReplies.updatedAt,
				authorName: schema.users.name,
			})
			.from(schema.ownerReplies)
			.where(inArray(schema.ownerReplies.reviewId, reviewIds)),
	]);

	const userMap = new Map(users.map((u) => [u.id, u]));
	const replyMap = new Map(
		replies.map((rep) => [
			rep.reviewId,
			{
				id: rep.id,
				authorName: rep.authorName,
				body: rep.body,
				createdAt: rep.createdAt,
				updatedAt: rep.updatedAt,
			},
		]),
	);

	const photosByReview = new Map<string, Array<{ id: string; url: string }>>();
	for (const p of photos) {
		const url = storage ? await resolveMediaUrl(storage, p.key) : p.key;
		const list = photosByReview.get(p.reviewId) ?? [];
		list.push({ id: p.id, url });
		photosByReview.set(p.reviewId, list);
	}
	return rows.map((r) => {
		const u = userMap.get(r.userId);
		return {
			id: r.id,
			placeId: r.placeId,
			rating: r.rating,
			body: r.body,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
			user: {
				id: r.userId,
				name: u?.name ?? "User",
				avatarUrl: u?.avatarUrl ?? null,
			},
			photos: photosByReview.get(r.id) ?? [],
			ownerReply: replyMap.get(r.id) ?? null,
			mine: viewerId === r.userId,
		};
	});
}

export async function listPlaceReviews(
	storage: Storage | undefined,
	placeId: string,
	query: {
		page?: number;
		limit?: number;
		sort?: "recent" | "highest" | "lowest";
		withPhotos?: boolean;
	},
	viewer?: SessionUser | null,
) {
	const place = await db.query.places.findFirst({
		where: { id: placeId, status: "published" },
	});
	if (!place) throw notFound("Place");

	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const offset = (page - 1) * limit;

	const conditions = [
		eq(schema.reviews.placeId, placeId),
		eq(schema.reviews.status, "published"),
	];

	if (query.withPhotos) {
		conditions.push(
			exists(
				db
					.select({ id: schema.reviewPhotos.id })
					.from(schema.reviewPhotos)
					.where(eq(schema.reviewPhotos.reviewId, schema.reviews.id)),
			),
		);
	}

	const whereClause = and(...conditions);

	const orderBy =
		query.sort === "highest"
			? [desc(schema.reviews.rating), desc(schema.reviews.createdAt)]
			: query.sort === "lowest"
				? [asc(schema.reviews.rating), desc(schema.reviews.createdAt)]
				: [desc(schema.reviews.createdAt)];

	const [[totalRow], rows] = await Promise.all([
		db.select({ total: count() }).from(schema.reviews).where(whereClause),
		db
			.select()
			.from(schema.reviews)
			.where(whereClause)
			.orderBy(...orderBy)
			.limit(limit)
			.offset(offset),
	]);

	const total = totalRow?.total ?? 0;
	const data = await hydrateReviews(db, storage, rows, viewer?.id);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		},
	};
}

export async function createReview(
	storage: Storage | undefined,
	placeId: string,
	user: SessionUser,
	input: {
		rating: number;
		body?: string;
		photoMediaIds?: string[];
	},
) {
	const place = await db.query.places.findFirst({
		where: { id: placeId, status: "published" },
	});
	if (!place) throw notFound("Place");

	const dayAgo = new Date(Date.now() - MS_PER_DAY);
	const [rateRow] = await db
		.select({ total: count() })
		.from(schema.reviewRateLimits)
		.where(
			and(
				eq(schema.reviewRateLimits.userId, user.id),
				gte(schema.reviewRateLimits.createdAt, dayAgo),
			),
		);

	if ((rateRow?.total ?? 0) >= 5) {
		throw new ApiError("RATE_LIMITED", 429, "Review rate limit exceeded");
	}

	const existing = await db.query.reviews.findFirst({
		where: { placeId, userId: user.id },
	});
	if (existing) {
		throw conflict("You have already reviewed this place");
	}
	const review = await db.transaction(async (tx) => {
		if (input.photoMediaIds?.length) {
			await assertOwnedReadyMedia(
				tx,
				user.id,
				input.photoMediaIds,
				"review_photo",
			);
		}

		let inserted: typeof schema.reviews.$inferSelect;
		try {
			const [row] = await tx
				.insert(schema.reviews)
				.values({
					placeId,
					userId: user.id,
					rating: input.rating,
					body: input.body ?? null,
					status: "published",
				})
				.returning();
			inserted = row;
		} catch (err) {
			if (isUniqueViolation(err)) {
				throw conflict("You have already reviewed this place");
			}
			throw err;
		}

		if (input.photoMediaIds?.length) {
			await tx.insert(schema.reviewPhotos).values(
				input.photoMediaIds.map((mediaId) => ({
					reviewId: inserted.id,
					mediaId,
				})),
			);
		}

		await tx.insert(schema.reviewRateLimits).values({
			userId: user.id,
			placeId,
		});

		await recomputePlaceStats(tx, placeId);
		await evaluateReviewAnomalies(tx, {
			placeId,
			reviewId: inserted.id,
			userId: user.id,
			rating: input.rating,
		});

		return inserted;
	});

	const [hydrated] = await hydrateReviews(db, storage, [review], user.id);
	return hydrated;
}

export async function updateReview(
	storage: Storage | undefined,
	reviewId: string,
	user: SessionUser,
	input: {
		rating?: number;
		body?: string | null;
		photoMediaIds?: string[];
	},
) {
	const existing = await db.query.reviews.findFirst({
		where: { id: reviewId },
	});
	if (!existing) throw notFound("Review");
	if (existing.userId !== user.id) throw forbidden("edit this review");
	if (existing.status === "removed") {
		throw conflict("Cannot edit a removed review");
	}

	const updated = await db.transaction(async (tx) => {
		if (input.photoMediaIds !== undefined) {
			if (input.photoMediaIds.length > 0) {
				await assertOwnedReadyMedia(
					tx,
					user.id,
					input.photoMediaIds,
					"review_photo",
				);
			}
			await tx
				.delete(schema.reviewPhotos)
				.where(eq(schema.reviewPhotos.reviewId, reviewId));

			if (input.photoMediaIds.length > 0) {
				await tx.insert(schema.reviewPhotos).values(
					input.photoMediaIds.map((mediaId) => ({
						reviewId,
						mediaId,
					})),
				);
			}
		}

		const [row] = await tx
			.update(schema.reviews)
			.set({
				...(input.rating !== undefined ? { rating: input.rating } : {}),
				...(input.body !== undefined ? { body: input.body } : {}),
				updatedAt: new Date(),
			})
			.where(eq(schema.reviews.id, reviewId))
			.returning();

		await recomputePlaceStats(tx, existing.placeId);
		return row;
	});

	const [hydrated] = await hydrateReviews(db, storage, [updated], user.id);
	return hydrated;
}

export async function deleteReview(reviewId: string, user: SessionUser) {
	const existing = await db.query.reviews.findFirst({
		where: { id: reviewId },
	});
	if (!existing) throw notFound("Review");
	if (existing.userId !== user.id && user.role !== "admin") {
		throw forbidden("delete this review");
	}

	await db.transaction(async (tx) => {
		await tx
			.update(schema.reviews)
			.set({ status: "removed", updatedAt: new Date() })
			.where(eq(schema.reviews.id, reviewId));

		await recomputePlaceStats(tx, existing.placeId);
	});
}
