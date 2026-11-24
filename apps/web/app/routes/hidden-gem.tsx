import { Gem, Info, SlidersHorizontal } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { PlaceCard } from "~/components/place-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
	const { places } = useDarasa();
	const [districtFilter, setDistrictFilter] = useState<BatangDistrict | "all">(
		"all",
	);
	const districtId = useId();

	const hiddenGems = useMemo(() => {
		return places
			.filter((place) => {
				if (!place.hiddenGemEligible) return false;
				if (districtFilter !== "all" && place.district !== districtFilter)
					return false;
				return true;
			})
			.sort((a, b) => b.hiddenGemScore - a.hiddenGemScore);
	}, [places, districtFilter]);

	return (
		<div className="space-y-6">
			{/* Header Banner */}
			<Card className="p-6 lg:p-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
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
						<strong className="font-semibold text-foreground">4,0</strong> yang
						masuk daftar ini.
					</p>
				</div>

				<div className="rounded-[12px] border border-border bg-background p-4 max-w-sm space-y-1.5">
					<p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
						<Info className="size-4 text-primary" aria-hidden="true" />
						Rumus Hidden Gem Score (PRD)
					</p>
					<p className="text-xs text-muted-foreground leading-relaxed tabular-nums">
						Skor = Rata-rata Rating x (1 / (1 + Jumlah Ulasan)), dengan syarat
						Rata-rata Rating &ge; 4,0.
					</p>
				</div>
			</Card>

			{/* Filter Bar */}
			<Card className="p-4 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<SlidersHorizontal
						className="size-4 text-primary"
						aria-hidden="true"
					/>
					<span>
						Ditemukan{" "}
						<strong className="font-semibold text-foreground tabular-nums">
							{hiddenGems.length}
						</strong>{" "}
						hidden gem yang memenuhi syarat
					</span>
				</div>

				<div className="flex items-center gap-3 min-w-[240px]">
					<Label htmlFor={districtId} className="shrink-0">
						Kawasan:
					</Label>
					<Select
						value={districtFilter}
						onValueChange={(val) =>
							setDistrictFilter(val as BatangDistrict | "all")
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
			</Card>

			{hiddenGems.length === 0 ? (
				<Card className="p-10 text-center space-y-4">
					<h2 className="text-lg font-semibold text-foreground">
						Belum ada hidden gem di kawasan ini
					</h2>
					<p className="mx-auto max-w-md text-sm text-muted-foreground">
						Bantu warga menemukan warung atau kedai terbaik yang belum banyak
						dikenal dengan menambahkan tempat baru atau memberi ulasan.
					</p>
					<div className="flex flex-wrap justify-center gap-3">
						<Button
							variant="secondary"
							onClick={() => setDistrictFilter("all")}
						>
							Lihat Semua Kawasan
						</Button>
						<Button asChild>
							<Link to="/submit-place">Tambah Tempat Kuliner</Link>
						</Button>
					</div>
				</Card>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
					{hiddenGems.map((place, index) => (
						<PlaceCard
							key={place.id}
							place={place}
							mode="hidden-gem"
							prioritizeImage={index < 3}
						/>
					))}
				</div>
			)}
		</div>
	);
}
