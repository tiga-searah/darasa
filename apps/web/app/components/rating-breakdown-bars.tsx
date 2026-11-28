import { Star } from "lucide-react";
import type { ReviewItem } from "~/lib/types";
import { cn } from "~/lib/utils";

interface RatingBreakdownBarsProps {
	reviews: readonly ReviewItem[];
	ratingFilter: number | null;
	onSelectRatingFilter: (rating: number | null) => void;
}

export function RatingBreakdownBars({
	reviews,
	ratingFilter,
	onSelectRatingFilter,
}: RatingBreakdownBarsProps) {
	if (reviews.length === 0) return null;

	const total = reviews.length;
	const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
		star,
		count: reviews.filter((r) => r.rating === star).length,
	}));

	return (
		<fieldset className="m-0 space-y-1.5 border-0 p-0">
			<legend className="sr-only">
				Rincian dan filter ulasan berdasarkan rating bintang
			</legend>
			{ratingCounts.map(({ star, count }) => {
				const pct = total > 0 ? Math.round((count / total) * 100) : 0;
				const active = ratingFilter === star;
				return (
					<button
						key={star}
						type="button"
						aria-pressed={active}
						onClick={() => onSelectRatingFilter(active ? null : star)}
						className={cn(
							"flex min-h-[34px] w-full items-center gap-3 rounded-[8px] px-2 py-1 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
							active
								? "bg-yellow-soft/80 font-semibold text-foreground ring-1 ring-accent-yellow/60"
								: "hover:bg-muted/60",
						)}
					>
						<span className="inline-flex w-12 shrink-0 items-center gap-1 font-medium text-foreground tabular-nums">
							<span>{star}</span>
							<Star
								className="size-3.5 fill-accent-yellow text-accent-yellow"
								aria-hidden="true"
							/>
						</span>
						<div className="h-2.5 flex-1 overflow-hidden rounded-[4px] bg-muted">
							<div
								style={{ width: `${pct}%` }}
								className="h-full rounded-[4px] bg-accent-yellow transition-[width] duration-300"
							/>
						</div>
						<span className="w-16 shrink-0 text-right text-muted-foreground tabular-nums">
							{count} ({pct}%)
						</span>
					</button>
				);
			})}
		</fieldset>
	);
}
