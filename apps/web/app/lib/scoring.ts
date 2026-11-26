import type {
	AnomalyFlag,
	CulinaryPlace,
	ReviewItem,
	VerificationStatus,
} from "./types";

const MS_PER_DAY = 86_400_000;
const RECENCY_WINDOW_DAYS = 90;

/**
 * Normalizes verification status for PRD Explore Score calculation:
 * owner_verified = 1.0, community_verified = 0.65, unverified = 0.
 */
export function getVerificationWeight(status: VerificationStatus): number {
	switch (status) {
		case "owner_verified":
			return 1;
		case "community_verified":
			return 0.65;
		default:
			return 0;
	}
}

/**
 * Calculates recency factor in [0, 1] based on days since latest review
 * (linear decay across a 90-day prototype reference window).
 */
export function getRecencyFactor(
	reviews: ReviewItem[],
	referenceDateIso = "2026-11-24T12:00:00Z",
): number {
	if (reviews.length === 0) return 0;
	const refTime = Date.parse(referenceDateIso);
	const latestTime = reviews.reduce((max, item) => {
		const ts = Date.parse(item.createdAt);
		return Number.isNaN(ts) ? max : Math.max(max, ts);
	}, 0);
	if (latestTime === 0) return 0;
	const ageDays = Math.max(0, (refTime - latestTime) / MS_PER_DAY);
	return Math.max(0, Math.min(1, 1 - ageDays / RECENCY_WINDOW_DAYS));
}

export function getAverageRating(reviews: ReviewItem[]): number {
	if (reviews.length === 0) return 0;
	const total = reviews.reduce((sum, item) => sum + item.rating, 0);
	return Number((total / reviews.length).toFixed(2));
}

export interface ExploreScoreBreakdown {
	averageRating: number;
	reviewCount: number;
	recencyFactor: number;
	verificationWeight: number;
	totalScore: number;
}

/**
 * PRD 4.6 Explore Score formula:
 * Explore Score = (0.5 * Average Rating) + (0.2 * log(1 + Review Count)) + (0.2 * Recency Factor) + (0.1 * Verification Status)
 */
export function calculateExploreScore(
	place: CulinaryPlace,
	reviews: ReviewItem[],
): ExploreScoreBreakdown {
	const averageRating = getAverageRating(reviews);
	const reviewCount = reviews.length;
	const recencyFactor = getRecencyFactor(reviews);
	const verificationWeight = getVerificationWeight(place.verificationStatus);

	const totalScore =
		0.5 * averageRating +
		0.2 * Math.log(1 + reviewCount) +
		0.2 * recencyFactor +
		0.1 * verificationWeight;

	return {
		averageRating,
		reviewCount,
		recencyFactor: Number(recencyFactor.toFixed(2)),
		verificationWeight,
		totalScore: Number(totalScore.toFixed(3)),
	};
}

export function getWrittenReviewCount(reviews: ReviewItem[]): number {
	return reviews.filter((item) => item.comment.trim().length > 0).length;
}

/**
 * Hidden Gem eligibility:
 * Average Rating >= 4.0 and must have at least one rating accompanied by a written review.
 */
export function isHiddenGemEligible(
	averageRating: number,
	reviews: ReviewItem[],
): boolean {
	return averageRating >= 4.0 && getWrittenReviewCount(reviews) > 0;
}

/**
 * Hidden Gem Score formula (with YouTube-style view exposure decay):
 * Hidden Gem Score = Average Rating * (1 / (1 + Review Count + log10(1 + Views)))
 */
export function calculateHiddenGemScore(
	averageRating: number,
	reviews: ReviewItem[],
	views: number,
): number {
	if (!isHiddenGemEligible(averageRating, reviews)) return 0;
	const safeViews = Math.max(0, Number.isFinite(views) ? views : 0);
	const denominator = 1 + reviews.length + Math.log10(1 + safeViews);
	return Number((averageRating * (1 / denominator)).toFixed(3));
}

/**
 * PRD 4.8 Z-Score anomaly detection helper.
 * Flags statistical outliers (|z| >= 1.8 on >= 4 reviews) as review indications only,
 * never as automatic proof of misconduct (FR-036).
 */
export function computePlaceAnomalyFlags(
	places: CulinaryPlace[],
	reviewsByPlace: Record<string, ReviewItem[]>,
): AnomalyFlag[] {
	const flags: AnomalyFlag[] = [];

	for (const place of places) {
		const placeReviews = reviewsByPlace[place.id] ?? [];
		if (placeReviews.length < 4) continue;

		const ratings = placeReviews.map((r) => r.rating);
		const mean = ratings.reduce((s, v) => s + v, 0) / ratings.length;
		const variance =
			ratings.reduce((s, v) => s + (v - mean) ** 2, 0) / ratings.length;
		const stdDev = Math.sqrt(variance);
		if (stdDev < 0.05) continue;

		for (const review of placeReviews) {
			const z = (review.rating - mean) / stdDev;
			if (Math.abs(z) >= 1.8) {
				flags.push({
					id: `z-${place.id}-${review.id}`,
					placeId: place.id,
					placeName: place.name,
					reviewId: review.id,
					zScore: Number(z.toFixed(2)),
					reason:
						z < 0
							? `Rating ${review.rating} bintang menyimpang dari rata-rata ${mean.toFixed(1)} (Z = ${z.toFixed(2)})`
							: `Lonjakan rating ${review.rating} bintang dibanding distribusi ulasan (Z = +${z.toFixed(2)})`,
					detectedAt: review.createdAt,
					resolution: "open",
				});
			}
		}
	}

	return flags;
}
