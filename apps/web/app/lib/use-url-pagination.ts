import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import {
	DEFAULT_PLACES_PAGE_SIZE,
	normalizePageSize,
	paginateItems,
	parsePositiveIntParam,
} from "~/lib/pagination";

interface UseUrlPaginationOptions {
	filterKey: string;
	scrollTargetRef?: React.RefObject<HTMLElement | null>;
}

export function useUrlPagination<T>(
	items: readonly T[],
	{ filterKey, scrollTargetRef }: UseUrlPaginationOptions,
) {
	const [searchParams, setSearchParams] = useSearchParams();
	const prevFilterKeyRef = useRef(filterKey);

	const requestedPage = parsePositiveIntParam(searchParams.get("page"), 1);
	const pageSize = normalizePageSize(searchParams.get("perPage"));

	const pagination = useMemo(
		() => paginateItems(items, requestedPage, pageSize),
		[items, requestedPage, pageSize],
	);

	// Reset to page 1 only when filters actually change after initial mount
	useEffect(() => {
		if (prevFilterKeyRef.current === filterKey) return;
		prevFilterKeyRef.current = filterKey;
		if (searchParams.has("page")) {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.delete("page");
					return next;
				},
				{ replace: true },
			);
		}
	}, [filterKey, searchParams, setSearchParams]);

	const scrollToResults = useCallback(() => {
		if (typeof window === "undefined") return;
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const target = scrollTargetRef?.current;
		if (target) {
			const top = Math.max(
				0,
				target.getBoundingClientRect().top + window.scrollY - 84,
			);
			window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
		} else {
			window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
		}
	}, [scrollTargetRef]);

	const handlePageChange = useCallback(
		(nextPage: number) => {
			setSearchParams((prev) => {
				const next = new URLSearchParams(prev);
				if (nextPage <= 1) {
					next.delete("page");
				} else {
					next.set("page", String(nextPage));
				}
				return next;
			});
			scrollToResults();
		},
		[setSearchParams, scrollToResults],
	);

	const handlePageSizeChange = useCallback(
		(nextSize: number) => {
			setSearchParams((prev) => {
				const next = new URLSearchParams(prev);
				next.delete("page");
				if (nextSize === DEFAULT_PLACES_PAGE_SIZE) {
					next.delete("perPage");
				} else {
					next.set("perPage", String(nextSize));
				}
				return next;
			});
		},
		[setSearchParams],
	);

	return {
		...pagination,
		searchParams,
		setSearchParams,
		handlePageChange,
		handlePageSizeChange,
	};
}
