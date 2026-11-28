import { MessageSquareReply, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ClearableSearchInput } from "~/components/clearable-search-input";
import { PlaceInfiniteFooter } from "~/components/place-infinite-footer";
import { RatingBreakdownBars } from "~/components/rating-breakdown-bars";
import { ReviewCardItem } from "~/components/review-card-item";
import { ReviewListSkeleton } from "~/components/review-list-skeleton";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { useIncrementalReveal, useInfiniteList } from "~/lib/use-infinite-list";
import { cn } from "~/lib/utils";

interface OwnerReviewsPanelProps {
	place: PlaceWithMetrics;
	onReplyToReview: (reviewId: string, message: string) => void;
}

export function OwnerReviewsPanel({
	place,
	onReplyToReview,
}: OwnerReviewsPanelProps) {
	const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
	const [reviewFilter, setReviewFilter] = useState<"all" | "unanswered">("all");
	const [ratingFilter, setRatingFilter] = useState<number | null>(null);
	const [keyword, setKeyword] = useState("");
	const listRef = useRef<HTMLUListElement>(null);

	const unansweredCount = place.reviews.filter((r) => !r.ownerReply).length;

	const displayedReviews = useMemo(() => {
		const q = keyword.trim().toLowerCase();
		return place.reviews.filter((r) => {
			if (reviewFilter === "unanswered" && r.ownerReply) return false;
			if (ratingFilter !== null && r.rating !== ratingFilter) return false;
			if (q) {
				const haystack = `${r.authorName} ${r.comment}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
	}, [place.reviews, reviewFilter, ratingFilter, keyword]);

	const filterSignature = `${place.id}|${reviewFilter}|${ratingFilter ?? "all"}|${keyword.trim()}`;

	const {
		visibleItems: visibleReviews,
		visibleCount,
		totalItems,
		isInitialLoading,
		isFetchingMore,
		error,
		batchSize,
		sentinelRef,
		retry,
	} = useInfiniteList(displayedReviews, { filterKey: filterSignature });

	useIncrementalReveal(listRef, visibleReviews.length, filterSignature);

	const hasActiveFilters =
		reviewFilter !== "all" ||
		ratingFilter !== null ||
		keyword.trim().length > 0;

	const handleResetFilters = () => {
		setReviewFilter("all");
		setRatingFilter(null);
		setKeyword("");
	};

	const handleReplySubmit = (reviewId: string) => {
		const msg = replyDrafts[reviewId] ?? "";
		if (!msg.trim()) return;
		onReplyToReview(reviewId, msg);
		setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
	};

	return (
		<section className="lg:col-span-7 space-y-6">
			<div className="border-b border-border pb-6 space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="text-lg font-bold text-foreground">
						Distribusi Rating
					</h2>
					{ratingFilter !== null ? (
						<button
							type="button"
							onClick={() => setRatingFilter(null)}
							className="text-xs font-semibold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							Reset filter ({ratingFilter} bintang)
						</button>
					) : null}
				</div>

				<RatingBreakdownBars
					reviews={place.reviews}
					ratingFilter={ratingFilter}
					onSelectRatingFilter={setRatingFilter}
				/>
			</div>

			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-lg font-bold text-foreground">
						Ulasan Pelanggan ({displayedReviews.length})
					</h2>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							aria-pressed={reviewFilter === "all"}
							onClick={() => setReviewFilter("all")}
							className={cn(
								"inline-flex min-h-[36px] items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
								reviewFilter === "all"
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-card text-foreground hover:border-primary/60",
							)}
						>
							Semua ({place.reviews.length})
						</button>
						<button
							type="button"
							aria-pressed={reviewFilter === "unanswered"}
							onClick={() => setReviewFilter("unanswered")}
							className={cn(
								"inline-flex min-h-[36px] items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
								reviewFilter === "unanswered"
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-card text-foreground hover:border-primary/60",
							)}
						>
							Belum Dibalas ({unansweredCount})
						</button>
						{hasActiveFilters ? (
							<Button variant="ghost" size="sm" onClick={handleResetFilters}>
								<RotateCcw className="size-3.5" aria-hidden="true" />
								Reset
							</Button>
						) : null}
					</div>
				</div>

				{place.reviews.length > 0 ? (
					<ClearableSearchInput
						value={keyword}
						onChange={setKeyword}
						label="Cari ulasan pelanggan"
						placeholder="Cari nama pengulas atau isi ulasan..."
					/>
				) : null}

				{place.reviews.length === 0 ? (
					<div className="border-t border-border py-10 text-center text-sm text-muted-foreground">
						Belum ada ulasan pengunjung untuk usaha Anda saat ini.
					</div>
				) : !isInitialLoading && displayedReviews.length === 0 ? (
					<div className="border-t border-border py-10 text-center space-y-3">
						<p className="text-sm text-muted-foreground">
							{reviewFilter === "unanswered" &&
							!keyword &&
							ratingFilter === null
								? "Semua ulasan pengunjung sudah Anda balas. Kerja bagus menjaga komunikasi dengan pelanggan!"
								: "Tidak ada ulasan yang cocok dengan filter saat ini."}
						</p>
						{hasActiveFilters ? (
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={handleResetFilters}
							>
								Tampilkan Semua Ulasan
							</Button>
						) : null}
					</div>
				) : isInitialLoading && visibleReviews.length === 0 ? (
					<ReviewListSkeleton
						count={Math.min(batchSize, displayedReviews.length)}
						withTopBorder
					/>
				) : (
					<>
						<ul
							ref={listRef}
							className="divide-y divide-border border-t border-border"
						>
							{visibleReviews.map((rev) => (
								<ReviewCardItem
									key={rev.id}
									review={rev}
									replyFallback={
										<div className="flex flex-col sm:flex-row gap-2">
											<label className="sr-only" htmlFor={`reply-${rev.id}`}>
												Balas ulasan {rev.authorName}
											</label>
											<Input
												id={`reply-${rev.id}`}
												type="text"
												value={replyDrafts[rev.id] ?? ""}
												onChange={(e) =>
													setReplyDrafts((prev) => ({
														...prev,
														[rev.id]: e.target.value,
													}))
												}
												placeholder="Tulis balasan sopan untuk pelanggan..."
												className="flex-1"
											/>
											<Button
												variant="secondary"
												onClick={() => handleReplySubmit(rev.id)}
											>
												<MessageSquareReply
													className="size-4"
													aria-hidden="true"
												/>
												Kirim Balasan
											</Button>
										</div>
									}
								/>
							))}
						</ul>

						<PlaceInfiniteFooter
							visibleCount={visibleCount}
							totalItems={totalItems}
							isInitialLoading={isInitialLoading}
							isFetchingMore={isFetchingMore}
							error={error}
							sentinelRef={sentinelRef}
							onRetry={retry}
							loadingLabel="Memuat ulasan lainnya..."
						/>
					</>
				)}
			</div>
		</section>
	);
}
