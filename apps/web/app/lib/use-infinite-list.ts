import gsap from "gsap";
import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { DEFAULT_PLACES_PAGE_SIZE } from "~/lib/pagination";
import {
	fetchPlacesPage,
	type PaginatedPlacesResult,
	PREVIEW_INITIAL_FETCH_DELAY_MS,
	PREVIEW_SCROLL_FETCH_DELAY_MS,
} from "~/lib/places-preview-api";

export interface UseInfiniteListOptions<T> {
	filterKey: string;
	batchSize?: number;
	fetchPage?: (params: {
		page: number;
		limit: number;
		signal: AbortSignal;
	}) => Promise<PaginatedPlacesResult<T>>;
	initialDelayMs?: number;
	scrollDelayMs?: number;
}

interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

/**
 * Progressively fetches paginated list results as filters change or the scroll sentinel enters view.
 * Defaults to simulated async paginated fetching over the frontend dataset for preview mode.
 */
export function useInfiniteList<T>(
	items: readonly T[],
	{
		filterKey,
		batchSize = DEFAULT_PLACES_PAGE_SIZE,
		fetchPage,
		initialDelayMs = PREVIEW_INITIAL_FETCH_DELAY_MS,
		scrollDelayMs = PREVIEW_SCROLL_FETCH_DELAY_MS,
	}: UseInfiniteListOptions<T>,
) {
	const [visibleItems, setVisibleItems] = useState<T[]>([]);
	const [meta, setMeta] = useState<PaginationMeta>(() => ({
		page: 0,
		limit: batchSize,
		total: items.length,
		totalPages:
			items.length === 0 ? 0 : Math.max(1, Math.ceil(items.length / batchSize)),
	}));
	const [isInitialLoading, setIsInitialLoading] = useState(
		() => items.length > 0 || Boolean(fetchPage),
	);
	const [isFetchingMore, setIsFetchingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const itemsRef = useRef(items);
	itemsRef.current = items;
	const syncedItemsRef = useRef(items);
	const fetchPageRef = useRef(fetchPage);
	fetchPageRef.current = fetchPage;

	const sentinelRef = useRef<HTMLDivElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const epochRef = useRef(0);
	const inFlightPageRef = useRef<number | null>(null);
	const loadedFilterKeyRef = useRef<string | null>(null);

	const runFetchPage = useCallback(
		async (page: number, delayMs: number, epoch: number) => {
			if (inFlightPageRef.current === page) return;
			inFlightPageRef.current = page;

			abortControllerRef.current?.abort();
			const controller = new AbortController();
			abortControllerRef.current = controller;

			const isFirstPage = page === 1;
			if (isFirstPage) {
				setIsInitialLoading(true);
				setIsFetchingMore(false);
			} else {
				setIsFetchingMore(true);
			}
			setError(null);

			try {
				const requestItems = itemsRef.current;
				const fetcher = fetchPageRef.current;
				const response = fetcher
					? await fetcher({
							page,
							limit: batchSize,
							signal: controller.signal,
						})
					: await fetchPlacesPage(requestItems, {
							page,
							limit: batchSize,
							delayMs,
							signal: controller.signal,
						});

				if (controller.signal.aborted || epoch !== epochRef.current) return;

				syncedItemsRef.current = requestItems;
				setMeta(response.meta);
				setVisibleItems((prev) =>
					isFirstPage ? response.data : [...prev, ...response.data],
				);
			} catch (err) {
				if (controller.signal.aborted || epoch !== epochRef.current) return;
				if (err instanceof Error && err.name === "AbortError") return;
				setError(
					err instanceof Error
						? err.message
						: "Gagal memuat daftar tempat kuliner.",
				);
			} finally {
				if (epoch === epochRef.current) {
					inFlightPageRef.current = null;
					setIsInitialLoading(false);
					setIsFetchingMore(false);
				}
			}
		},
		[batchSize],
	);

	// Reset and fetch page 1 when filterKey or batchSize changes.
	useEffect(() => {
		epochRef.current += 1;
		const currentEpoch = epochRef.current;
		inFlightPageRef.current = null;
		loadedFilterKeyRef.current = filterKey;

		setVisibleItems([]);
		setMeta({
			page: 0,
			limit: batchSize,
			total: itemsRef.current.length,
			totalPages:
				itemsRef.current.length === 0
					? 0
					: Math.max(1, Math.ceil(itemsRef.current.length / batchSize)),
		});

		void runFetchPage(1, initialDelayMs, currentEpoch);

		return () => {
			abortControllerRef.current?.abort();
		};
	}, [filterKey, batchSize, initialDelayMs, runFetchPage]);

	// Keep already-loaded pages synchronized in preview mode when reactive store data mutates
	// (e.g., localStorage hydration on mount, bookmark toggle, or rating update) under the same filter.
	useEffect(() => {
		if (fetchPageRef.current) return;
		if (loadedFilterKeyRef.current !== filterKey) return;
		if (isInitialLoading || isFetchingMore) return;
		if (syncedItemsRef.current === items) return;
		syncedItemsRef.current = items;

		if (meta.total === 0 && items.length > 0) {
			void runFetchPage(1, 0, epochRef.current);
			return;
		}

		const loadedPages = Math.max(1, meta.page);
		const targetCount = Math.min(items.length, loadedPages * batchSize);
		setVisibleItems(items.slice(0, targetCount));
		setMeta({
			page:
				items.length === 0
					? 1
					: Math.min(
							loadedPages,
							Math.max(1, Math.ceil(items.length / batchSize)),
						),
			limit: batchSize,
			total: items.length,
			totalPages:
				items.length === 0
					? 0
					: Math.max(1, Math.ceil(items.length / batchSize)),
		});
	}, [
		items,
		filterKey,
		batchSize,
		isInitialLoading,
		isFetchingMore,
		meta.page,
		meta.total,
		runFetchPage,
	]);

	const hasMore = meta.page < meta.totalPages;

	const loadMore = useCallback(() => {
		if (isInitialLoading || isFetchingMore || !hasMore) return;
		const nextPage = meta.page + 1;
		void runFetchPage(nextPage, scrollDelayMs, epochRef.current);
	}, [
		isInitialLoading,
		isFetchingMore,
		hasMore,
		meta.page,
		scrollDelayMs,
		runFetchPage,
	]);

	const retry = useCallback(() => {
		const targetPage = meta.page <= 0 ? 1 : meta.page + 1;
		const delay = targetPage === 1 ? initialDelayMs : scrollDelayMs;
		void runFetchPage(targetPage, delay, epochRef.current);
	}, [meta.page, initialDelayMs, scrollDelayMs, runFetchPage]);

	useEffect(() => {
		const target = sentinelRef.current;
		if (
			!target ||
			!hasMore ||
			isInitialLoading ||
			isFetchingMore ||
			error !== null ||
			typeof IntersectionObserver === "undefined"
		) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					loadMore();
				}
			},
			{ rootMargin: "240px 0px" },
		);

		observer.observe(target);
		return () => observer.disconnect();
	}, [hasMore, isInitialLoading, isFetchingMore, error, loadMore]);

	return {
		visibleItems,
		visibleCount: visibleItems.length,
		totalItems: meta.total,
		currentPage: meta.page,
		totalPages: meta.totalPages,
		hasMore,
		isInitialLoading,
		isFetchingMore,
		error,
		batchSize,
		sentinelRef,
		loadMore,
		retry,
	};
}

/**
 * Animates only newly appended children during infinite scroll, or all children on filter/view changes.
 */
export function useIncrementalReveal(
	containerRef: RefObject<HTMLElement | null>,
	visibleCount: number,
	resetKey: string,
) {
	const prevResetKeyRef = useRef(resetKey);
	const prevCountRef = useRef(0);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const resetChanged = prevResetKeyRef.current !== resetKey;
		const startIndex = resetChanged ? 0 : prevCountRef.current;
		prevResetKeyRef.current = resetKey;
		prevCountRef.current = visibleCount;

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const targets = Array.from(container.children).slice(startIndex);
		if (targets.length === 0) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				targets,
				{ opacity: 0, y: 10 },
				{
					opacity: 1,
					y: 0,
					duration: 0.24,
					stagger: 0.03,
					ease: "power2.out",
					clearProps: "transform",
				},
			);
		}, containerRef);

		return () => ctx.revert();
	}, [containerRef, visibleCount, resetKey]);
}
