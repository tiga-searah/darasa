import { and, eq, gte, ne, sql } from "drizzle-orm";
import { schema } from "../database/schema";
import {
	ANOMALY_WINDOW_DAYS,
	ANOMALY_Z_THRESHOLD,
} from "../database/schema/moderation";
import type { DbOrTx } from "./ranking";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function evaluateReviewAnomalies(
	tx: DbOrTx,
	input: {
		placeId: string;
		reviewId: string;
		userId: string;
		rating: number;
		now?: Date;
	},
): Promise<void> {
	const now = input.now ?? new Date();
	const windowStart = new Date(
		now.getTime() - ANOMALY_WINDOW_DAYS * MS_PER_DAY,
	);

	// 1. Rating outlier check
	const baseline = await tx
		.select({ rating: schema.reviews.rating })
		.from(schema.reviews)
		.where(
			and(
				eq(schema.reviews.placeId, input.placeId),
				eq(schema.reviews.status, "published"),
				ne(schema.reviews.id, input.reviewId),
				gte(schema.reviews.createdAt, windowStart),
			),
		);

	if (baseline.length >= 10) {
		const n = baseline.length;
		const mean = baseline.reduce((acc, r) => acc + r.rating, 0) / n;
		const variance =
			baseline.reduce((acc, r) => acc + (r.rating - mean) ** 2, 0) / n;
		const stdDev = Math.sqrt(variance);

		if (stdDev > 0) {
			const zScore = (input.rating - mean) / stdDev;
			if (Math.abs(zScore) > ANOMALY_Z_THRESHOLD) {
				await tx.insert(schema.anomalyFlags).values({
					placeId: input.placeId,
					reviewId: input.reviewId,
					userId: input.userId,
					kind: "rating_outlier",
					status: "open",
					metrics: {
						zScore,
						mean,
						stdDev,
						windowDays: ANOMALY_WINDOW_DAYS,
						sampleSize: n,
					},
					reason: `Rating ${input.rating} deviates from ${ANOMALY_WINDOW_DAYS}-day mean ${mean.toFixed(2)} (z=${zScore.toFixed(2)}, n=${n})`,
				});
			}
		}
	}

	// 2. Review burst check (distinct users in last 24h)
	const dayAgo = new Date(now.getTime() - MS_PER_DAY);
	const [burstRow] = await tx
		.select({
			distinctUsers: sql<number>`count(distinct ${schema.reviews.userId})::int`,
		})
		.from(schema.reviews)
		.where(
			and(
				eq(schema.reviews.placeId, input.placeId),
				eq(schema.reviews.status, "published"),
				gte(schema.reviews.createdAt, dayAgo),
			),
		);

	const distinctUsers = burstRow?.distinctUsers ?? 0;
	if (distinctUsers >= 5) {
		const existingOpen = await tx
			.select({ id: schema.anomalyFlags.id })
			.from(schema.anomalyFlags)
			.where(
				and(
					eq(schema.anomalyFlags.placeId, input.placeId),
					eq(schema.anomalyFlags.kind, "review_burst"),
					eq(schema.anomalyFlags.status, "open"),
					gte(schema.anomalyFlags.createdAt, dayAgo),
				),
			)
			.limit(1);

		if (existingOpen.length === 0) {
			await tx.insert(schema.anomalyFlags).values({
				placeId: input.placeId,
				reviewId: input.reviewId,
				userId: input.userId,
				kind: "review_burst",
				status: "open",
				metrics: {
					zScore: 0,
					mean: 0,
					stdDev: 0,
					windowDays: 1,
					sampleSize: distinctUsers,
				},
				reason: `${distinctUsers} distinct users reviewed this place in the last 24 hours`,
			});
		}
	}
}
