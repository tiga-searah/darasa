import { RotateCcw, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ClearableSearchInput } from "~/components/clearable-search-input";
import { PlaceInfiniteFooter } from "~/components/place-infinite-footer";
import { PlaceResultsList } from "~/components/place-results-list";
import { Button } from "~/components/ui/button";
import { ViewModeToggle } from "~/components/view-mode-toggle";
import { useDarasa } from "~/context/darasa-store";
import { useIncrementalReveal, useInfiniteList } from "~/lib/use-infinite-list";
import type { Route } from "./+types/bookmarks";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Disimpan | Darasa" },
		{
			name: "description",
			content:
				"Daftar tempat kuliner di Kabupaten Batang yang telah Anda simpan untuk dikunjungi nanti.",
		},
	];
}

export default function BookmarksPage() {
	const { places, bookmarkedPlaceIds, exploreFilters, setExploreFilters } =
		useDarasa();
	const [query, setQuery] = useState("");
	const gridRef = useRef<HTMLDivElement>(null);
	const { viewMode } = exploreFilters;

	const bookmarkedPlaces = useMemo(() => {
		const q = query.trim().toLowerCase();
		return places.filter((place) => {
			if (!bookmarkedPlaceIds.includes(place.id)) return false;
			if (!q) return true;
			const haystack =
				`${place.name} ${place.category} ${place.district} ${place.address}`.toLowerCase();
			return haystack.includes(q);
		});
	}, [places, bookmarkedPlaceIds, query]);

	const {
		visibleItems: visibleBookmarks,
		visibleCount,
		totalItems,
		currentPage,
		totalPages,
		hasMore,
		isInitialLoading,
		isFetchingMore,
		error,
		batchSize,
		sentinelRef,
		loadMore,
		retry,
	} = useInfiniteList(bookmarkedPlaces, { filterKey: query.trim() });

	useIncrementalReveal(
		gridRef,
		visibleBookmarks.length,
		`${query.trim()}|${viewMode}`,
	);

	return (
		<div className="space-y-6 pb-8">
			<section className="border-b border-border pb-5 space-y-4">
				<div className="space-y-1.5">
					<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
						Disimpan
					</h1>
					<p className="text-sm sm:text-base text-muted-foreground">
						Daftar tempat kuliner yang Anda simpan untuk dikunjungi nanti.
					</p>
				</div>

				{bookmarkedPlaceIds.length > 0 ? (
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<ClearableSearchInput
							value={query}
							onChange={setQuery}
							label="Cari di daftar disimpan"
							placeholder="Cari tempat tersimpan..."
							className="max-w-md"
						/>

						<div className="flex items-center justify-between gap-3 sm:justify-end">
							<span className="text-sm text-muted-foreground">
								<strong className="font-semibold text-foreground tabular-nums">
									{bookmarkedPlaces.length}
								</strong>{" "}
								tersimpan
							</span>

							<ViewModeToggle
								value={viewMode}
								onChange={(nextMode) =>
									setExploreFilters({ viewMode: nextMode })
								}
								legend="Mode tampilan daftar disimpan"
							/>
						</div>
					</div>
				) : null}
			</section>

			<div className="space-y-5">
				{query.trim() ? (
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => setQuery("")}
							aria-label={`Hapus kata kunci ${query}`}
							className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							&ldquo;{query.trim()}&rdquo;
							<X className="size-3.5" aria-hidden="true" />
						</button>
						<Button variant="ghost" size="sm" onClick={() => setQuery("")}>
							<RotateCcw className="size-3.5" aria-hidden="true" />
							Reset
						</Button>
					</div>
				) : null}

				{bookmarkedPlaceIds.length === 0 ? (
					<div className="py-14 text-center space-y-4">
						<h2 className="text-lg font-semibold text-foreground">
							Belum ada tempat yang disimpan
						</h2>
						<p className="mx-auto max-w-md text-sm text-muted-foreground">
							Simpan tempat kuliner dari halaman Jelajah atau Hidden Gems untuk
							melihatnya kembali di sini.
						</p>
						<Button asChild variant="secondary">
							<Link to="/explore">Jelajah Kuliner</Link>
						</Button>
					</div>
				) : !isInitialLoading && bookmarkedPlaces.length === 0 ? (
					<div className="py-14 text-center space-y-4">
						<h2 className="text-lg font-semibold text-foreground">
							Tidak ada tempat tersimpan yang cocok dengan pencarian
						</h2>
						<Button variant="secondary" onClick={() => setQuery("")}>
							Tampilkan Semua
						</Button>
					</div>
				) : (
					<>
						<PlaceResultsList
							places={visibleBookmarks}
							mode="explore"
							viewMode={viewMode}
							containerRef={gridRef}
							isInitialLoading={isInitialLoading}
							skeletonCount={batchSize}
							withTopBorder={false}
						/>
						<PlaceInfiniteFooter
							visibleCount={visibleCount}
							totalItems={totalItems}
							currentPage={currentPage}
							totalPages={totalPages}
							hasMore={hasMore}
							isInitialLoading={isInitialLoading}
							isFetchingMore={isFetchingMore}
							error={error}
							batchSize={batchSize}
							sentinelRef={sentinelRef}
							onLoadMore={loadMore}
							onRetry={retry}
							itemLabel="tempat tersimpan"
						/>
					</>
				)}
			</div>
		</div>
	);
}
