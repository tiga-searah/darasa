import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_PLACES_PAGE_SIZE,
	getPaginationRange,
	normalizePageSize,
	paginateItems,
	parsePositiveIntParam,
} from "./pagination";

describe("paginateItems", () => {
	const sample = Array.from({ length: 14 }, (_, idx) => `item-${idx + 1}`);

	it("slices first and middle pages accurately", () => {
		const page1 = paginateItems(sample, 1, 6);
		assert.deepEqual(page1.items, [
			"item-1",
			"item-2",
			"item-3",
			"item-4",
			"item-5",
			"item-6",
		]);
		assert.equal(page1.currentPage, 1);
		assert.equal(page1.totalPages, 3);
		assert.equal(page1.startItem, 1);
		assert.equal(page1.endItem, 6);
		assert.equal(page1.hasPrevious, false);
		assert.equal(page1.hasNext, true);

		const page3 = paginateItems(sample, 3, 6);
		assert.deepEqual(page3.items, ["item-13", "item-14"]);
		assert.equal(page3.currentPage, 3);
		assert.equal(page3.startItem, 13);
		assert.equal(page3.endItem, 14);
		assert.equal(page3.hasPrevious, true);
		assert.equal(page3.hasNext, false);
	});

	it("clamps out-of-range page numbers", () => {
		const tooLow = paginateItems(sample, -2, 6);
		assert.equal(tooLow.currentPage, 1);

		const tooHigh = paginateItems(sample, 99, 6);
		assert.equal(tooHigh.currentPage, 3);
		assert.deepEqual(tooHigh.items, ["item-13", "item-14"]);
	});

	it("handles empty lists safely", () => {
		const empty = paginateItems([], 2, 6);
		assert.deepEqual(empty.items, []);
		assert.equal(empty.currentPage, 1);
		assert.equal(empty.totalPages, 1);
		assert.equal(empty.startItem, 0);
		assert.equal(empty.endItem, 0);
		assert.equal(empty.hasPrevious, false);
		assert.equal(empty.hasNext, false);
	});
});

describe("getPaginationRange", () => {
	it("returns all pages when totalPages fits within slots", () => {
		assert.deepEqual(getPaginationRange(2, 5), [1, 2, 3, 4, 5]);
	});

	it("inserts ellipsis when totalPages exceeds visible window", () => {
		assert.deepEqual(getPaginationRange(1, 10), [
			1,
			2,
			3,
			4,
			5,
			"ellipsis",
			10,
		]);
		assert.deepEqual(getPaginationRange(5, 10), [
			1,
			"ellipsis",
			4,
			5,
			6,
			"ellipsis",
			10,
		]);
		assert.deepEqual(getPaginationRange(10, 10), [
			1,
			"ellipsis",
			6,
			7,
			8,
			9,
			10,
		]);
	});
});

describe("query param parsers", () => {
	it("parses valid positive ints and falls back otherwise", () => {
		assert.equal(parsePositiveIntParam("3", 1), 3);
		assert.equal(parsePositiveIntParam("0", 1), 1);
		assert.equal(parsePositiveIntParam("-5", 1), 1);
		assert.equal(parsePositiveIntParam("abc", 1), 1);
		assert.equal(parsePositiveIntParam(null, 1), 1);
	});

	it("normalizes page size to supported options", () => {
		assert.equal(normalizePageSize("6"), 6);
		assert.equal(normalizePageSize("9"), 9);
		assert.equal(normalizePageSize("12"), 12);
		assert.equal(normalizePageSize("20"), DEFAULT_PLACES_PAGE_SIZE);
		assert.equal(normalizePageSize(null), DEFAULT_PLACES_PAGE_SIZE);
	});
});
