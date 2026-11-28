export const DEFAULT_PLACES_PAGE_SIZE = 6;
export const PLACES_PAGE_SIZE_OPTIONS = [6, 9, 12] as const;

export interface PaginationResult<T> {
	items: T[];
	currentPage: number;
	totalPages: number;
	totalItems: number;
	pageSize: number;
	startItem: number;
	endItem: number;
	hasPrevious: boolean;
	hasNext: boolean;
}

/**
 * Parse a positive integer query param, falling back when invalid or non-positive.
 */
export function parsePositiveIntParam(
	raw: string | null,
	fallback: number,
): number {
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed < 1) return fallback;
	return parsed;
}

/**
 * Normalize requested page size against allowed options.
 */
export function normalizePageSize(raw: string | null): number {
	const parsed = parsePositiveIntParam(raw, DEFAULT_PLACES_PAGE_SIZE);
	return (PLACES_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
		? parsed
		: DEFAULT_PLACES_PAGE_SIZE;
}

/**
 * Slice a list into a clamped 1-indexed page with display metadata.
 */
export function paginateItems<T>(
	items: readonly T[],
	requestedPage: number,
	pageSize = DEFAULT_PLACES_PAGE_SIZE,
): PaginationResult<T> {
	const safeSize = Math.max(1, Math.floor(pageSize));
	const totalItems = items.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
	const currentPage = Math.min(
		totalPages,
		Math.max(1, Math.floor(requestedPage) || 1),
	);
	const startIndex = (currentPage - 1) * safeSize;
	const pageItems = items.slice(startIndex, startIndex + safeSize);

	return {
		items: pageItems,
		currentPage,
		totalPages,
		totalItems,
		pageSize: safeSize,
		startItem: totalItems === 0 ? 0 : startIndex + 1,
		endItem: totalItems === 0 ? 0 : startIndex + pageItems.length,
		hasPrevious: currentPage > 1,
		hasNext: currentPage < totalPages,
	};
}

/**
 * Build compact page numbers with ellipsis markers for large page counts.
 */
export function getPaginationRange(
	currentPage: number,
	totalPages: number,
	siblingCount = 1,
): Array<number | "ellipsis"> {
	if (totalPages <= 0) return [1];
	const totalSlots = siblingCount * 2 + 5;
	if (totalPages <= totalSlots) {
		return Array.from({ length: totalPages }, (_, idx) => idx + 1);
	}

	const leftSibling = Math.max(currentPage - siblingCount, 1);
	const rightSibling = Math.min(currentPage + siblingCount, totalPages);
	const showLeftEllipsis = leftSibling > 2;
	const showRightEllipsis = rightSibling < totalPages - 1;

	if (!showLeftEllipsis && showRightEllipsis) {
		const leftCount = 3 + siblingCount * 2;
		const leftPages = Array.from({ length: leftCount }, (_, idx) => idx + 1);
		return [...leftPages, "ellipsis", totalPages];
	}

	if (showLeftEllipsis && !showRightEllipsis) {
		const rightCount = 3 + siblingCount * 2;
		const start = totalPages - rightCount + 1;
		const rightPages = Array.from(
			{ length: rightCount },
			(_, idx) => start + idx,
		);
		return [1, "ellipsis", ...rightPages];
	}

	const middlePages = Array.from(
		{ length: rightSibling - leftSibling + 1 },
		(_, idx) => leftSibling + idx,
	);
	return [1, "ellipsis", ...middlePages, "ellipsis", totalPages];
}
