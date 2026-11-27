import gsap from "gsap";
import {
	ArrowRight,
	Bookmark,
	Coffee,
	Cookie,
	Eye,
	Gem,
	MapPin,
	MessageSquare,
	PlusCircle,
	RotateCcw,
	Soup,
	Star,
	Utensils,
} from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link, useNavigate } from "react-router";
import { BookmarkIconButton, PlaceScoreBadge } from "~/components/place-card";
import { Button } from "~/components/ui/button";
import { type PlaceWithMetrics, useDarasa } from "~/context/darasa-store";
import { BATANG_DISTRICTS, PLACE_CATEGORIES } from "~/data/batang-places";
import type { PlaceCategory } from "~/lib/types";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Home | Darasa" },
		{
			name: "description",
			content:
				"Beranda Darasa: kuliner populer Batang, pembaruan ulasan terbaru, hidden gem, tempat baru ditambahkan, serta direktori kategori dan kawasan.",
		},
	];
}

interface UpdateFeedEntry {
	id: string;
	kind: "review" | "place";
	place: PlaceWithMetrics;
	title: string;
	snippet: string;
	actorName: string;
	rating?: number;
	timestamp: string;
}

const CATEGORY_ICON_MAP: Record<PlaceCategory, typeof Soup> = {
	"Makanan berat": Soup,
	Minuman: Coffee,
	"Street food": Utensils,
	Dessert: Cookie,
};

function formatShortDate(isoDate: string): string {
	const parsed = Date.parse(isoDate);
	if (Number.isNaN(parsed)) return "Baru";
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(parsed));
}

function getScrollBehavior(): ScrollBehavior {
	if (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		return "auto";
	}
	return "smooth";
}

interface CarouselDotsProps {
	count: number;
	activeIndex: number;
	labelPrefix: string;
	onSelect: (index: number) => void;
}

function CarouselDots({
	count,
	activeIndex,
	labelPrefix,
	onSelect,
}: CarouselDotsProps) {
	if (count <= 1) return null;
	const indices = Array.from({ length: count }, (_, idx) => idx);

	return (
		<div className="flex items-center justify-center gap-0.5 pt-1">
			{indices.map((idx) => {
				const distance = Math.abs(idx - activeIndex);
				const isActive = distance === 0;
				const dotSizeClass = isActive
					? "size-3 bg-primary"
					: distance === 1
						? "size-2 bg-muted-foreground/50 group-hover:bg-foreground/70"
						: "size-1.5 bg-muted-foreground/30 group-hover:bg-foreground/60";

				return (
					<button
						key={`${labelPrefix}-dot-${idx + 1}`}
						type="button"
						onClick={() => onSelect(idx)}
						aria-current={isActive ? "true" : undefined}
						aria-label={`${labelPrefix} ${idx + 1} dari ${count}`}
						className="group inline-flex h-11 min-w-[28px] items-center justify-center rounded-[6px] px-1 transition-colors"
					>
						<span
							aria-hidden="true"
							className={cn(
								"block rounded-full transition-all duration-200",
								dotSizeClass,
							)}
						/>
					</button>
				);
			})}
		</div>
	);
}

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

function HorizontalPlaceShelf({
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

	// Convert vertical wheel scroll inside the section into smooth horizontal scroll until reaching edges
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

export default function HomePage() {
	const {
		places,
		hydrated,
		isBookmarked,
		toggleBookmark,
		setExploreFilters,
		resetExploreFilters,
		resetPrototypeData,
	} = useDarasa();
	const navigate = useNavigate();

	const [spotlightIndex, setSpotlightIndex] = useState(0);
	const spotlightIndexRef = useRef(0);
	const spotlightTrackRef = useRef<HTMLDivElement>(null);
	const spotlightBgTrackRef = useRef<HTMLDivElement>(null);
	const lastSpotlightWheelAtRef = useRef(0);
	const spotlightWrapTimerRef = useRef<number | null>(null);
	const spotlightTweenRef = useRef<gsap.core.Tween | null>(null);
	const programmaticTargetSlotRef = useRef<number | null>(null);
	const [spotlightAutoTick, setSpotlightAutoTick] = useState(0);

	useEffect(() => {
		spotlightIndexRef.current = spotlightIndex;
	}, [spotlightIndex]);

	// Spotlight sorted by popularity (reviewCount -> averageRating -> exploreScore)
	const popularSpotlightPlaces = useMemo(
		() =>
			[...places]
				.sort(
					(a, b) =>
						b.reviewCount - a.reviewCount ||
						b.averageRating - a.averageRating ||
						b.exploreScore - a.exploreScore,
				)
				.slice(0, 5),
		[places],
	);

	const spotlightSlides = useMemo(
		() =>
			popularSpotlightPlaces.length > 1
				? [...popularSpotlightPlaces, popularSpotlightPlaces[0]]
				: popularSpotlightPlaces,
		[popularSpotlightPlaces],
	);

	const safeSpotlightIndex =
		popularSpotlightPlaces.length > 0
			? Math.min(spotlightIndex, popularSpotlightPlaces.length - 1)
			: 0;

	const newestPlaces = useMemo(
		() =>
			[...places].sort(
				(a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
			),
		[places],
	);

	const hiddenGemPlaces = useMemo(
		() =>
			[...places]
				.filter((p) => p.hiddenGemEligible)
				.sort((a, b) => b.hiddenGemScore - a.hiddenGemScore),
		[places],
	);

	const updateEntries = useMemo<UpdateFeedEntry[]>(() => {
		const entries: UpdateFeedEntry[] = [];

		for (const place of places) {
			const latestReview = place.reviews[0];
			if (latestReview) {
				entries.push({
					id: `rev-${latestReview.id}`,
					kind: "review",
					place,
					title: place.name,
					snippet: latestReview.comment,
					actorName: latestReview.authorName,
					rating: latestReview.rating,
					timestamp: latestReview.createdAt,
				});
			} else {
				entries.push({
					id: `plc-${place.id}`,
					kind: "place",
					place,
					title: place.name,
					snippet: place.description,
					actorName: place.submittedByName,
					timestamp: place.createdAt,
				});
			}
		}

		entries.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
		return entries.slice(0, 9);
	}, [places]);

	const openExploreWith = useCallback(
		(preset: Parameters<typeof setExploreFilters>[0]) => {
			resetExploreFilters();
			setExploreFilters(preset);
			navigate("/explore");
		},
		[navigate, resetExploreFilters, setExploreFilters],
	);

	const clearSpotlightWrapTimer = useCallback(() => {
		if (spotlightWrapTimerRef.current !== null) {
			window.clearTimeout(spotlightWrapTimerRef.current);
			spotlightWrapTimerRef.current = null;
		}
		if (spotlightTweenRef.current) {
			spotlightTweenRef.current.kill();
			spotlightTweenRef.current = null;
		}
	}, []);

	const syncBgTrackScroll = useCallback(() => {
		const track = spotlightTrackRef.current;
		const bgTrack = spotlightBgTrackRef.current;
		if (!track || !bgTrack || track.clientWidth <= 0) return;
		const ratio = track.scrollLeft / track.clientWidth;
		bgTrack.scrollLeft = ratio * bgTrack.clientWidth;
	}, []);

	const resetSpotlightToStartInstant = useCallback(() => {
		const track = spotlightTrackRef.current;
		if (!track) return;
		programmaticTargetSlotRef.current = null;
		track.style.scrollSnapType = "";
		track.style.scrollBehavior = "auto";
		track.scrollLeft = 0;
		if (spotlightBgTrackRef.current) {
			spotlightBgTrackRef.current.scrollLeft = 0;
		}
		window.requestAnimationFrame(() => {
			if (spotlightTrackRef.current) {
				spotlightTrackRef.current.style.scrollBehavior = "";
			}
		});
	}, []);

	const scrollSpotlightTo = useCallback(
		(nextIndex: number) => {
			const total = popularSpotlightPlaces.length;
			if (total === 0) return;

			clearSpotlightWrapTimer();
			const isCloneWrap = total > 1 && nextIndex === total;
			const logicalIndex = isCloneWrap
				? 0
				: Math.max(0, Math.min(total - 1, nextIndex));

			spotlightIndexRef.current = logicalIndex;
			setSpotlightIndex(logicalIndex);

			const track = spotlightTrackRef.current;
			if (!track) return;

			const behavior = getScrollBehavior();
			if (behavior === "auto") {
				if (isCloneWrap) {
					resetSpotlightToStartInstant();
				} else {
					programmaticTargetSlotRef.current = null;
					track.style.scrollSnapType = "";
					track.style.scrollBehavior = "auto";
					track.scrollLeft = logicalIndex * track.clientWidth;
					syncBgTrackScroll();
				}
				return;
			}

			const targetSlot = isCloneWrap ? total : logicalIndex;
			programmaticTargetSlotRef.current = targetSlot;
			track.style.scrollSnapType = "none";
			track.style.scrollBehavior = "auto";

			spotlightTweenRef.current = gsap.to(track, {
				scrollLeft: targetSlot * track.clientWidth,
				duration: 0.8,
				ease: "power3.inOut",
				onUpdate: syncBgTrackScroll,
				onComplete: () => {
					spotlightTweenRef.current = null;
					if (isCloneWrap) {
						resetSpotlightToStartInstant();
					} else {
						track.style.scrollSnapType = "";
						track.style.scrollBehavior = "";
						programmaticTargetSlotRef.current = null;
						syncBgTrackScroll();
					}
				},
			});
		},
		[
			clearSpotlightWrapTimer,
			popularSpotlightPlaces.length,
			resetSpotlightToStartInstant,
			syncBgTrackScroll,
		],
	);

	const scrollSpotlightManual = useCallback(
		(nextIndex: number) => {
			setSpotlightAutoTick((tick) => tick + 1);
			scrollSpotlightTo(nextIndex);
		},
		[scrollSpotlightTo],
	);

	const handleSpotlightScroll = useCallback(() => {
		const track = spotlightTrackRef.current;
		const total = popularSpotlightPlaces.length;
		if (!track || track.clientWidth <= 0 || total === 0) return;

		syncBgTrackScroll();

		if (programmaticTargetSlotRef.current !== null) {
			const targetLeft = programmaticTargetSlotRef.current * track.clientWidth;
			if (Math.abs(track.scrollLeft - targetLeft) < 2) {
				programmaticTargetSlotRef.current = null;
			}
			return;
		}

		const rawIdx = Math.round(track.scrollLeft / track.clientWidth);
		const nextIdx = rawIdx >= total ? 0 : Math.max(0, rawIdx);
		if (nextIdx !== spotlightIndexRef.current) {
			spotlightIndexRef.current = nextIdx;
			setSpotlightIndex(nextIdx);
			setSpotlightAutoTick((tick) => tick + 1);
		}
	}, [popularSpotlightPlaces.length, syncBgTrackScroll]);

	useEffect(() => {
		return () => clearSpotlightWrapTimer();
	}, [clearSpotlightWrapTimer]);

	useEffect(() => {
		const track = spotlightTrackRef.current;
		const total = popularSpotlightPlaces.length;
		if (!track || total <= 1) return;

		const handleScrollEnd = () => {
			if (track.clientWidth <= 0) return;
			programmaticTargetSlotRef.current = null;
			const currentSlot = Math.round(track.scrollLeft / track.clientWidth);
			if (currentSlot >= total) {
				clearSpotlightWrapTimer();
				resetSpotlightToStartInstant();
			}
		};

		track.addEventListener("scrollend", handleScrollEnd);
		return () => track.removeEventListener("scrollend", handleScrollEnd);
	}, [
		clearSpotlightWrapTimer,
		popularSpotlightPlaces.length,
		resetSpotlightToStartInstant,
	]);

	// Scroll inside the Spotlight section slides between popular places cleanly while letting edge scrolls pass through
	useEffect(() => {
		const track = spotlightTrackRef.current;
		const total = popularSpotlightPlaces.length;
		if (!track || total <= 1) return;

		const handleWheel = (event: WheelEvent) => {
			if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
			if (Math.abs(event.deltaY) < 4) return;

			const currentIdx = spotlightIndexRef.current;
			const goingNext = event.deltaY > 0;
			const atFirst = currentIdx <= 0;
			const atLast = currentIdx >= total - 1;

			if ((goingNext && atLast) || (!goingNext && atFirst)) {
				return;
			}

			event.preventDefault();
			const now = Date.now();
			if (now - lastSpotlightWheelAtRef.current < 320) return;
			lastSpotlightWheelAtRef.current = now;
			scrollSpotlightManual(currentIdx + (goingNext ? 1 : -1));
		};

		track.addEventListener("wheel", handleWheel, { passive: false });
		return () => track.removeEventListener("wheel", handleWheel);
	}, [popularSpotlightPlaces.length, scrollSpotlightManual]);

	useEffect(() => {
		const total = popularSpotlightPlaces.length;
		if (!hydrated || total <= 1) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const _resetOnManual = spotlightAutoTick;
		if (_resetOnManual < 0) return;

		const timer = window.setInterval(() => {
			if (document.hidden) return;
			scrollSpotlightTo(spotlightIndexRef.current + 1);
		}, 7000);

		return () => window.clearInterval(timer);
	}, [
		hydrated,
		popularSpotlightPlaces.length,
		scrollSpotlightTo,
		spotlightAutoTick,
	]);

	const handleSpotlightKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (popularSpotlightPlaces.length <= 1) return;
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			scrollSpotlightManual(
				safeSpotlightIndex === 0
					? popularSpotlightPlaces.length - 1
					: safeSpotlightIndex - 1,
			);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			scrollSpotlightManual(safeSpotlightIndex + 1);
		}
	};

	if (!hydrated) {
		return (
			<div className="space-y-8 pb-8" aria-busy="true">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Kuliner Populer Batang
					</h1>
					<p role="status" className="text-sm text-muted-foreground">
						Memuat katalog kuliner Batang...
					</p>
				</div>
				<div className="h-[260px] rounded-[12px] bg-muted/60" />
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"].map((key) => (
						<div
							key={key}
							className="h-24 rounded-[10px] border border-border bg-muted/50"
						/>
					))}
				</div>
			</div>
		);
	}

	if (!Array.isArray(places) || places.length === 0) {
		return (
			<section
				aria-labelledby="home-empty-heading"
				className="mx-auto my-8 max-w-xl rounded-[16px] border border-border bg-card p-6 text-center sm:p-8"
			>
				<h1
					id="home-empty-heading"
					className="text-xl font-bold text-foreground sm:text-2xl"
				>
					Belum Ada Tempat Kuliner Tersedia
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Katalog beranda belum memiliki data warung atau kedai. Anda dapat
					menambahkan tempat baru atau memulihkan data bawaan prototipe.
				</p>
				<div className="mt-5 flex flex-wrap items-center justify-center gap-3">
					<Button asChild className="min-h-[44px] rounded-[8px]">
						<Link to="/contribute/add-place">
							<PlusCircle className="size-4" aria-hidden="true" />
							Tambahkan Tempat Kuliner
						</Link>
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={resetPrototypeData}
						className="min-h-[44px] rounded-[8px] border-input"
					>
						<RotateCcw className="size-4" aria-hidden="true" />
						Muat Ulang Data Bawaan
					</Button>
				</div>
			</section>
		);
	}

	return (
		<div className="space-y-10 pb-8">
			{/* 1. Kuliner Populer (MangaDex Popular Spotlight Carousel) */}
			<section
				aria-labelledby="home-popular-heading"
				onKeyDown={handleSpotlightKeyDown}
				className="relative -mt-[6rem] space-y-3 pt-[6.5rem] pb-6 xl:-mt-[6rem] xl:pt-[6.5rem]"
			>
				{/* Dynamic Food Photo Backdrop matching current spotlight place */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 left-1/2 w-[100vw] -translate-x-1/2 overflow-hidden"
				>
					<div
						ref={spotlightBgTrackRef}
						className="flex h-full w-full overflow-hidden"
					>
						{spotlightSlides.map((spot, idx) => {
							const isClone =
								popularSpotlightPlaces.length > 1 &&
								idx === popularSpotlightPlaces.length;
							return (
								<div
									key={isClone ? `bg-${spot.id}-clone` : `bg-${spot.id}`}
									className="h-full w-full shrink-0"
								>
									<img
										src={spot.photos[0] ?? "/images/megono-batang.svg"}
										alt=""
										className="h-full w-full object-cover opacity-95 dark:opacity-85"
									/>
								</div>
							);
						})}
					</div>
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/55 to-card" />
				</div>

				<div className="relative z-10">
					<h1
						id="home-popular-heading"
						className="text-2xl font-bold tracking-tight text-foreground sm:text-[30px] sm:leading-tight"
					>
						Kuliner Populer Batang
					</h1>
				</div>

				<div
					ref={spotlightTrackRef}
					onScroll={handleSpotlightScroll}
					className="darasa-shelf-scroll relative z-10 flex overflow-x-auto snap-x snap-mandatory"
				>
					{spotlightSlides.map((place, idx) => {
						const isClone =
							popularSpotlightPlaces.length > 1 &&
							idx === popularSpotlightPlaces.length;
						const displayRank = isClone ? 1 : idx + 1;
						const saved = isBookmarked(place.id);

						return (
							<article
								key={isClone ? `${place.id}-clone` : place.id}
								aria-hidden={isClone || undefined}
								inert={isClone || undefined}
								className="w-full shrink-0 snap-center"
							>
								<div className="grid grid-cols-1 gap-5 py-2 md:grid-cols-12 md:items-center md:gap-7">
									<Link
										to={`/places/${place.slug}`}
										className="group relative block overflow-hidden rounded-[12px] bg-muted md:col-span-5 lg:col-span-4"
									>
										<div className="aspect-[16/10] w-full overflow-hidden">
											<img
												src={place.photos[0] ?? "/images/megono-batang.svg"}
												alt={`Sajian ${place.name} di ${place.district}`}
												width={800}
												height={500}
												fetchPriority={idx === 0 ? "high" : "auto"}
												className="h-full w-full object-cover"
											/>
										</div>
									</Link>

									<div className="flex min-w-0 flex-col justify-between gap-5 md:col-span-7 lg:col-span-8">
										<div className="space-y-3">
											<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-foreground">
												<span className="text-primary tabular-nums">
													Populer #{displayRank}
												</span>
												<span aria-hidden="true">·</span>
												<span>{place.category}</span>
												{place.hiddenGemEligible ? (
													<>
														<span aria-hidden="true">·</span>
														<span
															title="Hidden Gems"
															className="inline-flex items-center text-yellow-text"
														>
															<Gem
																className="size-4 fill-[#f7c95c] dark:fill-[#f7c95c]/30"
																aria-hidden="true"
															/>
															<span className="sr-only">Hidden Gems</span>
														</span>
													</>
												) : null}
											</div>

											<h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-[28px] lg:leading-tight">
												<Link to={`/places/${place.slug}`}>{place.name}</Link>
											</h2>

											<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-foreground">
												<span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
													<Star
														className="size-3.5 fill-accent-yellow text-accent-yellow"
														aria-hidden="true"
													/>
													{place.reviewCount > 0
														? place.averageRating.toFixed(1)
														: "Baru"}
													<span className="font-medium text-foreground/90">
														({place.reviewCount} ulasan)
													</span>
												</span>
												<span className="inline-flex items-center gap-1 font-semibold text-foreground">
													<MapPin
														className="size-4 shrink-0 text-primary"
														aria-hidden="true"
													/>
													{place.district}
												</span>
												<span className="font-semibold text-foreground tabular-nums">
													{place.priceRange}
												</span>
											</div>

											<p className="max-w-2xl text-sm font-medium leading-relaxed text-foreground line-clamp-2">
												{place.description}
											</p>

											<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-foreground/90">
												<span>{place.openingHours}</span>
												<span aria-hidden="true">·</span>
												<span className="inline-flex items-center gap-1 tabular-nums">
													<Eye
														className="size-3.5 text-primary"
														aria-hidden="true"
													/>
													{place.views.toLocaleString("id-ID")} dilihat
												</span>
												<span aria-hidden="true">·</span>
												<span>
													{place.isPendingModeration
														? "Menunggu Validasi"
														: place.verificationStatus === "owner_verified"
															? "Terverifikasi Pemilik"
															: place.verificationStatus ===
																	"community_verified"
																? "Terverifikasi Komunitas"
																: "Belum Terverifikasi"}
												</span>
											</div>
										</div>

										<div className="flex flex-wrap items-center gap-2.5 pt-2">
											<Button
												asChild
												className="min-h-[44px] rounded-[8px] px-5"
											>
												<Link to={`/places/${place.slug}`}>Lihat Detail</Link>
											</Button>
											<button
												type="button"
												onClick={() => toggleBookmark(place.id)}
												aria-pressed={saved}
												aria-label={
													saved
														? `Hapus ${place.name} dari bookmark`
														: `Simpan ${place.name} ke bookmark`
												}
												className={cn(
													"inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border px-3.5 text-sm font-semibold transition-colors",
													saved
														? "border-primary bg-primary-soft text-primary-hover"
														: "border-input bg-background/85 text-foreground hover:bg-background",
												)}
											>
												<Bookmark
													className={cn(
														"size-4",
														saved ? "fill-primary text-primary" : "",
													)}
													aria-hidden="true"
												/>
												<span>{saved ? "Tersimpan" : "Simpan"}</span>
											</button>
										</div>
									</div>
								</div>
							</article>
						);
					})}
				</div>

				<div className="relative z-10">
					<CarouselDots
						count={popularSpotlightPlaces.length}
						activeIndex={safeSpotlightIndex}
						labelPrefix="Sorotan populer"
						onSelect={scrollSpotlightManual}
					/>
				</div>
			</section>

			{/* 2. Pembaruan Terbaru (MangaDex Latest Updates) */}
			<section aria-labelledby="home-updates-heading" className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2
						id="home-updates-heading"
						className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
					>
						Pembaruan Terbaru
					</h2>

					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => openExploreWith({ sortBy: "newest" })}
						aria-label="Lihat Semua Terbaru"
						title="Lihat Semua Terbaru"
						className="size-11 rounded-full"
					>
						<ArrowRight className="size-5" aria-hidden="true" />
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{updateEntries.map((entry) => (
						<article
							key={entry.id}
							className="group relative flex items-start gap-3 rounded-[10px] border border-border bg-card p-3 transition-colors hover:border-input hover:bg-muted/40"
						>
							<div className="w-[88px] shrink-0 overflow-hidden rounded-[8px] border border-border bg-muted">
								<img
									src={entry.place.photos[0] ?? "/images/megono-batang.svg"}
									alt=""
									width={176}
									height={110}
									loading="lazy"
									className="aspect-[16/10] w-full object-cover"
								/>
							</div>

							<div className="min-w-0 flex-1 space-y-1">
								<div className="flex items-start justify-between gap-2">
									<h3 className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
										<Link
											to={`/places/${entry.place.slug}`}
											className="after:absolute after:inset-0 after:rounded-[10px] focus-visible:outline-none"
										>
											{entry.title}
										</Link>
									</h3>
									{entry.kind === "review" && entry.rating ? (
										<span className="inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-yellow-soft px-1.5 py-0.5 text-[11px] font-bold text-yellow-text tabular-nums">
											<Star
												className="size-3 fill-current"
												aria-hidden="true"
											/>
											{entry.rating.toFixed(1)}
										</span>
									) : (
										<span className="shrink-0 rounded-[6px] bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
											Baru
										</span>
									)}
								</div>

								<p className="line-clamp-1 text-xs text-muted-foreground">
									{entry.snippet}
								</p>

								<div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
									<span className="inline-flex min-w-0 flex-1 items-center gap-1">
										{entry.kind === "review" ? (
											<MessageSquare
												className="size-3 shrink-0 text-primary"
												aria-hidden="true"
											/>
										) : (
											<PlusCircle
												className="size-3 shrink-0 text-primary"
												aria-hidden="true"
											/>
										)}
										<span className="truncate font-medium text-foreground">
											{entry.actorName}
										</span>
										<span aria-hidden="true" className="shrink-0">
											·
										</span>
										<span className="truncate">{entry.place.district}</span>
									</span>
									<time
										dateTime={entry.timestamp}
										className="shrink-0 tabular-nums"
									>
										{formatShortDate(entry.timestamp)}
									</time>
								</div>
							</div>
						</article>
					))}
				</div>
			</section>

			{/* 3. Hidden Gem Batang (Dedicated Scrollable Section) */}
			<HorizontalPlaceShelf
				headingId="home-hidden-gem-heading"
				title="Hidden Gem Batang"
				items={hiddenGemPlaces}
				mode="hidden-gem"
				viewAllTo="/hidden-gem"
				viewAllLabel="Semua Hidden Gems"
				isBookmarked={isBookmarked}
				onToggleBookmark={toggleBookmark}
			/>

			{/* 4. Baru Ditambahkan (Dedicated Scrollable Section) */}
			<HorizontalPlaceShelf
				headingId="home-newest-heading"
				title="Baru Ditambahkan"
				items={newestPlaces}
				mode="newest"
				onViewAll={() => openExploreWith({ sortBy: "newest" })}
				viewAllLabel="Semua Tempat Terbaru"
				isBookmarked={isBookmarked}
				onToggleBookmark={toggleBookmark}
			/>

			{/* 5. Kategori & Kawasan Batang */}
			<section
				aria-labelledby="home-directory-heading"
				className="space-y-4 rounded-[12px] border border-border bg-card p-5 sm:p-6"
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2
						id="home-directory-heading"
						className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
					>
						Jelajahi Kategori &amp; Kawasan Batang
					</h2>
					<Button
						asChild
						variant="outline"
						className="min-h-[44px] rounded-[8px] border-input text-xs font-semibold"
					>
						<Link to="/contribute/add-place">
							<PlusCircle className="size-4 text-primary" aria-hidden="true" />
							Ajukan Tempat Baru
						</Link>
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
					{PLACE_CATEGORIES.map((category) => {
						const Icon = CATEGORY_ICON_MAP[category];
						const count = places.filter((p) => p.category === category).length;
						return (
							<button
								key={category}
								type="button"
								onClick={() => openExploreWith({ category })}
								className="group flex min-h-[48px] items-center justify-between gap-3 rounded-[8px] border border-border bg-background px-3.5 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary-soft/50"
							>
								<span className="flex min-w-0 items-center gap-2.5">
									<span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										<Icon className="size-4" aria-hidden="true" />
									</span>
									<span className="truncate text-sm font-semibold text-foreground">
										{category}
									</span>
								</span>
								<span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
									{count} tempat
								</span>
							</button>
						);
					})}
				</div>

				<div className="flex flex-wrap gap-2 border-t border-border pt-4">
					{BATANG_DISTRICTS.map((district) => {
						const count = places.filter((p) => p.district === district).length;
						return (
							<button
								key={district}
								type="button"
								onClick={() => openExploreWith({ district })}
								className="inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary-soft/60 hover:text-primary-hover"
							>
								<MapPin
									className="size-3.5 shrink-0 text-primary"
									aria-hidden="true"
								/>
								<span>{district}</span>
								<span className="rounded-[6px] bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground tabular-nums">
									{count}
								</span>
							</button>
						);
					})}
				</div>
			</section>
		</div>
	);
}
