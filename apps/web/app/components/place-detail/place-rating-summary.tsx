import { Star } from "lucide-react";
import { RatingBreakdownBars } from "~/components/rating-breakdown-bars";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { cn } from "~/lib/utils";

interface PlaceRatingSummaryProps {
	place: PlaceWithMetrics;
	ratingFilter: number | null;
	onSelectRatingFilter: (rating: number | null) => void;
}

export function PlaceRatingSummary({
	place,
	ratingFilter,
	onSelectRatingFilter,
}: PlaceRatingSummaryProps) {
	return (
		<div className="space-y-4 border-b border-border pb-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<h2 className="text-lg font-bold text-foreground">
						Rating &amp; Rincian Skor
					</h2>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<div className="flex items-baseline gap-1 tabular-nums">
							<span className="text-3xl font-bold tracking-tight text-foreground">
								{place.reviewCount > 0 ? place.averageRating.toFixed(1) : "0.0"}
							</span>
							<span className="text-xs font-medium text-muted-foreground">
								/ 5
							</span>
						</div>
						<div
							role="img"
							className="flex items-center gap-0.5"
							aria-label={`Rata-rata ${place.averageRating.toFixed(1)} dari 5 bintang`}
						>
							{[1, 2, 3, 4, 5].map((starValue) => {
								const filled =
									place.reviewCount > 0 &&
									starValue <= Math.round(place.averageRating);
								return (
									<Star
										key={starValue}
										className={cn(
											"size-4",
											filled
												? "fill-accent-yellow text-accent-yellow"
												: "text-border",
										)}
										aria-hidden="true"
									/>
								);
							})}
						</div>
						<span className="text-xs text-muted-foreground tabular-nums">
							{place.reviewCount} ulasan komunitas
						</span>
					</div>
				</div>

				<div className="flex flex-col items-start gap-1.5 sm:items-end">
					<span className="text-xs text-muted-foreground">
						Ditambahkan oleh {place.submittedByName}
					</span>
					{ratingFilter !== null ? (
						<button
							type="button"
							onClick={() => onSelectRatingFilter(null)}
							className="text-xs font-semibold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							Reset filter ({ratingFilter} bintang)
						</button>
					) : null}
				</div>
			</div>

			<RatingBreakdownBars
				reviews={place.reviews}
				ratingFilter={ratingFilter}
				onSelectRatingFilter={onSelectRatingFilter}
			/>
		</div>
	);
}
