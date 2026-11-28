import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CONTRIBUTOR_LEVELS,
	calculateContributorXp,
	getContributorLevel,
	XP_REWARDS,
} from "./contribute-xp";

describe("calculateContributorXp", () => {
	it("computes weighted XP with gradual per-contribution rewards", () => {
		assert.equal(XP_REWARDS.place, 15);
		assert.equal(XP_REWARDS.review, 8);
		assert.equal(XP_REWARDS.photo, 5);
		assert.equal(XP_REWARDS.edit, 4);
		assert.equal(
			calculateContributorXp({ places: 2, reviews: 3, photos: 1, edits: 2 }),
			67,
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
			8,
		);
		assert.equal(
			calculateContributorXp({
				places: Number.NaN,
				reviews: 2,
				photos: -3,
				edits: 1,
			}),
			20,
		);
	});
});

describe("getContributorLevel", () => {
	it("defines 15 monotonically increasing contributor levels", () => {
		assert.equal(CONTRIBUTOR_LEVELS.length, 15);
		assert.equal(CONTRIBUTOR_LEVELS[0].level, 1);
		assert.equal(CONTRIBUTOR_LEVELS[14].level, 15);
		for (let i = 1; i < CONTRIBUTOR_LEVELS.length; i++) {
			assert.equal(CONTRIBUTOR_LEVELS[i].level, i + 1);
			assert.ok(CONTRIBUTOR_LEVELS[i].minXp > CONTRIBUTOR_LEVELS[i - 1].minXp);
		}
	});

	it("handles Level 1 boundaries (0 and 99 XP) and small per-contribution gain", () => {
		const atZero = getContributorLevel(0);
		assert.equal(atZero.level, 1);
		assert.equal(atZero.title, "Penjelajah Baru");
		assert.equal(atZero.nextLevelXp, 100);
		assert.equal(atZero.xpToNext, 100);
		assert.equal(atZero.progressPercent, 0);

		const afterOnePlace = getContributorLevel(XP_REWARDS.place);
		assert.equal(afterOnePlace.level, 1);
		assert.equal(afterOnePlace.progressPercent, 15);

		const at99 = getContributorLevel(99);
		assert.equal(at99.level, 1);
		assert.equal(at99.xpToNext, 1);
		assert.equal(at99.progressPercent, 99);
	});

	it("handles intermediate level boundaries (Level 2 and Level 8)", () => {
		const at100 = getContributorLevel(100);
		assert.equal(at100.level, 2);
		assert.equal(at100.title, "Penjelajah Aktif");
		assert.equal(at100.currentLevelMinXp, 100);
		assert.equal(at100.nextLevelXp, 220);
		assert.equal(at100.xpToNext, 120);
		assert.equal(at100.progressPercent, 0);

		const at1250 = getContributorLevel(1250);
		assert.equal(at1250.level, 8);
		assert.equal(at1250.title, "Penjaga Data Kuliner");
		assert.equal(at1250.nextLevelXp, 1580);
	});

	it("handles Level 14 to Level 15 cap (5200+ XP)", () => {
		const at5199 = getContributorLevel(5199);
		assert.equal(at5199.level, 14);
		assert.equal(at5199.nextLevelXp, 5200);
		assert.equal(at5199.xpToNext, 1);

		for (const xp of [5200, 9999]) {
			const info = getContributorLevel(xp);
			assert.equal(info.level, 15);
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
			assert.equal(info.xpToNext, 100);
			assert.equal(info.progressPercent, 0);
		}
	});
});
