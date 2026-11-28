import { MapPin, RotateCcw, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ClearableSearchInput } from "~/components/clearable-search-input";
import { PlaceInfiniteFooter } from "~/components/place-infinite-footer";
import { PlaceResultsList } from "~/components/place-results-list";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { ViewModeToggle } from "~/components/view-mode-toggle";
import { useDarasa } from "~/context/darasa-store";
import { BATANG_DISTRICTS } from "~/data/batang-places";
import { VERIFICATION_LABELS } from "~/data/explore-filters";
import type { BatangDistrict } from "~/lib/types";
import { useIncrementalReveal, useInfiniteList } from "~/lib/use-infinite-list";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/hidden-gem";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Hidden Gems Batang | Darasa" },
		{
			name: "description",
			content:
				"Kuliner berkualitas di Kabupaten Batang dengan rating minimal 4.0 dan jumlah ulasan yang masih sedikit.",
		},
	];
}

export default function HiddenGemPage() {
	const { places, exploreFilters, setExploreFilters, resetExploreFilters } =
		useDarasa();
	const [keyword, setKeyword] = useState("");
	const districtId = useId();
	const gridRef = useRef<HTMLDivElement>(null);

	const {
		category: categoryFilter,
		district: districtFilter,
		verification: verificationFilter,
		viewMode,
	} = exploreFilters;

	const hiddenGems = useMemo(() => {
		const q = keyword.trim().toLowerCase();
		return places
			.filter((place) => {
				if (!place.hiddenGemEligible) return false;
				if (q) {
					const haystack =
						`${place.name} ${place.category} ${place.district} ${place.address} ${place.description}`.toLowerCase();
					if (!haystack.includes(q)) return false;
				}
				if (categoryFilter !== "all" && place.category !== categoryFilter) {
					return false;
				}
				if (districtFilter !== "all" && place.district !== districtFilter) {
					return false;
				}
				if (
					verificationFilter !== "all" &&
					place.verificationStatus !== verificationFilter
				) {
					return false;
				}
				return true;
			})
			.sort((a, b) => b.hiddenGemScore - a.hiddenGemScore);
	}, [places, keyword, categoryFilter, districtFilter, verificationFilter]);

	const filterSignature = `${keyword.trim()}|${categoryFilter}|${districtFilter}|${verificationFilter}`;

	const {
		visibleItems: visibleHiddenGems,
		visibleCount,
		totalItems,
		isInitialLoading,
		isFetchingMore,
		error,
		batchSize,
		sentinelRef,
		retry,
	} = useInfiniteList(hiddenGems, { filterKey: filterSignature });

	useIncrementalReveal(
		gridRef,
		visibleHiddenGems.length,
		`${filterSignature}|${viewMode}`,
	);

	const hasActiveFilters =
		keyword.trim().length > 0 ||
		categoryFilter !== "all" ||
		districtFilter !== "all" ||
		verificationFilter !== "all";

	const handleReset = () => {
		setKeyword("");
		resetExploreFilters();
	};

	return (
		<div className="space-y-6 pb-8">
			{/* Cardless Golden Highlight Header with Smooth Bottom Fade */}
			<section className="relative -mt-[6rem] pt-[6.5rem] pb-8 xl:-mt-[6rem] xl:pt-[6.5rem]">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 left-1/2 w-[100vw] -translate-x-1/2 overflow-hidden"
				>
					<div className="absolute inset-0 bg-gradient-to-b from-accent-yellow/30 via-yellow-soft/80 to-transparent" />
					<div className="absolute -top-16 left-1/4 h-44 w-80 -translate-x-1/2 rounded-full bg-accent-yellow/30 blur-3xl" />
				</div>
				<div className="relative max-w-2xl space-y-2">
					<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
						<span className="text-yellow-text">Hidden Gems</span> Kuliner Batang
					</h1>
					<p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
						Kuliner berating minimal{" "}
						<strong className="font-semibold text-yellow-text">4,0</strong>{" "}
						dengan ulasan tertulis yang masih minim eksposur dan kunjungan.
					</p>
				</div>
			</section>

			<div className="space-y-5">
				{/* Search + District Filter + View Controls matching Explore */}
				<div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center">
					<ClearableSearchInput
						value={keyword}
						onChange={setKeyword}
						label="Cari hidden gem kuliner"
						placeholder="Cari hidden gem, menu, atau kawasan..."
					/>

					<div className="flex items-center justify-between gap-2.5 sm:w-auto">
						<div className="flex min-w-0 flex-1 items-center gap-2 sm:w-[220px] sm:flex-none">
							<Label htmlFor={districtId} className="sr-only">
								Kawasan Batang
							</Label>
							<Select
								value={districtFilter}
								onValueChange={(val) =>
									setExploreFilters({ district: val as BatangDistrict | "all" })
								}
							>
								<SelectTrigger id={districtId} className="bg-background">
									<div className="flex min-w-0 flex-1 items-center gap-2">
										<MapPin
											className={cn(
												"size-4 shrink-0",
												districtFilter !== "all"
													? "text-primary"
													: "text-muted-foreground",
											)}
											aria-hidden="true"
										/>
										<SelectValue />
									</div>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Semua Kawasan</SelectItem>
									{BATANG_DISTRICTS.map((d) => (
										<SelectItem key={d} value={d}>
											{d}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<ViewModeToggle
							value={viewMode}
							onChange={(nextMode) => setExploreFilters({ viewMode: nextMode })}
						/>
					</div>
				</div>

				{/* Result Count & Clearable Active Filter Chips */}
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm text-muted-foreground">
						<strong className="font-semibold text-foreground tabular-nums">
							{hiddenGems.length}
						</strong>{" "}
						tempat ditemukan
					</span>

					{keyword.trim() ? (
						<button
							type="button"
							onClick={() => setKeyword("")}
							aria-label={`Hapus kata kunci ${keyword}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-accent-yellow/50 bg-yellow-soft px-3 py-1 text-xs font-medium text-yellow-text hover:brightness-95"
						>
							&ldquo;{keyword.trim()}&rdquo;
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{categoryFilter !== "all" ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ category: "all" })}
							aria-label={`Hapus filter kategori ${categoryFilter}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							{categoryFilter}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{districtFilter !== "all" ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ district: "all" })}
							aria-label={`Hapus filter kawasan ${districtFilter}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							{districtFilter}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{verificationFilter !== "all" ? (
						<button
							type="button"
							onClick={() => setExploreFilters({ verification: "all" })}
							aria-label={`Hapus filter verifikasi ${VERIFICATION_LABELS[verificationFilter]}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							{VERIFICATION_LABELS[verificationFilter]}
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

				{!isInitialLoading && hiddenGems.length === 0 ? (
					<div className="border-t border-border py-14 text-center space-y-4">
						<h2 className="text-lg font-semibold text-foreground">
							Belum ada hidden gems yang cocok dengan filter ini
						</h2>
						<p className="mx-auto max-w-md text-sm text-muted-foreground">
							Bantu warga menemukan warung atau kedai terbaik yang belum banyak
							dikenal dengan mengubah filter atau menambahkan tempat baru.
						</p>
						<div className="flex flex-wrap justify-center gap-3">
							<Button variant="secondary" onClick={handleReset}>
								Lihat Semua Hidden Gems
							</Button>
							<Button asChild>
								<Link to="/contribute/add-place">Tambah Tempat Kuliner</Link>
							</Button>
						</div>
					</div>
				) : (
					<>
						<PlaceResultsList
							places={visibleHiddenGems}
							mode="hidden-gem"
							viewMode={viewMode}
							containerRef={gridRef}
							isInitialLoading={isInitialLoading}
							skeletonCount={batchSize}
						/>
						<PlaceInfiniteFooter
							visibleCount={visibleCount}
							totalItems={totalItems}
							isInitialLoading={isInitialLoading}
							isFetchingMore={isFetchingMore}
							error={error}
							sentinelRef={sentinelRef}
							onRetry={retry}
						/>
					</>
				)}
			</div>
		</div>
	);
}
