import { cn } from "~/lib/utils";

interface ReviewListSkeletonProps {
	count: number;
	withTopBorder?: boolean;
}

/**
 * Loading skeleton placeholder matching review list items during initial batch load.
 */
export function ReviewListSkeleton({
	count,
	withTopBorder = false,
}: ReviewListSkeletonProps) {
	if (count <= 0) return null;

	const skeletonKeys = Array.from(
		{ length: count },
		(_, idx) => `review-skeleton-${idx}`,
	);

	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Memuat daftar ulasan"
			className={cn(
				"divide-y divide-border",
				withTopBorder && "border-t border-border",
			)}
		>
			{skeletonKeys.map((key) => (
				<div key={key} aria-hidden="true" className="py-5 space-y-3">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2.5">
							<div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
							<div className="space-y-1.5">
								<div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
								<div className="h-3 w-20 animate-pulse rounded bg-muted" />
							</div>
						</div>
						<div className="h-4 w-24 animate-pulse rounded bg-muted" />
					</div>
					<div className="space-y-1.5">
						<div className="h-3.5 w-full animate-pulse rounded bg-muted" />
						<div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
					</div>
				</div>
			))}
		</div>
	);
}
