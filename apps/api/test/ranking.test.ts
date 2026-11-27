import { describe, expect, test } from "bun:test";
import { computeScores } from "../src/lib/ranking";

describe("computeScores", () => {
	const now = new Date("2026-11-26T00:00:00.000Z");

	test("zero reviews yields zero hiddenGemScore and verification-only exploreScore", () => {
		const res = computeScores({
			ratingAvg: 0,
			reviewCount: 0,
			lastReviewAt: null,
			communityVerified: false,
			ownerVerified: true,
			now,
		});
		expect(res.hiddenGemScore).toBe(0);
		expect(res.exploreScore).toBeCloseTo(0.1, 6);
	});

	test("hiddenGemScore requires ratingAvg >= 4.0 and reviewCount > 0", () => {
		const low = computeScores({
			ratingAvg: 3.9,
			reviewCount: 3,
			lastReviewAt: now,
			communityVerified: false,
			ownerVerified: false,
			now,
		});
		expect(low.hiddenGemScore).toBe(0);

		const eligible = computeScores({
			ratingAvg: 4.5,
			reviewCount: 2,
			lastReviewAt: now,
			communityVerified: true,
			ownerVerified: false,
			now,
		});
		expect(eligible.hiddenGemScore).toBeCloseTo(4.5 * (1 / 3), 6);
		// 0.5*(4.5/5) + 0.2*(ln(3)/ln(51)) + 0.2*1 + 0.1*0.5
		const expectedExplore =
			0.5 * (4.5 / 5) +
			0.2 * (Math.log(3) / Math.log(51)) +
			0.2 * 1 +
			0.1 * 0.5;
		expect(eligible.exploreScore).toBeCloseTo(expectedExplore, 6);
	});

	test("caps volumePart at 1 for >= 50 reviews and decays recency over 30 days", () => {
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const res = computeScores({
			ratingAvg: 5,
			reviewCount: 100,
			lastReviewAt: thirtyDaysAgo,
			communityVerified: true,
			ownerVerified: true,
			now,
		});
		const expectedExplore = 0.5 * 1 + 0.2 * 1 + 0.2 * Math.exp(-1) + 0.1 * 1;
		expect(res.exploreScore).toBeCloseTo(expectedExplore, 6);
	});

	test("computeScores applies view exposure decay to hiddenGemScore when viewsTotal > 0", () => {
		const noViews = computeScores({
			ratingAvg: 4.5,
			reviewCount: 4,
			lastReviewAt: now,
			communityVerified: false,
			ownerVerified: false,
			viewsTotal: 0,
		});
		const highViews = computeScores({
			ratingAvg: 4.5,
			reviewCount: 4,
			lastReviewAt: now,
			communityVerified: false,
			ownerVerified: false,
			viewsTotal: 999,
		});
		expect(highViews.hiddenGemScore).toBeLessThan(noViews.hiddenGemScore);
	});
});
