import { Camera, CheckCircle2, PencilLine, RotateCcw, X } from "lucide-react";
import {
	type ChangeEvent,
	type DragEvent,
	type FormEvent,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { getPlacePhotoCount, readImageFiles } from "~/data/contribute";
import type { CulinaryPlace } from "~/lib/types";
import { cn } from "~/lib/utils";
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
	onAddPhoto: (placeId: string, photoUrl: string) => void;
	onRequestAddNewPlace: (prefillName: string) => void;
}

export function UpdateInfoForm({
	places,
	selectedPlaceId,
	onSelectPlace,
	onSuggestUpdate,
	onAddPhoto,
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
	const [queuedPhotos, setQueuedPhotos] = useState<string[]>([]);
	const [isDragActive, setIsDragActive] = useState(false);
	const [photoError, setPhotoError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [savedSummary, setSavedSummary] = useState<{
		name: string;
		slug: string;
		message: string;
	} | null>(null);

	const addrId = useId();
	const hoursId = useId();
	const priceId = useId();
	const phoneId = useId();
	const descId = useId();
	const noteId = useId();
	const photoInputId = useId();

	// Keep form values synced when user selects a different place
	useEffect(() => {
		if (!selectedPlace) return;
		setAddress(selectedPlace.address);
		setHours(selectedPlace.openingHours);
		setPrice(selectedPlace.priceRange);
		setPhone(selectedPlace.phone ?? "");
		setDescription(selectedPlace.description);
		setNote("");
		setQueuedPhotos([]);
		setPhotoError(null);
		setError(null);
	}, [selectedPlace]);

	const placesNeedingUpdates = useMemo(
		() =>
			places.filter((p) => !p.phone || getPlacePhotoCount(p) <= 1).slice(0, 3),
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

	const hasInfoChanges =
		Object.values(changedFields).some(Boolean) || note.trim().length > 0;
	const hasAnyChange = hasInfoChanges || queuedPhotos.length > 0;

	const handleFiles = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0) return;
		const { urls, error: fileErr } = await readImageFiles(files);
		if (fileErr) {
			setPhotoError(fileErr);
			return;
		}
		setPhotoError(null);
		setError(null);
		setSavedSummary(null);
		setQueuedPhotos((prev) =>
			Array.from(new Set([...prev, ...urls])).slice(0, 6),
		);
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		void handleFiles(e.target.files);
		e.target.value = "";
	};

	const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragActive(false);
		void handleFiles(e.dataTransfer.files);
	};

	const handleReset = () => {
		if (!selectedPlace) return;
		setAddress(selectedPlace.address);
		setHours(selectedPlace.openingHours);
		setPrice(selectedPlace.priceRange);
		setPhone(selectedPlace.phone ?? "");
		setDescription(selectedPlace.description);
		setNote("");
		setQueuedPhotos([]);
		setPhotoError(null);
		setError(null);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!selectedPlace) return;
		if (!hasAnyChange) {
			setError(
				"Ubah minimal satu informasi tempat, tambahkan foto baru, atau tulis catatan perubahan terlebih dahulu.",
			);
			return;
		}

		if (hasInfoChanges) {
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
		}

		const addedPhotoCount = queuedPhotos.length;
		for (const url of queuedPhotos) {
			onAddPhoto(selectedPlace.id, url);
		}

		const message =
			hasInfoChanges && addedPhotoCount > 0
				? `Pembaruan info dan ${addedPhotoCount} foto untuk "${selectedPlace.name}" telah disimpan.`
				: addedPhotoCount > 0
					? `${addedPhotoCount} foto baru berhasil ditambahkan ke "${selectedPlace.name}".`
					: `Pembaruan informasi "${selectedPlace.name}" telah disimpan.`;

		setNote("");
		setQueuedPhotos([]);
		setPhotoError(null);
		setError(null);
		setSavedSummary({
			name: selectedPlace.name,
			slug: selectedPlace.slug,
			message,
		});
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10"
		>
			<div className="lg:col-span-5 space-y-5">
				<PlacePicker
					places={places}
					selectedPlaceId={selectedPlace?.id ?? ""}
					onSelectPlace={(id) => {
						onSelectPlace(id);
						setSavedSummary(null);
					}}
					label="Pilih tempat yang ingin diperbarui"
					suggestedPlaces={placesNeedingUpdates}
					suggestedLabel="Perlu dilengkapi:"
					onRequestAddNewPlace={onRequestAddNewPlace}
					renderPlaceMeta={(p) =>
						`${p.photos.length} foto · ${p.phone ? p.openingHours : "Belum ada kontak"}`
					}
					listClassName="lg:max-h-[340px]"
				/>

				{selectedPlace ? (
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground">
							Galeri saat ini ({selectedPlace.photos.length} foto)
						</p>
						{selectedPlace.photos.length === 0 ? (
							<p className="rounded-[8px] border border-dashed border-border bg-background/50 px-3 py-2.5 text-xs text-muted-foreground">
								Belum ada foto tersimpan untuk tempat ini. Foto Anda akan
								menjadi yang pertama.
							</p>
						) : (
							<div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-3">
								{selectedPlace.photos.map((src, idx) => (
									<img
										key={src}
										src={src}
										alt={`Foto ${idx + 1} ${selectedPlace.name}`}
										width={200}
										height={125}
										className="aspect-[16/10] w-full rounded-[8px] border border-border object-cover bg-muted"
									/>
								))}
							</div>
						)}
					</div>
				) : null}

				<p>
					<Link
						to={selectedPlace ? `/claim?placeId=${selectedPlace.id}` : "/claim"}
						className="inline-flex min-h-[44px] items-center text-xs font-semibold text-primary hover:underline underline-offset-4"
					>
						Pemilik usaha ini? Ajukan klaim profil
					</Link>
				</p>
			</div>

			<div className="lg:col-span-7 space-y-6">
				<div className="space-y-1">
					<h2 className="text-lg font-bold text-foreground">
						Perbarui Informasi &amp; Foto Tempat
					</h2>
					<p className="text-xs sm:text-sm text-muted-foreground">
						Koreksi alamat, jam buka, kisaran harga, nomor kontak, deskripsi,
						atau unggah foto terbaru dari lokasi kuliner.
					</p>
				</div>

				{savedSummary ? (
					<div
						role="status"
						className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-hover"
					>
						<div className="flex items-center gap-2 font-medium">
							<CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
							<span>{savedSummary.message}</span>
						</div>
						<Link
							to={`/places/${savedSummary.slug}`}
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
							<Label htmlFor={phoneId}>
								Nomor Kontak / WhatsApp (opsional)
							</Label>
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

					<div className="sm:col-span-2 space-y-2.5 pt-1">
						<div className="flex items-center justify-between gap-2">
							<Label htmlFor={photoInputId}>
								Tambah Foto Tempat (opsional, maks. 6 foto)
							</Label>
							{queuedPhotos.length > 0 ? (
								<button
									type="button"
									onClick={() => setQueuedPhotos([])}
									className="text-xs font-medium text-muted-foreground hover:text-foreground"
								>
									Hapus semua ({queuedPhotos.length})
								</button>
							) : null}
						</div>

						<label
							htmlFor={photoInputId}
							onDragOver={(e) => {
								e.preventDefault();
								setIsDragActive(true);
							}}
							onDragLeave={() => setIsDragActive(false)}
							onDrop={handleDrop}
							className={cn(
								"flex min-h-[92px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed px-4 py-4 text-center text-sm transition-colors",
								isDragActive
									? "border-primary bg-primary-soft/60 text-foreground"
									: "border-border bg-background/60 text-muted-foreground hover:border-primary hover:text-foreground",
							)}
						>
							<Camera className="size-5 text-primary" aria-hidden="true" />
							<span className="font-semibold text-foreground">
								Pilih atau seret foto menu, hidangan, atau warung
							</span>
							<span className="text-xs text-muted-foreground">
								Format JPG, PNG, atau WebP (maks. 5 MB per foto)
							</span>
						</label>
						<input
							id={photoInputId}
							type="file"
							accept="image/*"
							multiple
							onChange={handleFileChange}
							className="sr-only"
						/>

						{photoError ? (
							<p role="alert" className="text-xs font-medium text-red-text">
								{photoError}
							</p>
						) : null}

						{queuedPhotos.length > 0 ? (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{queuedPhotos.map((src, idx) => (
									<div key={src} className="relative">
										<img
											src={src}
											alt={`Pratinjau foto baru ${idx + 1}`}
											width={240}
											height={150}
											className="aspect-[16/10] w-full rounded-[8px] border border-border object-cover"
										/>
										<button
											type="button"
											onClick={() =>
												setQueuedPhotos((prev) =>
													prev.filter((item) => item !== src),
												)
											}
											aria-label={`Hapus foto antrean ${idx + 1}`}
											className="absolute right-1.5 top-1.5 inline-flex size-11 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-xs hover:bg-background"
										>
											<X className="size-4" aria-hidden="true" />
										</button>
									</div>
								))}
							</div>
						) : null}
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

				<div className="flex flex-wrap items-center justify-end gap-2 pt-2">
					{hasAnyChange ? (
						<Button type="button" variant="outline" onClick={handleReset}>
							<RotateCcw className="size-4" aria-hidden="true" />
							Reset
						</Button>
					) : null}
					<Button type="submit" size="lg" disabled={!selectedPlace}>
						<PencilLine className="size-4" aria-hidden="true" />
						Simpan Pembaruan
					</Button>
				</div>
			</div>
		</form>
	);
}
