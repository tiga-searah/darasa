import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchPlacesPage } from "./places-preview-api";

describe("fetchPlacesPage", () => {
	const sample = Array.from({ length: 15 }, (_, idx) => ({
		id: `plc-${idx + 1}`,
	}));

	it("returns paginated slice and backend-compatible meta for page 1 and page 2", async () => {
		const page1 = await fetchPlacesPage(sample, {
			page: 1,
			limit: 6,
			delayMs: 0,
		});
		assert.deepEqual(
			page1.data.map((item) => item.id),
			["plc-1", "plc-2", "plc-3", "plc-4", "plc-5", "plc-6"],
		);
		assert.deepEqual(page1.meta, {
			page: 1,
			limit: 6,
			total: 15,
			totalPages: 3,
		});

		const page2 = await fetchPlacesPage(sample, {
			page: 2,
			limit: 6,
			delayMs: 0,
		});
		assert.deepEqual(
			page2.data.map((item) => item.id),
			["plc-7", "plc-8", "plc-9", "plc-10", "plc-11", "plc-12"],
		);
		assert.equal(page2.meta.page, 2);
	});

	it("returns empty data and totalPages 0 for empty datasets", async () => {
		const empty = await fetchPlacesPage([], {
			page: 1,
			limit: 6,
			delayMs: 50,
		});
		assert.deepEqual(empty, {
			data: [],
			meta: { page: 1, limit: 6, total: 0, totalPages: 0 },
		});
	});

	it("rejects with AbortError when signal is aborted", async () => {
		const controller = new AbortController();
		const pending = fetchPlacesPage(sample, {
			page: 1,
			limit: 6,
			delayMs: 500,
			signal: controller.signal,
		});
		controller.abort();

		let caughtName = "";
		try {
			await pending;
		} catch (error) {
			caughtName = error instanceof Error ? error.name : "";
		}
		assert.equal(caughtName, "AbortError");
	});
});
