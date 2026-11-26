import { Bookmark, Compass, LayoutGrid, List, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { PlaceCard } from "~/components/place-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useDarasa } from "~/context/darasa-store";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/bookmarks";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Bookmark Kuliner | Darasa" },
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
	const searchId = useId();
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

	return (
		<div className="space-y-6">
			<section className="border-b border-border pb-5 space-y-4">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-2xl space-y-1.5">
						<Badge variant="secondary">
							<Bookmark className="size-3.5" aria-hidden="true" />
							<span>Simpanan Pribadi</span>
						</Badge>
						<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
							Bookmark Kuliner
						</h1>
						<p className="text-sm text-muted-foreground">
							Tempat makan dan kedai pilihan di Batang yang Anda simpan untuk
							kunjungan berikutnya.
						</p>
					</div>

					<Button asChild variant="outline" size="sm">
						<Link to="/explore">
							<Compass className="size-4" aria-hidden="true" />
							Jelajah Lebih Banyak
						</Link>
					</Button>
				</div>

				{bookmarkedPlaceIds.length > 0 ? (
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="relative flex-1 max-w-md">
							<Label htmlFor={searchId} className="sr-only">
								Cari di dalam bookmark
							</Label>
							<Search
								className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								id={searchId}
								type="search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Cari tempat tersimpan..."
								className="h-10 rounded-full border-border bg-background pl-10 pr-4"
							/>
						</div>

						<div className="flex items-center gap-3">
							<span className="text-sm text-muted-foreground">
								<strong className="font-semibold text-foreground tabular-nums">
									{bookmarkedPlaces.length}
								</strong>{" "}
								tersimpan
							</span>

							<fieldset className="m-0 inline-flex items-center rounded-[8px] border border-border bg-background p-0.5">
								<legend className="sr-only">Mode tampilan bookmark</legend>
								<button
									type="button"
									aria-label="Tampilan grid"
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
									aria-label="Tampilan daftar"
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
				) : null}
			</section>

			{bookmarkedPlaceIds.length === 0 ? (
				<div className="py-16 text-center space-y-4">
					<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
						<Bookmark className="size-6" aria-hidden="true" />
					</div>
					<h2 className="text-lg font-semibold text-foreground">
						Belum ada tempat kuliner di Bookmark
					</h2>
					<p className="mx-auto max-w-md text-sm text-muted-foreground">
						Klik ikon bookmark pada kartu kuliner di halaman Jelajah atau detail
						tempat untuk menyimpannya di sini.
					</p>
					<Button asChild>
						<Link to="/explore">
							<Compass className="size-4" aria-hidden="true" />
							Jelajah Kuliner Batang
						</Link>
					</Button>
				</div>
			) : bookmarkedPlaces.length === 0 ? (
				<div className="py-12 text-center space-y-3">
					<h2 className="text-lg font-semibold text-foreground">
						Tidak ada bookmark yang cocok dengan pencarian
					</h2>
					<Button variant="secondary" onClick={() => setQuery("")}>
						Tampilkan Semua Bookmark
					</Button>
				</div>
			) : viewMode === "list" ? (
				<div className="divide-y divide-border">
					{bookmarkedPlaces.map((place, index) => (
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
				<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
					{bookmarkedPlaces.map((place, index) => (
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
