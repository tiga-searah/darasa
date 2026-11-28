import { Star, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PlacePagination } from "~/components/place-pagination";
import { Button } from "~/components/ui/button";
import { DEFAULT_PLACES_PAGE_SIZE, paginateItems } from "~/lib/pagination";
import type { ReviewItem } from "~/lib/types";
import { cn } from "~/lib/utils";

interface PlaceReviewListProps {
	reviews: ReviewItem[];
	ratingFilter: number | null;
	onClearFilter: () => void;
	isReviewLiked: (reviewId: string) => boolean;
	getReviewLikeCount: (reviewId: string) => number;
	onToggleReviewLike: (reviewId: string) => void;
}

export function PlaceReviewList({
	reviews,
	ratingFilter,
	onClearFilter,
	isReviewLiked,
	getReviewLikeCount,
	onToggleReviewLike,
}: PlaceReviewListProps) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PLACES_PAGE_SIZE);

	useEffect(() => {
		const _filter = ratingFilter;
		if (_filter !== undefined) {
			setPage(1);
		}
	}, [ratingFilter]);

	const filteredReviews = useMemo(
		() =>
			ratingFilter === null
				? reviews
				: reviews.filter((r) => r.rating === ratingFilter),
		[reviews, ratingFilter],
	);

	const pagination = useMemo(
		() => paginateItems(filteredReviews, page, pageSize),
		[filteredReviews, page, pageSize],
	);

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
			) : filteredReviews.length === 0 ? (
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
			) : (
				<>
					<ul className="divide-y divide-border">
						{pagination.items.map((rev) => {
							const liked = isReviewLiked(rev.id);
							const likeCount = getReviewLikeCount(rev.id);
							return (
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
									</div>

									{rev.ownerReply ? (
										<div className="mt-2 rounded-[10px] border border-border bg-muted/45 p-3.5 space-y-1">
											<p className="text-xs font-semibold text-primary-hover">
												{rev.ownerReply.authorName}
											</p>
											<p className="text-sm text-muted-foreground leading-relaxed">
												{rev.ownerReply.message}
											</p>
										</div>
									) : null}
								</li>
							);
						})}
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
	);
}
