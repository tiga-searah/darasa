import { Check, MapPin, MapPinPlus, Search, Star, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { cn } from "~/lib/utils";

interface PlacePickerProps {
	places: PlaceWithMetrics[];
	selectedPlaceId: string;
	onSelectPlace: (placeId: string) => void;
	label: string;
	helperText?: string;
	suggestedPlaces?: PlaceWithMetrics[];
	suggestedLabel?: string;
	onRequestAddNewPlace?: (prefillName: string) => void;
	renderPlaceMeta?: (place: PlaceWithMetrics) => string;
	listClassName?: string;
}

export function PlacePicker({
	places,
	selectedPlaceId,
	onSelectPlace,
	label,
	helperText,
	suggestedPlaces = [],
	suggestedLabel = "Disarankan:",
	onRequestAddNewPlace,
	renderPlaceMeta,
	listClassName,
}: PlacePickerProps) {
	const [query, setQuery] = useState("");
	const searchId = useId();
	const listboxId = useId();

	const filteredPlaces = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return places;
		return places.filter((p) => {
			const haystack =
				`${p.name} ${p.district} ${p.category} ${p.address}`.toLowerCase();
			return haystack.includes(q);
		});
	}, [places, query]);

	const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null;

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<Label htmlFor={searchId}>{label}</Label>
				{selectedPlace ? (
					<span className="text-xs font-medium text-primary-hover">
						Terpilih: {selectedPlace.name}
					</span>
				) : null}
			</div>

			{helperText ? (
				<p className="text-xs text-muted-foreground">{helperText}</p>
			) : null}

			{suggestedPlaces.length > 0 ? (
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-xs font-medium text-muted-foreground">
						{suggestedLabel}
					</span>
					{suggestedPlaces.map((p) => {
						const active = p.id === selectedPlaceId;
						return (
							<button
								key={p.id}
								type="button"
								onClick={() => onSelectPlace(p.id)}
								aria-pressed={active}
								className={cn(
									"inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
									active
										? "border-primary bg-primary-soft text-primary-hover"
										: "border-border bg-card text-foreground hover:border-card-hover-border hover:bg-background",
								)}
							>
								<span className="truncate max-w-[180px]">{p.name}</span>
							</button>
						);
					})}
				</div>
			) : null}

			<div className="relative">
				<Search
					className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
				<Input
					id={searchId}
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Cari nama warung, menu, atau kawasan di Batang..."
					aria-controls={listboxId}
					className="pl-10 pr-12"
				/>
				{query.trim().length > 0 ? (
					<button
						type="button"
						onClick={() => setQuery("")}
						aria-label="Hapus pencarian tempat"
						className="absolute right-0.5 top-1/2 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<X className="size-4" aria-hidden="true" />
					</button>
				) : null}
			</div>

			{places.length === 0 ? (
				<div className="rounded-[10px] border border-dashed border-border bg-background/60 p-5 text-center space-y-3">
					<p className="text-sm font-medium text-foreground">
						Belum ada tempat kuliner terdaftar
					</p>
					<p className="text-xs text-muted-foreground">
						Tambahkan tempat pertama agar warga bisa memberi ulasan dan foto.
					</p>
					{onRequestAddNewPlace ? (
						<Button
							type="button"
							className="min-h-[44px]"
							onClick={() => onRequestAddNewPlace("")}
						>
							<MapPinPlus className="size-4" aria-hidden="true" />
							Tambah Tempat Baru
						</Button>
					) : null}
				</div>
			) : filteredPlaces.length === 0 ? (
				<div className="rounded-[10px] border border-dashed border-border bg-background/60 p-5 text-center space-y-3">
					<p className="text-sm font-medium text-foreground">
						Tidak ada tempat cocok untuk "{query.trim()}"
					</p>
					<p className="text-xs text-muted-foreground">
						Coba kata kunci lain atau daftarkan langsung tempat ini ke peta
						Darasa.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-2">
						<Button
							type="button"
							variant="outline"
							className="min-h-[44px]"
							onClick={() => setQuery("")}
						>
							Reset Pencarian
						</Button>
						{onRequestAddNewPlace ? (
							<Button
								type="button"
								className="min-h-[44px]"
								onClick={() => onRequestAddNewPlace(query.trim())}
							>
								<MapPinPlus className="size-4" aria-hidden="true" />
								Tambahkan "{query.trim()}"
							</Button>
						) : null}
					</div>
				</div>
			) : (
				<div
					id={listboxId}
					className={cn(
						"grid max-h-[248px] grid-cols-1 gap-2 overflow-y-auto overscroll-contain rounded-[10px] border border-border bg-background/50 p-2 sm:grid-cols-2 lg:grid-cols-1",
						listClassName,
					)}
				>
					{filteredPlaces.map((place) => {
						const isSelected = place.id === selectedPlaceId;
						const customMeta = renderPlaceMeta ? renderPlaceMeta(place) : null;
						return (
							<button
								key={place.id}
								type="button"
								aria-pressed={isSelected}
								onClick={() => onSelectPlace(place.id)}
								className={cn(
									"flex min-h-[60px] items-center gap-3 rounded-[8px] border p-2.5 text-left transition-colors",
									isSelected
										? "border-primary bg-primary-soft/60"
										: "border-border bg-card hover:border-card-hover-border hover:bg-background",
								)}
							>
								<img
									src={place.photos[0] ?? "/images/megono-batang.svg"}
									alt=""
									width={48}
									height={48}
									className="size-11 shrink-0 rounded-[6px] border border-border object-cover bg-muted"
								/>
								<div className="min-w-0 flex-1 space-y-0.5">
									<p className="truncate text-xs font-semibold text-foreground">
										{place.name}
									</p>
									<p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
										<MapPin
											className="size-3 shrink-0 text-primary"
											aria-hidden="true"
										/>
										<span className="truncate">{place.district}</span>
										<span aria-hidden="true">·</span>
										<span className="inline-flex items-center gap-0.5 tabular-nums">
											<Star
												className="size-3 fill-accent-yellow text-accent-yellow"
												aria-hidden="true"
											/>
											{place.reviewCount > 0
												? place.averageRating.toFixed(1)
												: "Baru"}
										</span>
									</p>
									{customMeta ? (
										<p className="truncate text-[11px] font-medium text-primary-hover">
											{customMeta}
										</p>
									) : null}
								</div>
								<span
									aria-hidden="true"
									className={cn(
										"inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
										isSelected
											? "border-primary bg-primary text-primary-foreground"
											: "border-input bg-card",
									)}
								>
									{isSelected ? <Check className="size-3" /> : null}
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
