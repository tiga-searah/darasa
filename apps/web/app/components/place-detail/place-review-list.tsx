import { ThumbsUp, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { PlaceInfiniteFooter } from "~/components/place-infinite-footer";
import { ReviewCardItem } from "~/components/review-card-item";
import { ReviewListSkeleton } from "~/components/review-list-skeleton";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import type { ReviewItem } from "~/lib/types";
import { useIncrementalReveal, useInfiniteList } from "~/lib/use-infinite-list";
import { cn } from "~/lib/utils";

interface PlaceReviewListProps {
	reviews: ReviewItem[];
	ratingFilter: number | null;
	onClearFilter: () => void;
	isReviewLiked: (reviewId: string) => boolean;
	getReviewLikeCount: (reviewId: string) => number;
	onToggleReviewLike: (reviewId: string) => void;
	currentUserId?: string;
	canDeleteAnyReview?: boolean;
	onDeleteReview?: (reviewId: string) => void;
}

export function PlaceReviewList({
	reviews,
	ratingFilter,
	onClearFilter,
	isReviewLiked,
	getReviewLikeCount,
	onToggleReviewLike,
	currentUserId,
	canDeleteAnyReview = false,
	onDeleteReview,
}: PlaceReviewListProps) {
	const listRef = useRef<HTMLUListElement>(null);
	const [pendingDeleteReview, setPendingDeleteReview] =
		useState<ReviewItem | null>(null);

	const filteredReviews = useMemo(
		() =>
			ratingFilter === null
				? reviews
				: reviews.filter((r) => r.rating === ratingFilter),
		[reviews, ratingFilter],
	);

	const filterSignature = `${ratingFilter ?? "all"}`;

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
	} = useInfiniteList(filteredReviews, { filterKey: filterSignature });

	useIncrementalReveal(listRef, visibleReviews.length, filterSignature);

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-bold text-foreground">
				Ulasan Komunitas (
				{ratingFilter === null
					? reviews.length
					: `${filteredReviews.length} dari ${reviews.length}`}
				)
			</h2>

			{reviews.length === 0 ? (
				<div className="py-10 text-center space-y-2">
					<h3 className="text-base font-semibold text-foreground">
						Belum ada ulasan untuk tempat ini
					</h3>
					<p className="text-sm text-muted-foreground">
						Jadilah kontributor pertama yang membagikan pengalaman rasa dan
						harga di sini.
					</p>
				</div>
			) : !isInitialLoading && filteredReviews.length === 0 ? (
				<div className="py-10 text-center space-y-3">
					<h3 className="text-base font-semibold text-foreground">
						Belum ada ulasan dengan rating {ratingFilter} bintang
					</h3>
					<p className="text-sm text-muted-foreground">
						Pilih filter bintang lain atau tampilkan semua ulasan komunitas.
					</p>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={onClearFilter}
					>
						Tampilkan Semua Ulasan
					</Button>
				</div>
			) : isInitialLoading && visibleReviews.length === 0 ? (
				<ReviewListSkeleton
					count={Math.min(batchSize, filteredReviews.length)}
				/>
			) : (
				<>
					<ul ref={listRef} className="divide-y divide-border">
						{visibleReviews.map((rev) => {
							const liked = isReviewLiked(rev.id);
							const likeCount = getReviewLikeCount(rev.id);
							return (
								<ReviewCardItem
									key={rev.id}
									review={rev}
									beforeReply={
										<div className="flex items-center justify-between gap-3 pt-0.5">
											<button
												type="button"
												onClick={() => onToggleReviewLike(rev.id)}
												aria-pressed={liked}
												aria-label={
													liked
														? `Batal suka ulasan ${rev.authorName}`
														: `Suka ulasan ${rev.authorName}`
												}
												className={cn(
													"group/like inline-flex items-center gap-1.5 bg-transparent p-0 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
													liked
														? "text-primary"
														: "text-muted-foreground hover:text-primary",
												)}
											>
												<ThumbsUp
													className={cn(
														"size-4 transition-[color,transform,fill] duration-150 group-hover/like:scale-110",
														liked ? "fill-primary text-primary" : "",
													)}
													aria-hidden="true"
												/>
												<span className="tabular-nums">{likeCount}</span>
											</button>

											{onDeleteReview &&
											(rev.userId === currentUserId || canDeleteAnyReview) ? (
												<button
													type="button"
													onClick={() => setPendingDeleteReview(rev)}
													aria-label={`Hapus ulasan ${rev.authorName}`}
													title="Hapus ulasan"
													className="group/delete inline-flex items-center justify-center bg-transparent p-0 text-muted-foreground transition-colors hover:text-red-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
												>
													<Trash2
														className="size-4 transition-[color,transform] duration-150 group-hover/delete:scale-110"
														aria-hidden="true"
													/>
												</button>
											) : null}
										</div>
									}
								/>
							);
						})}
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

			<Dialog
				open={Boolean(pendingDeleteReview)}
				onOpenChange={(open) => {
					if (!open) setPendingDeleteReview(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Hapus ulasan ini?</DialogTitle>
						<DialogDescription>
							Ulasan yang dihapus akan dihilangkan dari halaman tempat dan
							rata-rata rating akan diperbarui otomatis.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setPendingDeleteReview(null)}
						>
							Batal
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={() => {
								if (pendingDeleteReview && onDeleteReview) {
									onDeleteReview(pendingDeleteReview.id);
								}
								setPendingDeleteReview(null);
							}}
						>
							Hapus Ulasan
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
