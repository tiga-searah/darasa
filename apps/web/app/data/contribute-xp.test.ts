import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateContributorXp, getContributorLevel } from "./contribute-xp";

describe("calculateContributorXp", () => {
	it("computes weighted XP across all contribution types", () => {
		assert.equal(
			calculateContributorXp({ places: 2, reviews: 3, photos: 1, edits: 2 }),
			210,
		);
	});

	it("returns 0 when all counts are zero", () => {
		assert.equal(
			calculateContributorXp({ places: 0, reviews: 0, photos: 0, edits: 0 }),
			0,
		);
	});

	it("clamps negative and NaN counts to 0", () => {
		assert.equal(
			calculateContributorXp({ places: -1, reviews: 1, photos: 0, edits: 0 }),
			25,
		);
		assert.equal(
			calculateContributorXp({
				places: Number.NaN,
				reviews: 2,
				photos: -3,
				edits: 1,
			}),
			60,
		);
	});
});

describe("getContributorLevel", () => {
	it("handles Level 1 boundaries (0 and 49 XP)", () => {
		const atZero = getContributorLevel(0);
		assert.equal(atZero.level, 1);
		assert.equal(atZero.title, "Penjelajah Baru");
		assert.equal(atZero.nextLevelXp, 50);
		assert.equal(atZero.xpToNext, 50);
		assert.equal(atZero.progressPercent, 0);

		const at49 = getContributorLevel(49);
		assert.equal(at49.level, 1);
		assert.equal(at49.xpToNext, 1);
		assert.equal(at49.progressPercent, 98);
	});

	it("handles Level 2 boundaries (50 and 149 XP)", () => {
		const at50 = getContributorLevel(50);
		assert.equal(at50.level, 2);
		assert.equal(at50.title, "Penjelajah Aktif");
		assert.equal(at50.currentLevelMinXp, 50);
		assert.equal(at50.nextLevelXp, 150);
		assert.equal(at50.xpToNext, 100);
		assert.equal(at50.progressPercent, 0);

		const at149 = getContributorLevel(149);
		assert.equal(at149.level, 2);
		assert.equal(at149.xpToNext, 1);
	});

	it("handles Level 3 boundaries (150 and 299 XP)", () => {
		const at150 = getContributorLevel(150);
		assert.equal(at150.level, 3);
		assert.equal(at150.title, "Kurator Lokal");
		assert.equal(at150.nextLevelXp, 300);

		const at299 = getContributorLevel(299);
		assert.equal(at299.level, 3);
		assert.equal(at299.xpToNext, 1);
	});

	it("handles Level 4 boundaries (300 and 499 XP)", () => {
		const at300 = getContributorLevel(300);
		assert.equal(at300.level, 4);
		assert.equal(at300.title, "Pemandu Kuliner");
		assert.equal(at300.nextLevelXp, 500);

		const at499 = getContributorLevel(499);
		assert.equal(at499.level, 4);
		assert.equal(at499.xpToNext, 1);
	});

	it("handles Level 5 cap (500 and 750 XP)", () => {
		for (const xp of [500, 750]) {
			const info = getContributorLevel(xp);
			assert.equal(info.level, 5);
			assert.equal(info.title, "Duta Kuliner Batang");
			assert.equal(info.nextLevelXp, null);
			assert.equal(info.nextLevelTitle, null);
			assert.equal(info.xpToNext, 0);
			assert.equal(info.progressPercent, 100);
		}
	});

	it("clamps negative and NaN XP to 0", () => {
		for (const xp of [-10, Number.NaN]) {
			const info = getContributorLevel(xp);
			assert.equal(info.level, 1);
			assert.equal(info.xp, 0);
			assert.equal(info.xpToNext, 50);
			assert.equal(info.progressPercent, 0);
		}
	});
});
