import {
	Gem,
	Info,
	LayoutGrid,
	List,
	RotateCcw,
	SlidersHorizontal,
} from "lucide-react";
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
		{ title: "Hidden Gem Batang | Darasa" },
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
			{/* Open Editorial Header (Cardless) */}
			<section className="border-b border-border pb-5 space-y-4">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-2xl space-y-2">
						<Badge variant="yellow">
							<Gem className="size-3.5" aria-hidden="true" />
							<span>Mode Kurasi Hidden Gem</span>
						</Badge>
						<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
							Hidden Gem Kuliner Batang
						</h1>
						<p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
							Memberi panggung bagi UMKM kuliner bermutu tinggi yang masih minim
							eksposur. Hanya tempat dengan rating rata-rata minimal{" "}
							<strong className="font-semibold text-foreground">4,0</strong>{" "}
							yang masuk daftar ini.
						</p>
					</div>

					<details className="rounded-[10px] border border-border bg-background px-4 py-2.5 text-xs max-w-sm">
						<summary className="flex items-center gap-1.5 font-semibold text-foreground">
							<Info className="size-4 text-primary" aria-hidden="true" />
							Rumus Hidden Gem Score (PRD)
						</summary>
						<p className="mt-2 text-muted-foreground leading-relaxed tabular-nums">
							Skor = Rata-rata Rating x (1 / (1 + Jumlah Ulasan)), dengan syarat
							Rata-rata Rating &ge; 4,0.
						</p>
					</details>
				</div>
			</section>

			{/* Slim Filter & View Controls */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
					<SlidersHorizontal
						className="size-4 text-primary"
						aria-hidden="true"
					/>
					<span>
						<strong className="font-semibold text-foreground tabular-nums">
							{hiddenGems.length}
						</strong>{" "}
						hidden gem memenuhi syarat
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

				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2 min-w-[220px]">
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

			{hiddenGems.length === 0 ? (
				<div className="border-t border-border py-14 text-center space-y-4">
					<h2 className="text-lg font-semibold text-foreground">
						Belum ada hidden gem yang cocok dengan filter ini
					</h2>
					<p className="mx-auto max-w-md text-sm text-muted-foreground">
						Bantu warga menemukan warung atau kedai terbaik yang belum banyak
						dikenal dengan mengubah filter atau menambahkan tempat baru.
					</p>
					<div className="flex flex-wrap justify-center gap-3">
						<Button variant="secondary" onClick={() => resetExploreFilters()}>
							Lihat Semua Hidden Gem
						</Button>
						<Button asChild>
							<Link to="/submit-place">Tambah Tempat Kuliner</Link>
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
