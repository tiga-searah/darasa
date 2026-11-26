import gsap from "gsap";
import {
	ArrowUpDown,
	Bookmark,
	ChevronDown,
	Gem,
	Info,
	LayoutGrid,
	List,
	RotateCcw,
	Search,
	SlidersHorizontal,
	Star,
	X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PlaceCard } from "~/components/place-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	type ExploreMinRating,
	type ExplorePriceTier,
	type ExploreSortOption,
	useDarasa,
} from "~/context/darasa-store";
import { BATANG_DISTRICTS, PLACE_CATEGORIES } from "~/data/batang-places";
import type { BatangDistrict, VerificationStatus } from "~/lib/types";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/explore";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Jelajah Kuliner Batang | Darasa" },
		{
			name: "description",
			content:
				"Temukan warung lokal, kuliner pesisir, kedai kopi, dan hidden gem di Kabupaten Batang melalui kurasi komunitas Darasa.",
		},
	];
}

function getPriceMidpoint(priceRange: string): number | null {
	const matches = priceRange.match(/\d[\d.]*/g);
	if (!matches || matches.length === 0) return null;
	const numbers = matches
		.map((raw) => Number.parseInt(raw.replace(/\./g, ""), 10))
		.filter((n) => !Number.isNaN(n));
	if (numbers.length === 0) return null;
	if (numbers.length === 1) return numbers[0];
	return (numbers[0] + numbers[1]) / 2;
}

function matchesPriceTier(priceRange: string, tier: ExplorePriceTier): boolean {
	if (tier === "all") return true;
	const mid = getPriceMidpoint(priceRange);
	if (mid === null) return true;
	switch (tier) {
		case "budget":
			return mid <= 22000;
		case "mid":
			return mid > 22000 && mid <= 40000;
		case "premium":
			return mid > 40000;
	}
}

export default function ExplorePage() {
	const {
		places,
		hydrated,
		bookmarkedPlaceIds,
		exploreFilters,
		setExploreFilters,
		resetExploreFilters,
	} = useDarasa();
	const [searchParams, setSearchParams] = useSearchParams();
	const urlDistrict = searchParams.get("district");
	const [filtersOpen, setFiltersOpen] = useState(false);

	const gridRef = useRef<HTMLDivElement>(null);
	const searchInputId = useId();
	const advancedPanelId = useId();
	const districtSelectId = useId();
	const verifySelectId = useId();
	const sortSelectId = useId();

	useEffect(() => {
		if (
			urlDistrict &&
			BATANG_DISTRICTS.includes(urlDistrict as BatangDistrict)
		) {
			setExploreFilters({ district: urlDistrict as BatangDistrict });
		}
	}, [urlDistrict, setExploreFilters]);

	const {
		keyword,
		category: selectedCategory,
		district: selectedDistrict,
		verification: verificationFilter,
		minRating,
		priceTier,
		onlyHiddenGem,
		onlyBookmarked,
		sortBy,
		viewMode,
	} = exploreFilters;

	const filteredPlaces = useMemo(() => {
		const q = keyword.trim().toLowerCase();
		return places
			.filter((place) => {
				if (q) {
					const haystack =
						`${place.name} ${place.category} ${place.district} ${place.address} ${place.description}`.toLowerCase();
					if (!haystack.includes(q)) return false;
				}
				if (selectedCategory !== "all" && place.category !== selectedCategory)
					return false;
				if (selectedDistrict !== "all" && place.district !== selectedDistrict)
					return false;
				if (
					verificationFilter !== "all" &&
					place.verificationStatus !== verificationFilter
				) {
					return false;
				}
				if (minRating === "4.0" && place.averageRating < 4.0) return false;
				if (minRating === "4.5" && place.averageRating < 4.5) return false;
				if (!matchesPriceTier(place.priceRange, priceTier)) return false;
				if (onlyHiddenGem && !place.hiddenGemEligible) return false;
				if (onlyBookmarked && !bookmarkedPlaceIds.includes(place.id))
					return false;
				return true;
			})
			.sort((a, b) => {
				switch (sortBy) {
					case "rating":
						return (
							b.averageRating - a.averageRating || b.reviewCount - a.reviewCount
						);
					case "reviews":
						return b.reviewCount - a.reviewCount;
					case "newest":
						return Date.parse(b.createdAt) - Date.parse(a.createdAt);
					default:
						return b.exploreScore - a.exploreScore;
				}
			});
	}, [
		places,
		bookmarkedPlaceIds,
		keyword,
		selectedCategory,
		selectedDistrict,
		verificationFilter,
		minRating,
		priceTier,
		onlyHiddenGem,
		onlyBookmarked,
		sortBy,
	]);

	useEffect(() => {
		const container = gridRef.current;
		if (!container) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const _deps = `${selectedCategory}-${selectedDistrict}-${verificationFilter}-${minRating}-${priceTier}-${onlyHiddenGem}-${onlyBookmarked}-${sortBy}-${viewMode}`;
		if (!_deps) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				container.children,
				{ opacity: 0, y: 10 },
				{
					opacity: 1,
					y: 0,
					duration: 0.24,
					stagger: 0.03,
					ease: "power2.out",
					clearProps: "transform",
				},
			);
		}, gridRef);

		return () => ctx.revert();
	}, [
		selectedCategory,
		selectedDistrict,
		verificationFilter,
		minRating,
		priceTier,
		onlyHiddenGem,
		onlyBookmarked,
		sortBy,
		viewMode,
	]);

	const activeAdvancedCount =
		(selectedCategory !== "all" ? 1 : 0) +
		(selectedDistrict !== "all" ? 1 : 0) +
		(verificationFilter !== "all" ? 1 : 0) +
		(minRating !== "all" ? 1 : 0) +
		(priceTier !== "all" ? 1 : 0) +
		(onlyHiddenGem ? 1 : 0) +
		(onlyBookmarked ? 1 : 0);

	const hasActiveFilters = keyword.trim().length > 0 || activeAdvancedCount > 0;

	const handleReset = () => {
		resetExploreFilters();
		if (searchParams.has("district")) {
			setSearchParams({});
		}
	};

	const verificationLabels: Record<VerificationStatus, string> = {
		owner_verified: "Terverifikasi Pemilik",
		community_verified: "Terverifikasi Komunitas",
		unverified: "Belum Terverifikasi",
	};

	const priceTierLabels: Record<Exclude<ExplorePriceTier, "all">, string> = {
		budget: "Hemat (< Rp 22rb)",
		mid: "Menengah (Rp 22rb - 40rb)",
		premium: "Spesial (> Rp 40rb)",
	};

	return (
		<div className="space-y-6">
			{/* Discovery Header + Search + Expandable Advanced Filter + Sort */}
			<section
				aria-label="Pencarian dan filter kuliner"
				className="space-y-4 border-b border-border pb-5"
			>
				<div className="max-w-2xl space-y-1.5">
					<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
						Jelajah Kuliner Batang
					</h1>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
						<p>
							Temukan warung lokal, kuliner koridor KITB, hingga sajian pesisir
							yang diurutkan dengan{" "}
							<strong className="font-semibold text-foreground">
								Explore Score
							</strong>
							.
						</p>
						<Dialog>
							<DialogTrigger asChild>
								<button
									type="button"
									className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
								>
									<Info className="size-3.5" aria-hidden="true" />
									Cara hitung skor
								</button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Bagaimana Explore Score Dihitung?</DialogTitle>
									<DialogDescription>
										Peringkat Explore menyeimbangkan kualitas rasa dan
										keterbaruan agar UMKM lokal tetap punya peluang tampil.
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-3 text-sm text-muted-foreground">
									<p className="rounded-[8px] border border-border bg-background p-3 font-medium text-foreground tabular-nums">
										Explore Score = (0.5 x Rating) + (0.2 x log(1 + Jumlah
										Ulasan)) + (0.2 x Keterbaruan) + (0.1 x Status Verifikasi)
									</p>
									<ul className="list-disc pl-5 space-y-1.5">
										<li>Rating rata-rata memberi bobot terbesar (50%).</li>
										<li>
											Jumlah ulasan memakai skala logaritmik agar tempat populer
											tidak memonopoli daftar.
										</li>
										<li>
											Verifikasi pemilik dan komunitas ikut meningkatkan bobot
											kepercayaan profil.
										</li>
									</ul>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				{/* Search Bar + Filter Toggle Button + Sort Dropdown */}
				<search>
					<form
						onSubmit={(e) => e.preventDefault()}
						className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
					>
						<div className="relative flex-1">
							<Label htmlFor={searchInputId} className="sr-only">
								Cari nama tempat, menu, atau area
							</Label>
							<Search
								className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								id={searchInputId}
								type="search"
								value={keyword}
								onChange={(e) => setExploreFilters({ keyword: e.target.value })}
								placeholder="Cari megono, ikan bakar, kopi, atau kawasan..."
								className="h-11 rounded-full border-border bg-background pl-10 pr-10"
							/>
							{keyword.trim() ? (
								<button
									type="button"
									onClick={() => setExploreFilters({ keyword: "" })}
									aria-label="Hapus kata kunci pencarian"
									className="absolute right-2.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
								>
									<X className="size-4" aria-hidden="true" />
								</button>
							) : null}
						</div>

						<div className="flex items-center gap-2 shrink-0">
							<Button
								type="button"
								variant={
									filtersOpen || activeAdvancedCount > 0 ? "default" : "outline"
								}
								aria-expanded={filtersOpen}
								aria-controls={advancedPanelId}
								onClick={() => setFiltersOpen((prev) => !prev)}
								className="h-11 gap-2 rounded-[10px] px-3.5"
							>
								<SlidersHorizontal className="size-4" aria-hidden="true" />
								<span>Filter</span>
								{activeAdvancedCount > 0 ? (
									<span
										className={cn(
											"inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
											filtersOpen || activeAdvancedCount > 0
												? "bg-primary-foreground/20 text-primary-foreground"
												: "bg-primary-soft text-primary-hover",
										)}
									>
										{activeAdvancedCount}
									</span>
								) : null}
								<ChevronDown
									className={cn(
										"size-4 transition-transform duration-200",
										filtersOpen ? "rotate-180" : "",
									)}
									aria-hidden="true"
								/>
							</Button>

							<div className="min-w-[175px] flex-1 sm:flex-none">
								<Label htmlFor={sortSelectId} className="sr-only">
									Urutkan hasil kuliner
								</Label>
								<Select
									value={sortBy}
									onValueChange={(val) =>
										setExploreFilters({ sortBy: val as ExploreSortOption })
									}
								>
									<SelectTrigger
										id={sortSelectId}
										aria-label="Urutkan hasil"
										className="h-11 rounded-[10px] bg-background"
									>
										<ArrowUpDown
											className="size-4 text-muted-foreground"
											aria-hidden="true"
										/>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="explore">Explore Score</SelectItem>
										<SelectItem value="rating">Rating Tertinggi</SelectItem>
										<SelectItem value="reviews">Ulasan Terbanyak</SelectItem>
										<SelectItem value="newest">Terbaru Ditambahkan</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</form>
				</search>

				{/* Expandable Advanced Search Panel */}
				{filtersOpen ? (
					<div
						id={advancedPanelId}
						className="rounded-[14px] border border-border bg-background p-4 sm:p-5 space-y-5"
					>
						{/* Category Pills */}
						<fieldset className="m-0 space-y-2 border-0 p-0">
							<legend className="text-xs font-semibold text-muted-foreground">
								Kategori Kuliner
							</legend>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									aria-pressed={selectedCategory === "all"}
									onClick={() => setExploreFilters({ category: "all" })}
									className={cn(
										"inline-flex min-h-[36px] items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
										selectedCategory === "all"
											? "border-primary bg-primary text-primary-foreground"
											: "border-border bg-card text-foreground hover:border-primary/60",
									)}
								>
									Semua Kategori
								</button>
								{PLACE_CATEGORIES.map((category) => {
									const active = selectedCategory === category;
									return (
										<button
											key={category}
											type="button"
											aria-pressed={active}
											onClick={() =>
												setExploreFilters({
													category: active ? "all" : category,
												})
											}
											className={cn(
												"inline-flex min-h-[36px] items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
												active
													? "border-primary bg-primary text-primary-foreground"
													: "border-border bg-card text-foreground hover:border-primary/60",
											)}
										>
											{category}
										</button>
									);
								})}
							</div>
						</fieldset>

						{/* District + Verification + Rating + Price Grid */}
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
							<div className="space-y-1.5">
								<Label
									htmlFor={districtSelectId}
									className="text-xs font-semibold text-muted-foreground"
								>
									Kawasan Batang
								</Label>
								<Select
									value={selectedDistrict}
									onValueChange={(val) => {
										const next = val as BatangDistrict | "all";
										setExploreFilters({ district: next });
										if (next === "all") {
											setSearchParams({});
										} else {
											setSearchParams({ district: next });
										}
									}}
								>
									<SelectTrigger id={districtSelectId} className="bg-card">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Semua Kawasan Batang</SelectItem>
										{BATANG_DISTRICTS.map((district) => (
											<SelectItem key={district} value={district}>
												{district}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label
									htmlFor={verifySelectId}
									className="text-xs font-semibold text-muted-foreground"
								>
									Status Verifikasi
								</Label>
								<Select
									value={verificationFilter}
									onValueChange={(val) =>
										setExploreFilters({
											verification: val as VerificationStatus | "all",
										})
									}
								>
									<SelectTrigger id={verifySelectId} className="bg-card">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Semua Status</SelectItem>
										<SelectItem value="owner_verified">
											Terverifikasi Pemilik
										</SelectItem>
										<SelectItem value="community_verified">
											Terverifikasi Komunitas
										</SelectItem>
										<SelectItem value="unverified">
											Belum Terverifikasi
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<fieldset className="m-0 space-y-1.5 border-0 p-0">
								<legend className="text-xs font-semibold text-muted-foreground">
									Rating Minimum
								</legend>
								<div className="flex flex-wrap gap-1.5">
									{(
										[
											{ value: "all", label: "Semua" },
											{ value: "4.0", label: "4.0+" },
											{ value: "4.5", label: "4.5+" },
										] as Array<{ value: ExploreMinRating; label: string }>
									).map((opt) => {
										const active = minRating === opt.value;
										return (
											<button
												key={opt.value}
												type="button"
												aria-pressed={active}
												onClick={() =>
													setExploreFilters({ minRating: opt.value })
												}
												className={cn(
													"inline-flex min-h-[38px] items-center gap-1 rounded-[8px] border px-3 text-xs font-semibold transition-colors",
													active
														? "border-primary bg-primary text-primary-foreground"
														: "border-border bg-card text-foreground hover:border-primary/60",
												)}
											>
												{opt.value !== "all" ? (
													<Star className="size-3.5" aria-hidden="true" />
												) : null}
												{opt.label}
											</button>
										);
									})}
								</div>
							</fieldset>

							<fieldset className="m-0 space-y-1.5 border-0 p-0">
								<legend className="text-xs font-semibold text-muted-foreground">
									Kisaran Harga
								</legend>
								<div className="flex flex-wrap gap-1.5">
									{(
										[
											{ value: "all", label: "Semua" },
											{ value: "budget", label: "Hemat" },
											{ value: "mid", label: "Menengah" },
											{ value: "premium", label: "Spesial" },
										] as Array<{ value: ExplorePriceTier; label: string }>
									).map((opt) => {
										const active = priceTier === opt.value;
										return (
											<button
												key={opt.value}
												type="button"
												aria-pressed={active}
												onClick={() =>
													setExploreFilters({ priceTier: opt.value })
												}
												className={cn(
													"inline-flex min-h-[38px] items-center rounded-[8px] border px-2.5 text-xs font-semibold transition-colors",
													active
														? "border-primary bg-primary text-primary-foreground"
														: "border-border bg-card text-foreground hover:border-primary/60",
												)}
											>
												{opt.label}
											</button>
										);
									})}
								</div>
							</fieldset>
						</div>

						{/* Extra Toggles + Panel Actions */}
						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									aria-pressed={onlyHiddenGem}
									onClick={() =>
										setExploreFilters({ onlyHiddenGem: !onlyHiddenGem })
									}
									className={cn(
										"inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
										onlyHiddenGem
											? "border-accent-yellow bg-accent text-accent-foreground"
											: "border-border bg-card text-foreground hover:border-accent-yellow",
									)}
								>
									<Gem className="size-3.5" aria-hidden="true" />
									Hanya Hidden Gem
								</button>

								<button
									type="button"
									aria-pressed={onlyBookmarked}
									onClick={() =>
										setExploreFilters({ onlyBookmarked: !onlyBookmarked })
									}
									className={cn(
										"inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
										onlyBookmarked
											? "border-primary bg-primary-soft text-primary-hover"
											: "border-border bg-card text-foreground hover:border-primary/60",
									)}
								>
									<Bookmark className="size-3.5" aria-hidden="true" />
									Hanya Bookmark ({bookmarkedPlaceIds.length})
								</button>
							</div>

							<div className="flex items-center gap-2">
								{hasActiveFilters ? (
									<Button variant="ghost" size="sm" onClick={handleReset}>
										<RotateCcw className="size-3.5" aria-hidden="true" />
										Reset Semua
									</Button>
								) : null}
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => setFiltersOpen(false)}
								>
									Tutup Filter
								</Button>
							</div>
						</div>
					</div>
				) : null}
			</section>

			{/* Result Count, Active Filter Chips & View Mode Switcher */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>
							<strong className="font-semibold text-foreground tabular-nums">
								{filteredPlaces.length}
							</strong>{" "}
							tempat kuliner
						</span>
					</div>

					{keyword.trim() ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ keyword: "" })}
							aria-label={`Hapus kata kunci ${keyword}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							&ldquo;{keyword.trim()}&rdquo;
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{selectedCategory !== "all" ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ category: "all" })}
							aria-label={`Hapus filter kategori ${selectedCategory}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							{selectedCategory}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{selectedDistrict !== "all" ? (
						<button
							type="button"
							onClick={() => {
								setExploreFilters({ district: "all" });
								setSearchParams({});
							}}
							aria-label={`Hapus filter kawasan ${selectedDistrict}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							{selectedDistrict}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{verificationFilter !== "all" ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ verification: "all" })}
							aria-label={`Hapus filter verifikasi ${verificationLabels[verificationFilter]}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							{verificationLabels[verificationFilter]}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{minRating !== "all" ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ minRating: "all" })}
							aria-label={`Hapus filter rating ${minRating}+`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-accent-yellow/50 bg-yellow-soft px-3 py-1 text-xs font-medium text-yellow-text hover:brightness-95"
						>
							Rating {minRating}+
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{priceTier !== "all" ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ priceTier: "all" })}
							aria-label={`Hapus filter harga ${priceTierLabels[priceTier]}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							{priceTierLabels[priceTier]}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{onlyHiddenGem ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ onlyHiddenGem: false })}
							aria-label="Hapus filter Hidden Gem"
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-accent-yellow/50 bg-yellow-soft px-3 py-1 text-xs font-medium text-yellow-text hover:brightness-95"
						>
							Hidden Gem
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{onlyBookmarked ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ onlyBookmarked: false })}
							aria-label="Hapus filter Bookmark"
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							Bookmark
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{hasActiveFilters ? (
						<Button variant="ghost" size="sm" onClick={handleReset}>
							<RotateCcw className="size-3.5" aria-hidden="true" />
							Reset
						</Button>
					) : null}
				</div>

				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="hidden sm:inline-flex">
						{!hydrated ? "Memuat data lokal..." : "Katalog Batang"}
					</Badge>

					<fieldset className="m-0 inline-flex items-center rounded-[8px] border border-border bg-background p-0.5">
						<legend className="sr-only">Mode tampilan daftar</legend>
						<button
							type="button"
							aria-label="Tampilan grid ala Play Store"
							title="Tampilan Grid"
							aria-pressed={viewMode === "grid"}
							onClick={() => setExploreFilters({ viewMode: "grid" })}
							className={cn(
								"inline-flex size-9 items-center justify-center rounded-[6px] transition-colors",
								viewMode === "grid"
									? "bg-card text-primary shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<LayoutGrid className="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							aria-label="Tampilan daftar ala Google Maps"
							title="Tampilan Daftar"
							aria-pressed={viewMode === "list"}
							onClick={() => setExploreFilters({ viewMode: "list" })}
							className={cn(
								"inline-flex size-9 items-center justify-center rounded-[6px] transition-colors",
								viewMode === "list"
									? "bg-card text-primary shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<List className="size-4" aria-hidden="true" />
						</button>
					</fieldset>
				</div>
			</div>

			{/* Cardless Places Grid / Divided List or Empty State */}
			{filteredPlaces.length === 0 ? (
				<div className="border-t border-border py-14 text-center space-y-4">
					<h2 className="text-lg font-semibold text-foreground">
						Tidak ada tempat kuliner yang cocok dengan filter Anda
					</h2>
					<p className="mx-auto max-w-md text-sm text-muted-foreground">
						Coba ubah kata kunci pencarian, buka panel Filter untuk menyesuaikan
						pilihan, atau tambahkan tempat kuliner baru.
					</p>
					<div className="flex flex-wrap justify-center gap-3">
						<Button variant="secondary" onClick={handleReset}>
							Tampilkan Semua Tempat
						</Button>
						<Button asChild>
							<Link to="/submit-place">Contribute Tempat Baru</Link>
						</Button>
					</div>
				</div>
			) : viewMode === "list" ? (
				<div
					ref={gridRef}
					className="divide-y divide-border border-t border-border"
				>
					{filteredPlaces.map((place, index) => (
						<PlaceCard
							key={place.id}
							place={place}
							mode="explore"
							layout="list"
							prioritizeImage={index < 3}
						/>
					))}
				</div>
			) : (
				<div
					ref={gridRef}
					className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
				>
					{filteredPlaces.map((place, index) => (
						<PlaceCard
							key={place.id}
							place={place}
							mode="explore"
							layout="grid"
							prioritizeImage={index < 3}
						/>
					))}
				</div>
			)}
		</div>
	);
}
