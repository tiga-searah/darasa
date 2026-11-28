import gsap from "gsap";
import { Bookmark, Eye, Gem, MapPin, Star } from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { cn } from "~/lib/utils";
import { CarouselDots, getScrollBehavior } from "./carousel-dots";

interface PopularSpotlightProps {
	places: PlaceWithMetrics[];
	hydrated: boolean;
	isBookmarked: (placeId: string) => boolean;
	onToggleBookmark: (placeId: string) => void;
}

export function PopularSpotlight({
	places,
	hydrated,
	isBookmarked,
	onToggleBookmark,
}: PopularSpotlightProps) {
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

	const spotlightSlides = useMemo(
		() => (places.length > 1 ? [...places, places[0]] : places),
		[places],
	);

	const safeSpotlightIndex =
		places.length > 0 ? Math.min(spotlightIndex, places.length - 1) : 0;

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
			const total = places.length;
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
			places.length,
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
		const total = places.length;
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
	}, [places.length, syncBgTrackScroll]);

	useEffect(() => {
		return () => clearSpotlightWrapTimer();
	}, [clearSpotlightWrapTimer]);

	useEffect(() => {
		const track = spotlightTrackRef.current;
		const total = places.length;
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
	}, [clearSpotlightWrapTimer, places.length, resetSpotlightToStartInstant]);

	useEffect(() => {
		const track = spotlightTrackRef.current;
		const total = places.length;
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
	}, [places.length, scrollSpotlightManual]);

	useEffect(() => {
		const total = places.length;
		if (!hydrated || total <= 1) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const _resetOnManual = spotlightAutoTick;
		if (_resetOnManual < 0) return;

		const timer = window.setInterval(() => {
			if (document.hidden) return;
			scrollSpotlightTo(spotlightIndexRef.current + 1);
		}, 7000);

		return () => window.clearInterval(timer);
	}, [hydrated, places.length, scrollSpotlightTo, spotlightAutoTick]);

	const handleSpotlightKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (places.length <= 1) return;
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			scrollSpotlightManual(
				safeSpotlightIndex === 0 ? places.length - 1 : safeSpotlightIndex - 1,
			);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			scrollSpotlightManual(safeSpotlightIndex + 1);
		}
	};

	return (
		<section
			aria-labelledby="home-popular-heading"
			onKeyDown={handleSpotlightKeyDown}
			className="relative -mt-[6rem] space-y-3 pt-[6.5rem] pb-6 xl:-mt-[6rem] xl:pt-[6.5rem]"
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-y-0 left-1/2 w-[100vw] -translate-x-1/2 overflow-hidden"
			>
				<div
					ref={spotlightBgTrackRef}
					className="flex h-full w-full overflow-hidden"
				>
					{spotlightSlides.map((spot, idx) => {
						const isClone = places.length > 1 && idx === places.length;
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
				<div className="absolute inset-0 bg-gradient-to-b from-card/30 from-0% via-transparent via-32% to-card to-78% md:from-transparent md:via-card/55 md:via-50% md:to-card md:to-100%" />
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
					const isClone = places.length > 1 && idx === places.length;
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
									className="group relative hidden overflow-hidden rounded-[12px] bg-muted md:col-span-5 md:block lg:col-span-4"
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

								<div className="flex min-w-0 flex-col justify-between gap-5 pt-40 sm:pt-48 md:col-span-7 md:pt-0 lg:col-span-8">
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
														: place.verificationStatus === "community_verified"
															? "Terverifikasi Komunitas"
															: "Belum Terverifikasi"}
											</span>
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-2.5 pt-2">
										<Button asChild className="min-h-[44px] rounded-[8px] px-5">
											<Link to={`/places/${place.slug}`}>Lihat Detail</Link>
										</Button>
										<button
											type="button"
											onClick={() => onToggleBookmark(place.id)}
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
					count={places.length}
					activeIndex={safeSpotlightIndex}
					labelPrefix="Sorotan populer"
					onSelect={scrollSpotlightManual}
				/>
			</div>
		</section>
	);
}
