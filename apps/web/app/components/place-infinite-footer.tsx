import { Loader2, RotateCcw } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "~/components/ui/button";

interface PlaceInfiniteFooterProps {
	visibleCount: number;
	totalItems: number;
	isInitialLoading?: boolean;
	isFetchingMore?: boolean;
	error?: string | null;
	sentinelRef: RefObject<HTMLDivElement | null>;
	onRetry?: () => void;
	loadingLabel?: string;
}

/**
 * Infinite-scroll sentinel that triggers progressive loading and surfaces minimal loading or retry states.
 */
export function PlaceInfiniteFooter({
	visibleCount,
	totalItems,
	isInitialLoading = false,
	isFetchingMore = false,
	error = null,
	sentinelRef,
	onRetry,
	loadingLabel = "Memuat tempat lainnya...",
}: PlaceInfiniteFooterProps) {
	if (totalItems === 0 || (isInitialLoading && visibleCount === 0)) {
		return null;
	}

	if (!error && !isFetchingMore) {
		return <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />;
	}

	return (
		<div ref={sentinelRef} className="flex items-center justify-center pt-2">
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
			) : (
				<div
					role="status"
					aria-live="polite"
					className="inline-flex min-h-[32px] items-center justify-center"
				>
					<Loader2
						className="size-4 animate-spin text-primary"
						aria-hidden="true"
					/>
					<span className="sr-only">{loadingLabel}</span>
				</div>
			)}
		</div>
	);
}
