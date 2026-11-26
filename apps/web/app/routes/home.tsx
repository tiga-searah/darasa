import gsap from "gsap";
import {
	ArrowRight,
	Briefcase,
	CheckCircle2,
	Clock,
	Coffee,
	Cookie,
	Fish,
	Flame,
	Gem,
	MapPin,
	ShieldCheck,
	Soup,
	Sparkles,
	Star,
	TrendingUp,
	Utensils,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { PlaceCard } from "~/components/place-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useDarasa } from "~/context/darasa-store";
import { PLACE_CATEGORIES } from "~/data/batang-places";
import type { PlaceCategory } from "~/lib/types";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Home | Darasa Kuliner Batang" },
		{
			name: "description",
			content:
				"Beranda Darasa: highlight kuliner Batang, rekomendasi Explore Score, tempat baru ditambahkan, usaha terverifikasi, populer, dan rating tinggi.",
		},
	];
}

type HomeFeedTab = "rating" | "popular" | "verified" | "newest";

const CATEGORY_ICON_MAP: Record<PlaceCategory, typeof Soup> = {
	"Masakan Tradisional": Soup,
	"Kuliner Pesisir": Fish,
	"Kopi & Kafe": Coffee,
	"Bakso & Mie": Utensils,
	"Jajanan & Oleh-oleh": Cookie,
	"Warung Pekerja": Briefcase,
};

export default function HomePage() {
	const { places, setExploreFilters, resetExploreFilters } = useDarasa();
	const navigate = useNavigate();
	const [activeFeedTab, setActiveFeedTab] = useState<HomeFeedTab>("rating");

	const pageRef = useRef<HTMLDivElement>(null);
	const feedGridRef = useRef<HTMLDivElement>(null);

	const recommendedPlaces = useMemo(
		() =>
			[...places].sort((a, b) => b.exploreScore - a.exploreScore).slice(0, 3),
		[places],
	);

	const newestPlaces = useMemo(
		() =>
			[...places].sort(
				(a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
			),
		[places],
	);

	const verifiedPlaces = useMemo(
		() =>
			places
				.filter((p) => p.verificationStatus !== "unverified")
				.sort((a, b) => {
					if (a.verificationStatus === b.verificationStatus) {
						return b.exploreScore - a.exploreScore;
					}
					return a.verificationStatus === "owner_verified" ? -1 : 1;
				}),
		[places],
	);

	const popularPlaces = useMemo(
		() =>
			[...places].sort(
				(a, b) =>
					b.reviewCount - a.reviewCount || b.averageRating - a.averageRating,
			),
		[places],
	);

	const highRatedPlaces = useMemo(
		() =>
			[...places]
				.filter((p) => p.averageRating >= 4.0)
				.sort(
					(a, b) =>
						b.averageRating - a.averageRating || b.reviewCount - a.reviewCount,
				),
		[places],
	);

	const topHiddenGem = useMemo(
		() =>
			places
				.filter((p) => p.hiddenGemEligible)
				.sort((a, b) => b.hiddenGemScore - a.hiddenGemScore)[0] ?? places[0],
		[places],
	);

	const heroSpotlight = recommendedPlaces[0] ?? places[0];
	const heroQuoteReview =
		heroSpotlight?.reviews.find((r) => r.rating >= 5) ??
		heroSpotlight?.reviews[0];
	const topVerifiedSpot = verifiedPlaces[0] ?? places[0];
	const latestSpot = newestPlaces[0] ?? places[0];

	const activeFeedPlaces = useMemo(() => {
		switch (activeFeedTab) {
			case "popular":
				return popularPlaces.slice(0, 3);
			case "verified":
				return verifiedPlaces.slice(0, 3);
			case "newest":
				return newestPlaces.slice(0, 3);
			default:
				return highRatedPlaces.slice(0, 3);
		}
	}, [
		activeFeedTab,
		highRatedPlaces,
		popularPlaces,
		verifiedPlaces,
		newestPlaces,
	]);

	// GSAP hero entrance, ambient float, and ScrollTrigger section reveals
	useEffect(() => {
		const root = pageRef.current;
		if (!root) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		let ctx: gsap.Context | undefined;
		let cancelled = false;

		const initAnimations = async () => {
			const { ScrollTrigger } = await import("gsap/ScrollTrigger");
			if (cancelled) return;
			gsap.registerPlugin(ScrollTrigger);

			ctx = gsap.context(() => {
				gsap.fromTo(
					"[data-hero-enter]",
					{ opacity: 0, y: 18 },
					{
						opacity: 1,
						y: 0,
						duration: 0.55,
						stagger: 0.08,
						ease: "power3.out",
						clearProps: "transform",
					},
				);

				gsap.to("[data-hero-float]", {
					y: -6,
					duration: 2.6,
					repeat: -1,
					yoyo: true,
					ease: "sine.inOut",
					stagger: 0.35,
				});

				for (const section of gsap.utils.toArray<HTMLElement>(
					"[data-reveal-group]",
				)) {
					const items = section.querySelectorAll("[data-reveal-item]");
					if (items.length === 0) continue;
					gsap.fromTo(
						items,
						{ opacity: 0, y: 20 },
						{
							opacity: 1,
							y: 0,
							duration: 0.45,
							stagger: 0.08,
							ease: "power2.out",
							clearProps: "transform",
							scrollTrigger: {
								trigger: section,
								start: "top 86%",
								once: true,
							},
						},
					);
				}
			}, pageRef);
		};

		initAnimations();

		return () => {
			cancelled = true;
			ctx?.revert();
		};
	}, []);

	// Smooth GSAP stagger when switching Home curated feed tabs
	useEffect(() => {
		const container = feedGridRef.current;
		if (!container) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const _tab = activeFeedTab;
		if (!_tab) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				container.children,
				{ opacity: 0, y: 12, scale: 0.985 },
				{
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 0.28,
					stagger: 0.06,
					ease: "power2.out",
					clearProps: "transform",
				},
			);
		}, feedGridRef);

		return () => ctx.revert();
	}, [activeFeedTab]);

	const openExploreWith = (preset: Parameters<typeof setExploreFilters>[0]) => {
		resetExploreFilters();
		setExploreFilters(preset);
		navigate("/explore");
	};

	const feedTabs: Array<{
		id: HomeFeedTab;
		label: string;
		icon: typeof Star;
		count: number;
	}> = [
		{
			id: "rating",
			label: "Rating Tinggi",
			icon: Star,
			count: highRatedPlaces.length,
		},
		{
			id: "popular",
			label: "Populer",
			icon: Flame,
			count: popularPlaces.length,
		},
		{
			id: "verified",
			label: "Terverifikasi",
			icon: ShieldCheck,
			count: verifiedPlaces.length,
		},
		{
			id: "newest",
			label: "Baru Ditambahkan",
			icon: Clock,
			count: newestPlaces.length,
		},
	];

	return (
		<div ref={pageRef} className="space-y-10 pb-6">
			{/* 1. Deep Emerald Highlight Banner (Home Spotlight) */}
			<section
				aria-labelledby="home-highlight-heading"
				className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#16865B] via-[#13724E] to-[#0D4F36] p-6 text-white shadow-sm sm:p-8 lg:p-10"
			>
				<div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
					<div className="lg:col-span-7 space-y-5">
						<div data-hero-enter className="flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs">
								<Sparkles
									className="size-3.5 text-[#F5BE42]"
									aria-hidden="true"
								/>
								<span>Highlight Hari Ini · Kabupaten Batang</span>
							</span>
						</div>

						<div data-hero-enter className="space-y-2.5">
							<h1
								id="home-highlight-heading"
								className="text-2xl font-bold tracking-tight leading-[1.15] text-white sm:text-4xl"
							>
								Kuliner Pilihan Batang, Segar dari Kurasi Warga
							</h1>
							<p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
								Temukan rekomendasi teratas berdasarkan Explore Score, tempat
								yang baru ditambahkan komunitas, hingga warung terverifikasi di
								sekitar Anda.
							</p>
						</div>

						<div data-hero-enter className="flex flex-wrap items-center gap-3">
							<Button
								type="button"
								onClick={() => openExploreWith({ sortBy: "explore" })}
								className="h-11 rounded-full bg-[#F5BE42] px-6 text-sm font-bold text-[#1E1A0C] hover:bg-[#eab233]"
							>
								<span>Jelajahi Kuliner</span>
								<ArrowRight className="size-4" aria-hidden="true" />
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-11 rounded-full border-white/30 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20 hover:text-white"
							>
								<Link to="/hidden-gem">
									<Gem className="size-4 text-[#F5BE42]" aria-hidden="true" />
									Lihat Hidden Gems
								</Link>
							</Button>
						</div>

						<div
							data-hero-enter
							className="flex flex-wrap items-center gap-4 pt-1 text-xs text-white/85"
						>
							<span className="inline-flex items-center gap-1.5 font-semibold">
								<Star
									className="size-4 fill-[#F5BE42] text-[#F5BE42]"
									aria-hidden="true"
								/>
								<span className="tabular-nums">
									{heroSpotlight?.averageRating.toFixed(1) ?? "4.8"}
								</span>
								<span>Rating rata-rata unggulan</span>
							</span>
							<span aria-hidden="true" className="text-white/35">
								·
							</span>
							<span className="tabular-nums font-medium">
								{places.length} tempat aktif · {verifiedPlaces.length}{" "}
								terverifikasi
							</span>
						</div>
					</div>

					{/* Floating Spotlight Cards */}
					{heroSpotlight ? (
						<div
							data-hero-enter
							className="lg:col-span-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-1"
						>
							<Link
								to={`/places/${heroSpotlight.slug}`}
								data-hero-float
								className="group block overflow-hidden rounded-[16px] border border-white/20 bg-white/10 p-3 backdrop-blur-xs transition-colors hover:bg-white/15"
							>
								<div className="relative aspect-[16/9] overflow-hidden rounded-[12px] bg-black/15">
									<img
										src={heroSpotlight.photos[0] ?? "/images/megono-batang.svg"}
										alt={heroSpotlight.name}
										width={800}
										height={450}
										fetchPriority="high"
										className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
									/>
									<span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#116B48]/90 px-2.5 py-1 text-[11px] font-semibold text-white">
										<TrendingUp className="size-3" aria-hidden="true" />
										Skor {heroSpotlight.exploreScore.toFixed(2)}
									</span>
								</div>
								<div className="mt-3 flex items-center justify-between gap-3">
									<div className="min-w-0">
										<p className="truncate text-sm font-bold text-white">
											{heroSpotlight.name}
										</p>
										<p className="truncate text-xs text-white/80">
											{heroSpotlight.district} · {heroSpotlight.category}
										</p>
									</div>
									<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F5BE42] px-2.5 py-1 text-xs font-bold text-[#1E1A0C] tabular-nums">
										<Star className="size-3 fill-current" aria-hidden="true" />
										{heroSpotlight.averageRating.toFixed(1)}
									</span>
								</div>
							</Link>

							{heroQuoteReview ? (
								<div
									data-hero-float
									className="rounded-[14px] border border-white/15 bg-black/20 px-4 py-3 text-xs text-white/90"
								>
									<p className="line-clamp-2 italic leading-relaxed">
										&ldquo;{heroQuoteReview.comment}&rdquo;
									</p>
									<p className="mt-1.5 font-semibold text-[#F5BE42]">
										— {heroQuoteReview.authorName}, Pengulas Lokal
									</p>
								</div>
							) : null}
						</div>
					) : null}
				</div>
			</section>

			{/* 2. Three-Card Bento Highlights (Hidden Gem, Terverifikasi, Baru Ditambahkan) */}
			<section
				aria-label="Sorotan cepat kuliner Batang"
				data-reveal-group
				className="grid grid-cols-1 gap-4 lg:grid-cols-12"
			>
				{/* Left Column: 2 Stacked Cards (Hidden Gem + Terverifikasi) */}
				<div className="lg:col-span-6 grid grid-cols-1 gap-4">
					{topHiddenGem ? (
						<Link
							to={`/places/${topHiddenGem.slug}`}
							data-reveal-item
							className="group flex items-center justify-between gap-4 rounded-[16px] border border-[#F5BE42]/45 bg-[#FFF3C4] p-5 text-[#2B2105] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-[#F5BE42]/30 dark:bg-[#382C0E] dark:text-[#FCE79C]"
						>
							<div className="min-w-0 space-y-2">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide dark:bg-white/10">
									<Gem className="size-3" aria-hidden="true" />
									Hidden Gem Terbaik
								</span>
								<h2 className="truncate text-lg font-bold leading-snug">
									{topHiddenGem.name}
								</h2>
								<p className="text-xs opacity-85">
									{topHiddenGem.district} · Rating{" "}
									{topHiddenGem.averageRating.toFixed(1)} (
									{topHiddenGem.reviewCount} ulasan)
								</p>
								<span className="inline-flex items-center gap-1 text-xs font-bold underline-offset-4 group-hover:underline">
									Lihat Detail
									<ArrowRight className="size-3.5" aria-hidden="true" />
								</span>
							</div>
							<img
								src={topHiddenGem.photos[0] ?? "/images/serabi-kalibeluk.svg"}
								alt={topHiddenGem.name}
								width={120}
								height={96}
								className="h-24 w-28 shrink-0 rounded-[12px] object-cover transition-transform duration-300 group-hover:scale-[1.04]"
							/>
						</Link>
					) : null}

					{topVerifiedSpot ? (
						<Link
							to={`/places/${topVerifiedSpot.slug}`}
							data-reveal-item
							className="group flex items-center justify-between gap-4 rounded-[16px] bg-[#116B48] p-5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
						>
							<div className="min-w-0 space-y-2">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
									<CheckCircle2 className="size-3" aria-hidden="true" />
									Terverifikasi Resmi
								</span>
								<h2 className="truncate text-lg font-bold leading-snug">
									{topVerifiedSpot.name}
								</h2>
								<p className="text-xs text-white/80">
									{topVerifiedSpot.district} · {topVerifiedSpot.priceRange}
								</p>
								<span className="inline-flex items-center gap-1 text-xs font-bold text-[#F5BE42] underline-offset-4 group-hover:underline">
									Kunjungi Profil
									<ArrowRight className="size-3.5" aria-hidden="true" />
								</span>
							</div>
							<img
								src={topVerifiedSpot.photos[0] ?? "/images/megono-batang.svg"}
								alt={topVerifiedSpot.name}
								width={120}
								height={96}
								className="h-24 w-28 shrink-0 rounded-[12px] object-cover transition-transform duration-300 group-hover:scale-[1.04]"
							/>
						</Link>
					) : null}
				</div>

				{/* Right Column: Tall Coral Card (Baru Ditambahkan) */}
				{latestSpot ? (
					<div
						data-reveal-item
						className="lg:col-span-6 flex flex-col justify-between gap-4 rounded-[16px] bg-gradient-to-br from-[#E84B3C] to-[#C83224] p-6 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
					>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="space-y-1.5">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
									<Clock className="size-3.5" aria-hidden="true" />
									Baru Ditambahkan
								</span>
								<h2 className="text-2xl font-bold leading-tight">
									{latestSpot.name}
								</h2>
								<p className="text-sm text-white/90">
									{latestSpot.category} di {latestSpot.district}
								</p>
							</div>
							<span className="rounded-full bg-[#F5BE42] px-3 py-1 text-xs font-bold text-[#1E1A0C] tabular-nums">
								{latestSpot.priceRange}
							</span>
						</div>

						<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
							<div className="space-y-3 sm:max-w-xs">
								<p className="line-clamp-2 text-xs leading-relaxed text-white/90">
									{latestSpot.description}
								</p>
								<div className="flex flex-wrap gap-2">
									<Button
										asChild
										size="sm"
										className="rounded-full bg-white text-[#C83224] hover:bg-white/90 font-bold"
									>
										<Link to={`/places/${latestSpot.slug}`}>
											Lihat Tempat
											<ArrowRight className="size-3.5" aria-hidden="true" />
										</Link>
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => openExploreWith({ sortBy: "newest" })}
										className="rounded-full border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"
									>
										Semua Terbaru
									</Button>
								</div>
							</div>

							<img
								src={latestSpot.photos[0] ?? "/images/warung-kitb.svg"}
								alt={latestSpot.name}
								width={200}
								height={130}
								className="h-32 w-full rounded-[12px] object-cover sm:w-44 shrink-0"
							/>
						</div>
					</div>
				) : null}
			</section>

			{/* 3. Rekomendasi Pilihan (Explore Score Top Picks) */}
			<section
				aria-labelledby="home-recommended-heading"
				data-reveal-group
				className="space-y-5"
			>
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div className="space-y-1">
						<h2
							id="home-recommended-heading"
							className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
						>
							Rekomendasi Pilihan
						</h2>
						<p className="text-sm text-muted-foreground">
							Urutan teratas berdasarkan keseimbangan rating, ulasan, dan
							keterbaruan di Batang.
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => openExploreWith({ sortBy: "explore" })}
					>
						Lihat Semua di Jelajah
						<ArrowRight className="size-4" aria-hidden="true" />
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
					{recommendedPlaces.map((place, index) => (
						<div key={place.id} data-reveal-item>
							<PlaceCard
								place={place}
								mode="explore"
								layout="grid"
								prioritizeImage={index < 3}
							/>
						</div>
					))}
				</div>
			</section>

			{/* 4. Soft Sage Category Band (Explore by Category) */}
			<section
				aria-labelledby="home-category-band-heading"
				data-reveal-group
				className="rounded-[20px] border border-primary/15 bg-primary-soft/80 p-6 sm:p-8 lg:p-10 space-y-6"
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="max-w-xl space-y-1.5">
						<h2
							id="home-category-band-heading"
							className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
						>
							Jelajahi Kuliner Berdasarkan Kategori
						</h2>
						<p className="text-sm text-muted-foreground">
							Pilih jenis sajian favorit untuk langsung menyaring daftar di
							Jelajah Batang.
						</p>
					</div>
					<Button
						type="button"
						size="sm"
						onClick={() => openExploreWith({ category: "all" })}
						className="rounded-full self-start sm:self-auto"
					>
						Semua Kategori
						<ArrowRight className="size-4" aria-hidden="true" />
					</Button>
				</div>

				<div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
					{PLACE_CATEGORIES.map((category) => {
						const Icon = CATEGORY_ICON_MAP[category];
						const count = places.filter((p) => p.category === category).length;
						return (
							<button
								key={category}
								type="button"
								data-reveal-item
								onClick={() => openExploreWith({ category })}
								className="group flex flex-col items-center gap-3 rounded-[14px] border border-border bg-card p-4 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-md"
							>
								<span className="flex size-12 items-center justify-center rounded-[12px] bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
									<Icon className="size-6" aria-hidden="true" />
								</span>
								<div className="space-y-0.5">
									<p className="text-xs sm:text-sm font-bold leading-snug text-foreground">
										{category}
									</p>
									<p className="text-[11px] font-medium text-muted-foreground tabular-nums">
										{count} tempat
									</p>
								</div>
							</button>
						);
					})}
				</div>
			</section>

			{/* 5. Interactive Curated Shelf: Rating Tinggi, Populer, Terverifikasi, Baru Ditambahkan */}
			<section
				aria-labelledby="home-curated-heading"
				data-reveal-group
				className="space-y-5"
			>
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="space-y-1">
						<h2
							id="home-curated-heading"
							className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
						>
							Koleksi Terkurasi Batang
						</h2>
						<p className="text-sm text-muted-foreground">
							Ganti tab untuk melihat tempat dengan rating tertinggi, paling
							populer, terverifikasi, atau terbaru ditambahkan.
						</p>
					</div>

					<div
						role="tablist"
						aria-label="Filter koleksi beranda"
						className="flex flex-wrap gap-2"
					>
						{feedTabs.map((tab) => {
							const Icon = tab.icon;
							const active = activeFeedTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									role="tab"
									aria-selected={active}
									onClick={() => setActiveFeedTab(tab.id)}
									className={cn(
										"inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
										active
											? "border-primary bg-primary text-primary-foreground"
											: "border-border bg-background text-foreground hover:border-primary/60",
									)}
								>
									<Icon className="size-3.5" aria-hidden="true" />
									<span>{tab.label}</span>
									<span
										className={cn(
											"rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
											active
												? "bg-primary-foreground/20 text-primary-foreground"
												: "bg-muted text-muted-foreground",
										)}
									>
										{tab.count}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				<div
					ref={feedGridRef}
					className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
				>
					{activeFeedPlaces.map((place) => (
						<PlaceCard
							key={`${activeFeedTab}-${place.id}`}
							place={place}
							mode="explore"
							layout="grid"
						/>
					))}
				</div>

				{/* Quick Direct Links for Newly Added & Verified */}
				<div className="grid grid-cols-1 gap-4 border-t border-border pt-6 md:grid-cols-2">
					<div
						data-reveal-item
						className="rounded-[14px] border border-border bg-background p-5 space-y-3"
					>
						<div className="flex items-center justify-between gap-2">
							<h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
								<Clock className="size-4 text-primary" aria-hidden="true" />
								Baru Ditambahkan
							</h3>
							<button
								type="button"
								onClick={() => openExploreWith({ sortBy: "newest" })}
								className="text-xs font-semibold text-primary hover:underline"
							>
								Lihat semua &rarr;
							</button>
						</div>
						<div className="divide-y divide-border">
							{newestPlaces.slice(0, 3).map((p) => (
								<Link
									key={p.id}
									to={`/places/${p.slug}`}
									className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-primary"
								>
									<div className="min-w-0">
										<p className="truncate font-semibold text-foreground">
											{p.name}
										</p>
										<p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
											<MapPin
												className="size-3 shrink-0 text-primary"
												aria-hidden="true"
											/>
											{p.district} · {p.category}
										</p>
									</div>
									<Badge variant="outline" className="shrink-0 tabular-nums">
										{p.averageRating > 0 ? p.averageRating.toFixed(1) : "Baru"}
									</Badge>
								</Link>
							))}
						</div>
					</div>

					<div
						data-reveal-item
						className="rounded-[14px] border border-border bg-background p-5 space-y-3"
					>
						<div className="flex items-center justify-between gap-2">
							<h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
								<ShieldCheck
									className="size-4 text-primary"
									aria-hidden="true"
								/>
								Terverifikasi Pemilik &amp; Komunitas
							</h3>
							<button
								type="button"
								onClick={() =>
									openExploreWith({ verification: "owner_verified" })
								}
								className="text-xs font-semibold text-primary hover:underline"
							>
								Lihat semua &rarr;
							</button>
						</div>
						<div className="divide-y divide-border">
							{verifiedPlaces.slice(0, 3).map((p) => (
								<Link
									key={p.id}
									to={`/places/${p.slug}`}
									className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-primary"
								>
									<div className="min-w-0">
										<p className="truncate font-semibold text-foreground">
											{p.name}
										</p>
										<p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
											<MapPin
												className="size-3 shrink-0 text-primary"
												aria-hidden="true"
											/>
											{p.district} · {p.priceRange}
										</p>
									</div>
									<Badge
										variant={
											p.verificationStatus === "owner_verified"
												? "default"
												: "secondary"
										}
										className="shrink-0"
									>
										{p.verificationStatus === "owner_verified"
											? "Pemilik"
											: "Komunitas"}
									</Badge>
								</Link>
							))}
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
