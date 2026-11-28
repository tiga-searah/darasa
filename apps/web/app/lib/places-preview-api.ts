import { DEFAULT_PLACES_PAGE_SIZE, paginateItems } from "~/lib/pagination";

export interface PaginatedPlacesResult<T> {
	data: T[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface FetchPlacesPageParams {
	page: number;
	limit?: number;
	delayMs?: number;
	signal?: AbortSignal;
}

export const PREVIEW_INITIAL_FETCH_DELAY_MS = 140;
export const PREVIEW_SCROLL_FETCH_DELAY_MS = 260;

function createAbortError(): Error {
	if (typeof DOMException !== "undefined") {
		return new DOMException("The operation was aborted.", "AbortError");
	}
	const err = new Error("The operation was aborted.");
	err.name = "AbortError";
	return err;
}

function waitWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.reject(createAbortError());
	}
	if (ms <= 0) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timer);
			reject(createAbortError());
		};

		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);

		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

/**
 * Simulates an asynchronous paginated API fetch over the frontend dummy dataset
 * using the same `{ data, meta: { page, limit, total, totalPages } }` contract as apps/api.
 */
export async function fetchPlacesPage<T>(
	dataset: readonly T[],
	{
		page,
		limit = DEFAULT_PLACES_PAGE_SIZE,
		delayMs = PREVIEW_SCROLL_FETCH_DELAY_MS,
		signal,
	}: FetchPlacesPageParams,
): Promise<PaginatedPlacesResult<T>> {
	const effectiveDelay = dataset.length === 0 ? 0 : delayMs;
	await waitWithAbort(effectiveDelay, signal);

	const paged = paginateItems(dataset, page, limit);
	return {
		data: paged.items,
		meta: {
			page: paged.currentPage,
			limit: paged.pageSize,
			total: paged.totalItems,
			totalPages: paged.totalItems === 0 ? 0 : paged.totalPages,
		},
	};
}
