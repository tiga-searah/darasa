import { and, avg, count, eq, max } from "drizzle-orm";
import type { db } from "../database";
import { schema } from "../database/schema";

export type DbOrTx =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VOLUME_LOG_BASE = Math.log(1 + 50);

export function computeScores(input: {
	ratingAvg: number;
	reviewCount: number;
	lastReviewAt: Date | null;
	communityVerified: boolean;
	ownerVerified: boolean;
	now?: Date;
}): { exploreScore: number; hiddenGemScore: number } {
	const now = input.now ?? new Date();
	const ratingPart = input.ratingAvg / 5;
	const volumePart = Math.min(
		Math.log(1 + input.reviewCount) / VOLUME_LOG_BASE,
		1,
	);
	const ageDays = input.lastReviewAt
		? (now.getTime() - input.lastReviewAt.getTime()) / MS_PER_DAY
		: 0;
	const recencyPart = input.lastReviewAt
		? Math.exp(-Math.max(0, ageDays) / 30)
		: 0;
	const verifyPart = input.ownerVerified
		? 1
		: input.communityVerified
			? 0.5
			: 0;

	const exploreScore =
		0.5 * ratingPart + 0.2 * volumePart + 0.2 * recencyPart + 0.1 * verifyPart;

	const hiddenGemScore =
		input.ratingAvg >= 4.0 && input.reviewCount > 0
			? input.ratingAvg * (1 / (1 + input.reviewCount))
			: 0;

	return { exploreScore, hiddenGemScore };
}

export async function recomputePlaceStats(
	tx: DbOrTx,
	placeId: string,
	now?: Date,
): Promise<void> {
	const [place] = await tx
		.select({
			communityVerified: schema.places.communityVerified,
			ownerVerified: schema.places.ownerVerified,
		})
		.from(schema.places)
		.where(eq(schema.places.id, placeId));

	if (!place) return;

	const [agg] = await tx
		.select({
			reviewCount: count(),
			ratingAvg: avg(schema.reviews.rating),
			lastReviewAt: max(schema.reviews.createdAt),
		})
		.from(schema.reviews)
		.where(
			and(
				eq(schema.reviews.placeId, placeId),
				eq(schema.reviews.status, "published"),
			),
		);

	const reviewCount = Number(agg?.reviewCount ?? 0);
	const ratingAvg =
		reviewCount > 0 && agg?.ratingAvg !== null && agg?.ratingAvg !== undefined
			? Number(agg.ratingAvg)
			: 0;
	const lastReviewAt = agg?.lastReviewAt ? new Date(agg.lastReviewAt) : null;

	const { exploreScore, hiddenGemScore } = computeScores({
		ratingAvg,
		reviewCount,
		lastReviewAt,
		communityVerified: place.communityVerified,
		ownerVerified: place.ownerVerified,
		now,
	});

	await tx
		.update(schema.places)
		.set({
			ratingAvg,
			reviewCount,
			lastReviewAt,
			exploreScore,
			hiddenGemScore,
		})
		.where(eq(schema.places.id, placeId));
}
