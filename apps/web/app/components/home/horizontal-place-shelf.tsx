import { ArrowRight, Eye, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { BookmarkIconButton, PlaceScoreBadge } from "~/components/place-card";
import { Button } from "~/components/ui/button";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { CarouselDots, getScrollBehavior } from "./carousel-dots";

interface HorizontalPlaceShelfProps {
	headingId: string;
	title: string;
	items: PlaceWithMetrics[];
	mode: "hidden-gem" | "newest";
	viewAllTo?: string;
	onViewAll?: () => void;
	viewAllLabel: string;
	isBookmarked: (placeId: string) => boolean;
	onToggleBookmark: (placeId: string) => void;
}

export function HorizontalPlaceShelf({
	headingId,
	title,
	items,
	mode,
	viewAllTo,
	onViewAll,
	viewAllLabel,
	isBookmarked,
	onToggleBookmark,
}: HorizontalPlaceShelfProps) {
	const trackRef = useRef<HTMLDivElement>(null);
	const [pageCount, setPageCount] = useState(1);
	const [activePage, setActivePage] = useState(0);

	const syncMetrics = useCallback(() => {
		const track = trackRef.current;
		if (!track) return;
		const { scrollLeft, scrollWidth, clientWidth } = track;
		const maxScroll = Math.max(0, scrollWidth - clientWidth);

		if (maxScroll <= 4 || clientWidth <= 0) {
			setPageCount(1);
			setActivePage(0);
			return;
		}

		const estimatedPages = Math.min(
			Math.max(2, Math.ceil(scrollWidth / Math.max(1, clientWidth * 0.85))),
			5,
		);
		const progress = Math.min(1, Math.max(0, scrollLeft / maxScroll));
		const nextActive = Math.round(progress * (estimatedPages - 1));
		setPageCount(estimatedPages);
		setActivePage(nextActive);
	}, []);

	useEffect(() => {
		const itemTotal = items.length;
		if (itemTotal < 0) return;
		const frame = window.requestAnimationFrame(syncMetrics);
		window.addEventListener("resize", syncMetrics);
		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener("resize", syncMetrics);
		};
	}, [items.length, syncMetrics]);

	useEffect(() => {
		const track = trackRef.current;
		if (!track) return;

		const handleWheel = (event: WheelEvent) => {
			if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
			if (Math.abs(event.deltaY) < 1) return;

			const maxScroll = track.scrollWidth - track.clientWidth;
			if (maxScroll <= 4) return;

			const goingRight = event.deltaY > 0;
			const atStart = track.scrollLeft <= 2;
			const atEnd = track.scrollLeft >= maxScroll - 2;

			if ((goingRight && !atEnd) || (!goingRight && !atStart)) {
				event.preventDefault();
				track.scrollLeft += event.deltaY;
			}
		};

		track.addEventListener("wheel", handleWheel, { passive: false });
		return () => track.removeEventListener("wheel", handleWheel);
	}, []);

	const scrollToPage = (pageIndex: number) => {
		const track = trackRef.current;
		if (!track || pageCount <= 1) return;
		const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
		const targetLeft = (pageIndex / (pageCount - 1)) * maxScroll;
		track.scrollTo({
			left: targetLeft,
			behavior: getScrollBehavior(),
		});
	};

	return (
		<section aria-labelledby={headingId} className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2
					id={headingId}
					className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
				>
					{title}
				</h2>

				{viewAllTo ? (
					<Button
						asChild
						variant="ghost"
						size="icon"
						className="size-11 rounded-full"
					>
						<Link to={viewAllTo} aria-label={viewAllLabel} title={viewAllLabel}>
							<ArrowRight className="size-5" aria-hidden="true" />
						</Link>
					</Button>
				) : onViewAll ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={onViewAll}
						aria-label={viewAllLabel}
						title={viewAllLabel}
						className="size-11 rounded-full"
					>
						<ArrowRight className="size-5" aria-hidden="true" />
					</Button>
				) : null}
			</div>

			{items.length === 0 ? (
				<div className="rounded-[12px] border border-border bg-card p-6 text-center">
					<p className="text-sm font-medium text-foreground">
						Belum ada tempat kuliner pada bagian ini.
					</p>
				</div>
			) : (
				<>
					<div
						ref={trackRef}
						onScroll={syncMetrics}
						className="darasa-shelf-scroll flex gap-4 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory"
					>
						{items.map((place) => {
							const saved = isBookmarked(place.id);
							return (
								<article
									key={`${mode}-${place.id}`}
									className="group relative flex w-[256px] shrink-0 snap-start flex-col overflow-hidden rounded-[12px] border border-border bg-card transition-colors hover:border-input sm:w-[272px]"
								>
									<div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
										<img
											src={place.photos[0] ?? "/images/megono-batang.svg"}
											alt={`Sajian ${place.name} di ${place.district}`}
											width={544}
											height={340}
											loading="lazy"
											className="h-full w-full object-cover"
										/>
										{mode === "hidden-gem" ? (
											<div className="absolute right-2.5 top-2.5">
												<PlaceScoreBadge
													mode="hidden-gem"
													score={place.hiddenGemScore}
												/>
											</div>
										) : null}
									</div>

									<div className="flex flex-1 flex-col gap-2 p-3.5">
										<div className="flex items-start justify-between gap-2">
											<h3 className="min-w-0 flex-1 line-clamp-2 text-sm font-bold leading-snug text-foreground">
												<Link
													to={`/places/${place.slug}`}
													className="after:absolute after:inset-0 after:rounded-[12px] focus-visible:outline-none"
												>
													{place.name}
												</Link>
											</h3>
											<BookmarkIconButton
												placeName={place.name}
												saved={saved}
												onToggle={() => onToggleBookmark(place.id)}
											/>
										</div>

										<p className="truncate text-xs text-muted-foreground">
											{place.district} · {place.category}
										</p>

										<div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
											<span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
												<Star
													className="size-3.5 fill-accent-yellow text-accent-yellow"
													aria-hidden="true"
												/>
												{place.reviewCount > 0
													? place.averageRating.toFixed(1)
													: "Baru"}
												<span className="font-normal text-muted-foreground">
													({place.reviewCount})
												</span>
											</span>
											<span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
												<Eye
													className="size-3.5 text-primary"
													aria-hidden="true"
												/>
												{place.views.toLocaleString("id-ID")}
											</span>
										</div>
									</div>
								</article>
							);
						})}
					</div>

					<CarouselDots
						count={pageCount}
						activeIndex={activePage}
						labelPrefix={`Halaman ${title}`}
						onSelect={scrollToPage}
					/>
				</>
			)}
		</section>
	);
}
