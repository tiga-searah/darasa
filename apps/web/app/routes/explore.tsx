import { ArrowUpDown, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ClearableSearchInput } from "~/components/clearable-search-input";
import { ExploreActiveChips } from "~/components/explore/explore-active-chips";
import { ExploreFilterPanel } from "~/components/explore/explore-filter-panel";
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
import { type ExploreSortOption, useDarasa } from "~/context/darasa-store";
import { BATANG_DISTRICTS } from "~/data/batang-places";
import {
	filterAndSortExplorePlaces,
	SORT_LABELS,
} from "~/data/explore-filters";
import type { BatangDistrict } from "~/lib/types";
import { useIncrementalReveal, useInfiniteList } from "~/lib/use-infinite-list";
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

export default function ExplorePage() {
	const {
		places,
		bookmarkedPlaceIds,
		exploreFilters,
		setExploreFilters,
		resetExploreFilters,
	} = useDarasa();
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [searchParams, setSearchParams] = useSearchParams();

	const gridRef = useRef<HTMLDivElement>(null);
	const advancedPanelId = useId();
	const sortSelectId = useId();

	const filteredPlaces = useMemo(
		() =>
			filterAndSortExplorePlaces(places, exploreFilters, bookmarkedPlaceIds),
		[places, exploreFilters, bookmarkedPlaceIds],
	);

	const filterSignature = `${exploreFilters.keyword.trim()}|${exploreFilters.category}|${exploreFilters.district}|${exploreFilters.verification}|${exploreFilters.minRating}|${exploreFilters.priceTier}|${exploreFilters.onlyHiddenGem}|${exploreFilters.onlyBookmarked}|${exploreFilters.sortBy}`;

	const {
		visibleItems: visiblePlaces,
		visibleCount,
		totalItems,
		isInitialLoading,
		isFetchingMore,
		error,
		batchSize,
		sentinelRef,
		retry,
	} = useInfiniteList(filteredPlaces, { filterKey: filterSignature });

	const urlDistrict = searchParams.get("district");
	useEffect(() => {
		if (
			urlDistrict &&
			BATANG_DISTRICTS.includes(urlDistrict as BatangDistrict)
		) {
			setExploreFilters({ district: urlDistrict as BatangDistrict });
		}
	}, [urlDistrict, setExploreFilters]);

	useIncrementalReveal(
		gridRef,
		visiblePlaces.length,
		`${filterSignature}|${exploreFilters.viewMode}`,
	);

	const activeAdvancedCount =
		(exploreFilters.category !== "all" ? 1 : 0) +
		(exploreFilters.district !== "all" ? 1 : 0) +
		(exploreFilters.verification !== "all" ? 1 : 0) +
		(exploreFilters.minRating !== "all" ? 1 : 0) +
		(exploreFilters.priceTier !== "all" ? 1 : 0) +
		(exploreFilters.onlyHiddenGem ? 1 : 0) +
		(exploreFilters.onlyBookmarked ? 1 : 0);

	const hasActiveFilters =
		exploreFilters.keyword.trim().length > 0 || activeAdvancedCount > 0;

	const updateDistrict = (next: BatangDistrict | "all") => {
		setExploreFilters({ district: next });
		setSearchParams((prev) => {
			const nextParams = new URLSearchParams(prev);
			if (next === "all") {
				nextParams.delete("district");
			} else {
				nextParams.set("district", next);
			}
			nextParams.delete("page");
			return nextParams;
		});
	};

	const handleReset = () => {
		resetExploreFilters();
		if (searchParams.has("district") || searchParams.has("page")) {
			setSearchParams((prev) => {
				const next = new URLSearchParams(prev);
				next.delete("district");
				next.delete("page");
				return next;
			});
		}
	};

	return (
		<div className="space-y-6 pb-8">
			<section
				aria-label="Pencarian dan filter kuliner"
				className="space-y-4 border-b border-border pb-5"
			>
				<div className="max-w-2xl space-y-2">
					<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
						Jelajah Kuliner Batang
					</h1>
					<p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
						Temukan warung lokal, kuliner koridor KITB, hingga sajian pesisir
						yang diurutkan berdasarkan{" "}
						<strong className="font-semibold text-primary">
							Explore Score
						</strong>{" "}
						dari rating rasa, jumlah dan keterbaruan ulasan, serta status
						verifikasi.
					</p>
				</div>

				<search>
					<form
						onSubmit={(e) => e.preventDefault()}
						className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
					>
						<ClearableSearchInput
							value={exploreFilters.keyword}
							onChange={(keyword) => setExploreFilters({ keyword })}
							label="Cari nama tempat, menu, atau area"
							placeholder="Cari megono, ikan bakar, kopi, atau kawasan..."
						/>

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

							<div>
								<Label htmlFor={sortSelectId} className="sr-only">
									Urutkan hasil kuliner
								</Label>
								<Select
									value={exploreFilters.sortBy}
									onValueChange={(val) =>
										setExploreFilters({ sortBy: val as ExploreSortOption })
									}
								>
									<SelectTrigger
										id={sortSelectId}
										hideChevron
										aria-label={`Urutkan hasil: ${SORT_LABELS[exploreFilters.sortBy]}`}
										title={`Urutkan: ${SORT_LABELS[exploreFilters.sortBy]}`}
										className={cn(
											"size-11 w-11 shrink-0 justify-center rounded-[10px] p-0",
											exploreFilters.sortBy !== "explore"
												? "border-primary bg-primary-soft text-primary-hover"
												: "bg-background text-foreground hover:bg-muted",
										)}
									>
										<ArrowUpDown className="size-4" aria-hidden="true" />
										<span className="sr-only">
											<SelectValue />
										</span>
									</SelectTrigger>
									<SelectContent align="end" className="min-w-[200px]">
										{(
											Object.entries(SORT_LABELS) as Array<
												[ExploreSortOption, string]
											>
										).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</form>
				</search>

				<ExploreFilterPanel
					id={advancedPanelId}
					open={filtersOpen}
					filters={exploreFilters}
					bookmarkedCount={bookmarkedPlaceIds.length}
					hasActiveFilters={hasActiveFilters}
					onUpdateFilters={setExploreFilters}
					onDistrictChange={updateDistrict}
					onReset={handleReset}
					onClose={() => setFiltersOpen(false)}
				/>
			</section>

			<div className="space-y-5">
				<ExploreActiveChips
					totalResults={filteredPlaces.length}
					filters={exploreFilters}
					hasActiveFilters={hasActiveFilters}
					onUpdateFilters={setExploreFilters}
					onClearDistrict={() => updateDistrict("all")}
					onReset={handleReset}
					onViewModeChange={(viewMode) => setExploreFilters({ viewMode })}
				/>

				{!isInitialLoading && filteredPlaces.length === 0 ? (
					<div className="border-t border-border py-14 text-center space-y-4">
						<h2 className="text-lg font-semibold text-foreground">
							Tidak ada tempat kuliner yang cocok dengan filter Anda
						</h2>
						<p className="mx-auto max-w-md text-sm text-muted-foreground">
							Coba ubah kata kunci pencarian, buka panel Filter untuk
							menyesuaikan pilihan, atau tambahkan tempat kuliner baru.
						</p>
						<div className="flex flex-wrap justify-center gap-3">
							<Button variant="secondary" onClick={handleReset}>
								Tampilkan Semua Tempat
							</Button>
							<Button asChild>
								<Link to="/contribute/add-place">Tambah Tempat Baru</Link>
							</Button>
						</div>
					</div>
				) : (
					<>
						<PlaceResultsList
							places={visiblePlaces}
							mode="explore"
							viewMode={exploreFilters.viewMode}
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
