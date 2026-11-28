import { MessageSquareReply, RotateCcw, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { ClearableSearchInput } from "~/components/clearable-search-input";
import { PlacePagination } from "~/components/place-pagination";
import { RatingBreakdownBars } from "~/components/rating-breakdown-bars";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { DEFAULT_PLACES_PAGE_SIZE, paginateItems } from "~/lib/pagination";
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
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PLACES_PAGE_SIZE);

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

	const pagination = useMemo(
		() => paginateItems(displayedReviews, page, pageSize),
		[displayedReviews, page, pageSize],
	);

	const hasActiveFilters =
		reviewFilter !== "all" ||
		ratingFilter !== null ||
		keyword.trim().length > 0;

	const handleResetFilters = () => {
		setReviewFilter("all");
		setRatingFilter(null);
		setKeyword("");
		setPage(1);
	};

	const handleReplySubmit = (reviewId: string) => {
		const msg = replyDrafts[reviewId] ?? "";
		if (!msg.trim()) return;
		onReplyToReview(reviewId, msg);
		setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
	};

	return (
		<section className="lg:col-span-7 lg:border-l lg:border-border lg:pl-7 space-y-6">
			<div className="border-b border-border pb-6 space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="text-lg font-bold text-foreground">
						Distribusi Bintang dari Ulasan Terdata
					</h2>
					{ratingFilter !== null ? (
						<button
							type="button"
							onClick={() => {
								setRatingFilter(null);
								setPage(1);
							}}
							className="text-xs font-semibold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							Reset filter ({ratingFilter} bintang)
						</button>
					) : null}
				</div>

				<RatingBreakdownBars
					reviews={place.reviews}
					ratingFilter={ratingFilter}
					onSelectRatingFilter={(nextRating) => {
						setRatingFilter(nextRating);
						setPage(1);
					}}
				/>
			</div>

			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-lg font-bold text-foreground">
						Balas Ulasan Pengunjung ({displayedReviews.length})
					</h2>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							aria-pressed={reviewFilter === "all"}
							onClick={() => {
								setReviewFilter("all");
								setPage(1);
							}}
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
							onClick={() => {
								setReviewFilter("unanswered");
								setPage(1);
							}}
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
						onChange={(val) => {
							setKeyword(val);
							setPage(1);
						}}
						label="Cari ulasan pelanggan"
						placeholder="Cari nama pengulas atau isi ulasan..."
					/>
				) : null}

				{place.reviews.length === 0 ? (
					<div className="border-t border-border py-10 text-center text-sm text-muted-foreground">
						Belum ada ulasan pengunjung untuk usaha Anda saat ini.
					</div>
				) : displayedReviews.length === 0 ? (
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
				) : (
					<>
						<ul className="divide-y divide-border border-t border-border">
							{pagination.items.map((rev) => (
								<li key={rev.id} className="py-5 space-y-3">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex items-center gap-2.5">
											<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
												{rev.authorName.slice(0, 1).toUpperCase()}
											</span>
											<div>
												<p className="text-sm font-semibold text-foreground">
													{rev.authorName}
												</p>
												<p className="text-xs text-muted-foreground">
													{new Date(rev.createdAt).toLocaleDateString("id-ID", {
														day: "numeric",
														month: "short",
														year: "numeric",
													})}
												</p>
											</div>
										</div>

										<div
											role="img"
											className="flex items-center gap-0.5"
											aria-label={`${rev.rating} dari 5 bintang`}
										>
											{[1, 2, 3, 4, 5].map((starValue) => (
												<Star
													key={starValue}
													className={cn(
														"size-4",
														starValue <= rev.rating
															? "fill-accent-yellow text-accent-yellow"
															: "text-border",
													)}
													aria-hidden="true"
												/>
											))}
										</div>
									</div>

									<p className="text-sm leading-relaxed text-foreground">
										{rev.comment}
									</p>

									{rev.photoUrl ? (
										<img
											src={rev.photoUrl}
											alt={`Foto ulasan oleh ${rev.authorName}`}
											width={360}
											height={220}
											className="mt-2 h-44 w-full max-w-xs rounded-[10px] border border-border object-cover"
										/>
									) : null}

									{rev.ownerReply ? (
										<div className="mt-2 rounded-[10px] border border-border bg-muted/45 p-3.5 space-y-1">
											<p className="text-xs font-semibold text-primary-hover">
												{rev.ownerReply.authorName}
											</p>
											<p className="text-sm text-muted-foreground leading-relaxed">
												{rev.ownerReply.message}
											</p>
										</div>
									) : (
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
									)}
								</li>
							))}
						</ul>

						<PlacePagination
							currentPage={pagination.currentPage}
							totalPages={pagination.totalPages}
							totalItems={pagination.totalItems}
							pageSize={pagination.pageSize}
							startItem={pagination.startItem}
							endItem={pagination.endItem}
							onPageChange={setPage}
							onPageSizeChange={(nextSize) => {
								setPageSize(nextSize);
								setPage(1);
							}}
							itemLabel="ulasan"
						/>
					</>
				)}
			</div>
		</section>
	);
}
