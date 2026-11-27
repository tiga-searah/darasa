import { LayoutGrid, List, RotateCcw } from "lucide-react";
import { useId, useMemo } from "react";
import { Link } from "react-router";
import { PlaceCard } from "~/components/place-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useDarasa } from "~/context/darasa-store";
import { BATANG_DISTRICTS } from "~/data/batang-places";
import type { BatangDistrict } from "~/lib/types";
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
	const districtId = useId();

	const {
		category: categoryFilter,
		district: districtFilter,
		verification: verificationFilter,
		viewMode,
	} = exploreFilters;

	const hiddenGems = useMemo(() => {
		return places
			.filter((place) => {
				if (!place.hiddenGemEligible) return false;
				if (categoryFilter !== "all" && place.category !== categoryFilter)
					return false;
				if (districtFilter !== "all" && place.district !== districtFilter)
					return false;
				if (
					verificationFilter !== "all" &&
					place.verificationStatus !== verificationFilter
				) {
					return false;
				}
				return true;
			})
			.sort((a, b) => b.hiddenGemScore - a.hiddenGemScore);
	}, [places, categoryFilter, districtFilter, verificationFilter]);

	const hasActiveFilters =
		categoryFilter !== "all" ||
		districtFilter !== "all" ||
		verificationFilter !== "all";

	return (
		<div className="space-y-6">
			{/* Cardless Golden Highlight Header with Smooth Bottom Fade */}
			<section className="relative -mt-[6rem] pt-[6.5rem] pb-10 xl:-mt-[6rem] xl:pt-[6.5rem]">
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

			{/* Slim Filter & View Controls */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
					<span>
						<strong className="font-semibold text-foreground tabular-nums">
							{hiddenGems.length}
						</strong>{" "}
						tempat ditemukan
					</span>
					{categoryFilter !== "all" ? (
						<Badge variant="default">{categoryFilter}</Badge>
					) : null}
					{hasActiveFilters ? (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => resetExploreFilters()}
						>
							<RotateCcw className="size-3.5" aria-hidden="true" />
							Reset
						</Button>
					) : null}
				</div>

				<div className="flex w-full items-center justify-between gap-3 sm:w-auto">
					<div className="flex min-w-0 flex-1 items-center gap-2 sm:w-[220px] sm:flex-none">
						<Label htmlFor={districtId} className="shrink-0 text-xs">
							Kawasan:
						</Label>
						<Select
							value={districtFilter}
							onValueChange={(val) =>
								setExploreFilters({ district: val as BatangDistrict | "all" })
							}
						>
							<SelectTrigger id={districtId} className="bg-background">
								<SelectValue />
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

					<fieldset className="m-0 ml-auto inline-flex shrink-0 items-center rounded-[8px] border border-border bg-background p-0.5">
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

			{hiddenGems.length === 0 ? (
				<div className="border-t border-border py-14 text-center space-y-4">
					<h2 className="text-lg font-semibold text-foreground">
						Belum ada hidden gems yang cocok dengan filter ini
					</h2>
					<p className="mx-auto max-w-md text-sm text-muted-foreground">
						Bantu warga menemukan warung atau kedai terbaik yang belum banyak
						dikenal dengan mengubah filter atau menambahkan tempat baru.
					</p>
					<div className="flex flex-wrap justify-center gap-3">
						<Button variant="secondary" onClick={() => resetExploreFilters()}>
							Lihat Semua Hidden Gems
						</Button>
						<Button asChild>
							<Link to="/contribute/add-place">Tambah Tempat Kuliner</Link>
						</Button>
					</div>
				</div>
			) : viewMode === "list" ? (
				<div className="divide-y divide-border border-t border-border">
					{hiddenGems.map((place, index) => (
						<PlaceCard
							key={place.id}
							place={place}
							mode="hidden-gem"
							layout="list"
							prioritizeImage={index < 3}
						/>
					))}
				</div>
			) : (
				<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
					{hiddenGems.map((place, index) => (
						<PlaceCard
							key={place.id}
							place={place}
							mode="hidden-gem"
							layout="grid"
							prioritizeImage={index < 3}
						/>
					))}
				</div>
			)}
		</div>
	);
}
