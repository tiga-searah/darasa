import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { formatShortIndonesianDate } from "~/lib/format";
import type { ReviewItem } from "~/lib/types";
import { cn } from "~/lib/utils";

interface ReviewCardItemProps {
	review: ReviewItem;
	/** Rendered between the photo and ownerReply (e.g. like/delete buttons). */
	beforeReply?: ReactNode;
	/** Rendered when there is no ownerReply (e.g. owner inline reply form). */
	replyFallback?: ReactNode;
}

export function ReviewCardItem({
	review,
	beforeReply,
	replyFallback,
}: ReviewCardItemProps) {
	return (
		<li className="py-5 space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2.5">
					<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
						{review.authorName.slice(0, 1).toUpperCase()}
					</span>
					<div>
						<p className="text-sm font-semibold text-foreground">
							{review.authorName}
						</p>
						<p className="text-xs text-muted-foreground">
							{formatShortIndonesianDate(review.createdAt)}
						</p>
					</div>
				</div>

				<div
					role="img"
					className="flex items-center gap-0.5"
					aria-label={`${review.rating} dari 5 bintang`}
				>
					{[1, 2, 3, 4, 5].map((starValue) => (
						<Star
							key={starValue}
							className={cn(
								"size-4",
								starValue <= review.rating
									? "fill-accent-yellow text-accent-yellow"
									: "text-border",
							)}
							aria-hidden="true"
						/>
					))}
				</div>
			</div>

			<p className="text-sm leading-relaxed text-foreground">
				{review.comment}
			</p>

			{review.photoUrl ? (
				<img
					src={review.photoUrl}
					alt={`Foto ulasan oleh ${review.authorName}`}
					width={360}
					height={220}
					className="mt-2 h-44 w-full max-w-xs rounded-[10px] border border-border object-cover"
				/>
			) : null}

			{beforeReply}

			{review.ownerReply ? (
				<div className="mt-2 rounded-[10px] border border-border bg-muted/45 p-3.5 space-y-1">
					<p className="text-xs font-semibold text-primary-hover">
						{review.ownerReply.authorName}
					</p>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{review.ownerReply.message}
					</p>
				</div>
			) : (
				replyFallback
			)}
		</li>
	);
}
