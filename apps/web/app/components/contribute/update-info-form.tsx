import { CheckCircle2, PencilLine, RotateCcw } from "lucide-react";
import { type FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import type { CulinaryPlace } from "~/lib/types";
import { PlacePicker } from "./place-picker";

interface UpdateInfoFormProps {
	places: PlaceWithMetrics[];
	selectedPlaceId: string;
	onSelectPlace: (placeId: string) => void;
	onSuggestUpdate: (
		placeId: string,
		updates: Partial<
			Pick<
				CulinaryPlace,
				"address" | "openingHours" | "priceRange" | "phone" | "description"
			>
		>,
		note?: string,
	) => void;
	onRequestAddNewPlace: (prefillName: string) => void;
}

export function UpdateInfoForm({
	places,
	selectedPlaceId,
	onSelectPlace,
	onSuggestUpdate,
	onRequestAddNewPlace,
}: UpdateInfoFormProps) {
	const selectedPlace =
		places.find((p) => p.id === selectedPlaceId) ?? places[0];

	const [address, setAddress] = useState(selectedPlace?.address ?? "");
	const [hours, setHours] = useState(selectedPlace?.openingHours ?? "");
	const [price, setPrice] = useState(selectedPlace?.priceRange ?? "");
	const [phone, setPhone] = useState(selectedPlace?.phone ?? "");
	const [description, setDescription] = useState(
		selectedPlace?.description ?? "",
	);
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [savedPlace, setSavedPlace] = useState<{
		name: string;
		slug: string;
	} | null>(null);

	const addrId = useId();
	const hoursId = useId();
	const priceId = useId();
	const phoneId = useId();
	const descId = useId();
	const noteId = useId();

	// Keep form values synced when user selects a different place
	useEffect(() => {
		if (!selectedPlace) return;
		setAddress(selectedPlace.address);
		setHours(selectedPlace.openingHours);
		setPrice(selectedPlace.priceRange);
		setPhone(selectedPlace.phone ?? "");
		setDescription(selectedPlace.description);
		setNote("");
		setError(null);
	}, [selectedPlace]);

	const placesNeedingInfo = useMemo(
		() => places.filter((p) => !p.phone).slice(0, 3),
		[places],
	);

	const changedFields = useMemo(() => {
		if (!selectedPlace) {
			return {
				address: false,
				hours: false,
				price: false,
				phone: false,
				description: false,
			};
		}
		return {
			address: address.trim() !== selectedPlace.address.trim(),
			hours: hours.trim() !== selectedPlace.openingHours.trim(),
			price: price.trim() !== selectedPlace.priceRange.trim(),
			phone: phone.trim() !== (selectedPlace.phone ?? "").trim(),
			description: description.trim() !== selectedPlace.description.trim(),
		};
	}, [address, hours, price, phone, description, selectedPlace]);

	const hasAnyChange =
		Object.values(changedFields).some(Boolean) || note.trim().length > 0;

	const handleReset = () => {
		if (!selectedPlace) return;
		setAddress(selectedPlace.address);
		setHours(selectedPlace.openingHours);
		setPrice(selectedPlace.priceRange);
		setPhone(selectedPlace.phone ?? "");
		setDescription(selectedPlace.description);
		setNote("");
		setError(null);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!selectedPlace) return;
		if (!hasAnyChange) {
			setError(
				"Ubah minimal satu informasi tempat atau tulis catatan perubahan terlebih dahulu.",
			);
			return;
		}
		onSuggestUpdate(
			selectedPlace.id,
			{
				address: address.trim() || selectedPlace.address,
				openingHours: hours.trim() || selectedPlace.openingHours,
				priceRange: price.trim() || selectedPlace.priceRange,
				phone: phone.trim() || undefined,
				description: description.trim() || selectedPlace.description,
			},
			note,
		);
		setNote("");
		setError(null);
		setSavedPlace({ name: selectedPlace.name, slug: selectedPlace.slug });
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-[12px] border border-border bg-card p-5 sm:p-6 space-y-6"
		>
			<div className="space-y-1">
				<h2 className="text-lg font-semibold text-foreground">
					Perbarui Informasi Tempat
				</h2>
				<p className="text-xs sm:text-sm text-muted-foreground">
					Koreksi alamat, jam buka, kisaran harga, nomor kontak, atau deskripsi
					tempat yang sudah berubah.
				</p>
			</div>

			{savedPlace ? (
				<div
					role="status"
					className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-hover"
				>
					<div className="flex items-center gap-2 font-medium">
						<CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
						<span>Pembaruan informasi "{savedPlace.name}" telah disimpan.</span>
					</div>
					<Link
						to={`/places/${savedPlace.slug}`}
						className="text-xs font-semibold underline underline-offset-4"
					>
						Lihat halaman tempat
					</Link>
				</div>
			) : null}

			{error ? (
				<div
					role="alert"
					className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-4 py-3 text-sm font-medium text-red-text"
				>
					{error}
				</div>
			) : null}

			<PlacePicker
				places={places}
				selectedPlaceId={selectedPlace?.id ?? ""}
				onSelectPlace={(id) => {
					onSelectPlace(id);
					setSavedPlace(null);
				}}
				label="Pilih tempat yang ingin diperbarui"
				suggestedPlaces={placesNeedingInfo}
				suggestedLabel="Belum ada kontak:"
				onRequestAddNewPlace={onRequestAddNewPlace}
				renderPlaceMeta={(p) => (p.phone ? p.openingHours : "Belum ada kontak")}
			/>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="sm:col-span-2 space-y-1.5">
					<div className="flex items-center justify-between gap-2">
						<Label htmlFor={addrId}>Alamat / Patokan</Label>
						{changedFields.address ? (
							<Badge variant="default">Diubah</Badge>
						) : null}
					</div>
					<Input
						id={addrId}
						value={address}
						onChange={(e) => setAddress(e.target.value)}
					/>
				</div>

				<div className="space-y-1.5">
					<div className="flex items-center justify-between gap-2">
						<Label htmlFor={hoursId}>Jam Buka</Label>
						{changedFields.hours ? (
							<Badge variant="default">Diubah</Badge>
						) : null}
					</div>
					<Input
						id={hoursId}
						value={hours}
						onChange={(e) => setHours(e.target.value)}
					/>
				</div>

				<div className="space-y-1.5">
					<div className="flex items-center justify-between gap-2">
						<Label htmlFor={priceId}>Kisaran Harga</Label>
						{changedFields.price ? (
							<Badge variant="default">Diubah</Badge>
						) : null}
					</div>
					<Input
						id={priceId}
						value={price}
						onChange={(e) => setPrice(e.target.value)}
					/>
				</div>

				<div className="sm:col-span-2 space-y-1.5">
					<div className="flex items-center justify-between gap-2">
						<Label htmlFor={phoneId}>Nomor Kontak / WhatsApp (opsional)</Label>
						{changedFields.phone ? (
							<Badge variant="default">Diubah</Badge>
						) : null}
					</div>
					<Input
						id={phoneId}
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						placeholder="0812-xxxx-xxxx"
					/>
				</div>

				<div className="sm:col-span-2 space-y-1.5">
					<div className="flex items-center justify-between gap-2">
						<Label htmlFor={descId}>Deskripsi Tempat</Label>
						{changedFields.description ? (
							<Badge variant="default">Diubah</Badge>
						) : null}
					</div>
					<Textarea
						id={descId}
						rows={3}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>

				<div className="sm:col-span-2 space-y-1.5">
					<Label htmlFor={noteId}>Catatan Perubahan (opsional)</Label>
					<Textarea
						id={noteId}
						rows={2}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Contoh: Sekarang buka sampai pukul 22.00 WIB di akhir pekan."
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
				<Link
					to={selectedPlace ? `/claim?placeId=${selectedPlace.id}` : "/claim"}
					className="text-xs font-semibold text-primary hover:underline underline-offset-4"
				>
					Pemilik usaha ini? Ajukan klaim profil
				</Link>
				<div className="flex flex-wrap items-center gap-2">
					{hasAnyChange ? (
						<Button type="button" variant="outline" onClick={handleReset}>
							<RotateCcw className="size-4" aria-hidden="true" />
							Reset
						</Button>
					) : null}
					<Button type="submit" size="lg" disabled={!selectedPlace}>
						<PencilLine className="size-4" aria-hidden="true" />
						Simpan Pembaruan Info
					</Button>
				</div>
			</div>
		</form>
	);
}
