import { ChevronDown, Loader2, RotateCcw } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "~/components/ui/button";

interface PlaceInfiniteFooterProps {
	visibleCount: number;
	totalItems: number;
	currentPage?: number;
	totalPages?: number;
	hasMore: boolean;
	isInitialLoading?: boolean;
	isFetchingMore?: boolean;
	error?: string | null;
	batchSize: number;
	sentinelRef: RefObject<HTMLDivElement | null>;
	onLoadMore: () => void;
	onRetry?: () => void;
	itemLabel?: string;
}

/**
 * Infinite-scroll footer sentinel with live fetch status, page readout, and manual fallback trigger.
 */
export function PlaceInfiniteFooter({
	visibleCount,
	totalItems,
	currentPage = 1,
	totalPages = 1,
	hasMore,
	isInitialLoading = false,
	isFetchingMore = false,
	error = null,
	batchSize,
	sentinelRef,
	onLoadMore,
	onRetry,
	itemLabel = "tempat",
}: PlaceInfiniteFooterProps) {
	if (totalItems === 0 || (isInitialLoading && visibleCount === 0)) {
		return null;
	}

	const nextBatchCount = Math.min(batchSize, totalItems - visibleCount);
	const nextPageNumber = Math.min(totalPages || 1, currentPage + 1);

	return (
		<div
			ref={sentinelRef}
			className="flex flex-col items-center justify-between gap-3 border-t border-border pt-5 sm:flex-row"
		>
			<p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
				Menampilkan{" "}
				<strong className="font-semibold text-foreground">
					{visibleCount}
				</strong>{" "}
				dari{" "}
				<strong className="font-semibold text-foreground">{totalItems}</strong>{" "}
				{itemLabel}
				{totalPages > 1 ? (
					<span className="ml-1.5 text-muted-foreground/80">
						· Halaman {Math.max(1, currentPage)}/{totalPages}
					</span>
				) : null}
			</p>

			{error ? (
				<div className="flex items-center gap-2.5">
					<span className="text-xs text-destructive">{error}</span>
					{onRetry ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onRetry}
							className="min-h-[36px] gap-1.5 rounded-[8px]"
						>
							<RotateCcw className="size-3.5" aria-hidden="true" />
							<span>Coba lagi</span>
						</Button>
					) : null}
				</div>
			) : isFetchingMore ? (
				<div
					role="status"
					aria-live="polite"
					className="inline-flex min-h-[40px] items-center gap-2 text-xs sm:text-sm text-muted-foreground tabular-nums"
				>
					<Loader2
						className="size-4 animate-spin text-primary"
						aria-hidden="true"
					/>
					<span>Memuat halaman {nextPageNumber}...</span>
				</div>
			) : hasMore ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onLoadMore}
					className="min-h-[40px] gap-1.5 rounded-[8px]"
				>
					<span>Muat {nextBatchCount} lagi</span>
					<ChevronDown className="size-3.5 text-primary" aria-hidden="true" />
				</Button>
			) : (
				<p className="text-xs text-muted-foreground">
					Semua {itemLabel} telah ditampilkan
				</p>
			)}
		</div>
	);
}
