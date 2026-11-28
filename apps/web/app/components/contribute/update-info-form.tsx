import { Camera, CheckCircle2, PencilLine, RotateCcw, X } from "lucide-react";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import { Link } from "react-router";
import {
	OpeningHoursField,
	PriceRangeField,
} from "~/components/place-schedule-price-fields";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { WhatsappInputField } from "~/components/whatsapp-input-field";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { readImageFiles } from "~/data/contribute";
import type { CulinaryPlace } from "~/lib/types";
import {
	formatWhatsappAfter62,
	toStoredWhatsappNumber,
	validateWhatsappNumber,
} from "~/lib/whatsapp";
import {
	parseOpeningHoursValue,
	parsePriceRangeValue,
	toEditableOpeningHours,
	toEditablePriceRange,
} from "./add-place-validation";
import { PhotoUploadDropzone } from "./photo-upload-dropzone";
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
	const [hours, setHours] = useState(() =>
		toEditableOpeningHours(selectedPlace?.openingHours ?? ""),
	);
	const [hoursError, setHoursError] = useState<string | null>(null);
	const [price, setPrice] = useState(() =>
		toEditablePriceRange(selectedPlace?.priceRange ?? ""),
	);
	const [priceError, setPriceError] = useState<string | null>(null);
	const [phoneSuffix, setPhoneSuffix] = useState(() =>
		formatWhatsappAfter62(selectedPlace?.phone ?? ""),
	);
	const [phoneError, setPhoneError] = useState<string | null>(null);
	const [description, setDescription] = useState(
		selectedPlace?.description ?? "",
	);
	const [note, setNote] = useState("");
	const [queuedPhotos, setQueuedPhotos] = useState<string[]>([]);
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

	const syncFormFromPlace = useCallback((place: PlaceWithMetrics) => {
		setAddress(place.address);
		setHours(toEditableOpeningHours(place.openingHours));
		setHoursError(null);
		setPrice(toEditablePriceRange(place.priceRange));
		setPriceError(null);
		setPhoneSuffix(formatWhatsappAfter62(place.phone ?? ""));
		setPhoneError(null);
		setDescription(place.description);
		setNote("");
		setQueuedPhotos([]);
		setPhotoError(null);
		setError(null);
	}, []);

	useEffect(() => {
		if (selectedPlace) syncFormFromPlace(selectedPlace);
	}, [selectedPlace, syncFormFromPlace]);

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
			hours:
				hours.trim() !==
				toEditableOpeningHours(selectedPlace.openingHours).trim(),
			price:
				price.trim() !== toEditablePriceRange(selectedPlace.priceRange).trim(),
			phone:
				phoneSuffix.trim() !==
				formatWhatsappAfter62(selectedPlace.phone ?? "").trim(),
			description: description.trim() !== selectedPlace.description.trim(),
		};
	}, [address, hours, price, phoneSuffix, description, selectedPlace]);

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

	const handleReset = () => {
		if (selectedPlace) syncFormFromPlace(selectedPlace);
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

		let nextOpeningHours = selectedPlace.openingHours;
		if (changedFields.hours) {
			const hoursCheck = parseOpeningHoursValue(hours);
			if (hoursCheck.error) {
				setHoursError(hoursCheck.error);
				setError(hoursCheck.error);
				return;
			}
			nextOpeningHours = hoursCheck.formatted;
		}

		let nextPriceRange = selectedPlace.priceRange;
		if (changedFields.price) {
			const priceCheck = parsePriceRangeValue(price);
			if (priceCheck.error) {
				setPriceError(priceCheck.error);
				setError(priceCheck.error);
				return;
			}
			nextPriceRange = priceCheck.formatted;
		}

		let nextPhone = selectedPlace.phone;
		if (changedFields.phone) {
			if (!phoneSuffix.trim()) {
				nextPhone = undefined;
			} else {
				const fullWhatsapp = toStoredWhatsappNumber(phoneSuffix);
				const waCheck = validateWhatsappNumber(fullWhatsapp);
				if (!waCheck.valid) {
					const message =
						waCheck.error ?? "Masukkan nomor WhatsApp aktif yang valid.";
					setPhoneError(message);
					setError(message);
					return;
				}
				nextPhone = fullWhatsapp;
			}
		}

		if (hasInfoChanges) {
			onSuggestUpdate(
				selectedPlace.id,
				{
					address: address.trim() || selectedPlace.address,
					openingHours: nextOpeningHours,
					priceRange: nextPriceRange,
					phone: nextPhone,
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

					<OpeningHoursField
						id={hoursId}
						label="Jam Buka"
						value={hours}
						error={hoursError}
						labelExtra={
							changedFields.hours ? (
								<Badge variant="default">Diubah</Badge>
							) : null
						}
						onChange={(nextValue, nextError) => {
							setHours(nextValue);
							setHoursError(nextError ?? null);
							if (error) setError(null);
						}}
						onBlurError={setHoursError}
					/>

					<PriceRangeField
						id={priceId}
						label="Kisaran Harga"
						value={price}
						error={priceError}
						labelExtra={
							changedFields.price ? (
								<Badge variant="default">Diubah</Badge>
							) : null
						}
						onChange={(nextValue) => {
							setPrice(nextValue);
							setPriceError(null);
							if (error) setError(null);
						}}
						onBlurError={setPriceError}
					/>

					<div className="sm:col-span-2">
						<WhatsappInputField
							id={phoneId}
							label="Nomor Kontak / WhatsApp"
							value={phoneSuffix}
							error={phoneError}
							labelExtra={
								changedFields.phone ? (
									<Badge variant="default">Diubah</Badge>
								) : null
							}
							onChange={(formatted, typingErr) => {
								setPhoneSuffix(formatted);
								setPhoneError(typingErr);
								if (error) setError(null);
							}}
							onBlurError={setPhoneError}
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

						<PhotoUploadDropzone
							id={photoInputId}
							icon={Camera}
							title="Pilih atau seret foto menu, hidangan, atau warung"
							subtitle="Format JPG, PNG, atau WebP (maks. 5 MB per foto)"
							multiple
							className="min-h-[92px]"
							titleClassName="font-semibold"
							onFilesSelected={handleFiles}
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
