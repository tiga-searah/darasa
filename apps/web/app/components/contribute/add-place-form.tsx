import { ImagePlus, MapPinPlus, X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Link } from "react-router";
import { LegalityDocumentField } from "~/components/legality-document-field";
import {
	OpeningHoursField,
	PriceRangeField,
} from "~/components/place-schedule-price-fields";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import {
	BATANG_DISTRICTS,
	DISTRICT_COORDINATES,
	PLACE_CATEGORIES,
} from "~/data/batang-places";
import { readImageFiles } from "~/data/contribute";
import type { BatangDistrict, PlaceCategory } from "~/lib/types";
import { cn } from "~/lib/utils";
import { AddPlaceLocationSection } from "./add-place-location-section";
import { AddPlaceLivePreview } from "./add-place-preview";
import { AddPlaceSuccess } from "./add-place-success";
import {
	type AddPlaceDraft,
	type AddPlaceErrorField,
	type AddPlaceErrors,
	validateAddPlaceDraft,
} from "./add-place-validation";
import { PhotoUploadDropzone } from "./photo-upload-dropzone";

export type { AddPlaceDraft } from "./add-place-validation";

interface AddPlaceFormProps {
	draft: AddPlaceDraft;
	onChangeDraft: (updater: (prev: AddPlaceDraft) => AddPlaceDraft) => void;
	onSubmitPlace: (input: {
		name: string;
		category: PlaceCategory;
		district: BatangDistrict;
		address: string;
		lat: number;
		lng: number;
		openingHours: string;
		priceRange: string;
		description: string;
		photos: string[];
		legalityDocumentName?: string;
		legalityDocumentUrl?: string;
	}) => { slug: string; name: string; legalityDocumentName?: string };
	onResetDraft: () => void;
}

export function AddPlaceForm({
	draft,
	onChangeDraft,
	onSubmitPlace,
	onResetDraft,
}: AddPlaceFormProps) {
	const [mapsLinkInput, setMapsLinkInput] = useState("");
	const [geoMessage, setGeoMessage] = useState<string | null>(null);
	const [hasCustomLocation, setHasCustomLocation] = useState(false);
	const [photoError, setPhotoError] = useState<string | null>(null);
	const [errors, setErrors] = useState<AddPlaceErrors>({});
	const [createdPlace, setCreatedPlace] = useState<{
		slug: string;
		name: string;
		legalityDocumentName?: string;
	} | null>(null);

	const nameId = useId();
	const distId = useId();
	const addrId = useId();
	const hoursId = useId();
	const priceId = useId();
	const descId = useId();
	const photoId = useId();
	const legalityId = useId();

	const clearError = (...fields: AddPlaceErrorField[]) => {
		setErrors((prev) => {
			let changed = false;
			const next = { ...prev };
			for (const field of fields) {
				if (next[field]) {
					delete next[field];
					changed = true;
				}
			}
			return changed ? next : prev;
		});
	};

	const handleDistrictChange = (nextDistrict: BatangDistrict) => {
		const coords = DISTRICT_COORDINATES[nextDistrict];
		clearError("district", "lat", "lng");
		onChangeDraft((prev) => ({
			...prev,
			district: nextDistrict,
			...(hasCustomLocation
				? {}
				: {
						lat: String(coords.lat),
						lng: String(coords.lng),
					}),
		}));
	};

	const handleLocationDraftChange = (
		updater: (prev: AddPlaceDraft) => AddPlaceDraft,
	) => {
		setHasCustomLocation(true);
		clearError("lat", "lng");
		onChangeDraft(updater);
	};

	const handleFiles = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0) return;
		const { urls, error } = await readImageFiles([files[0]]);
		if (error) {
			setPhotoError(error);
			return;
		}
		setPhotoError(null);
		clearError("photo");
		if (urls[0]) {
			onChangeDraft((prev) => ({ ...prev, photoPreview: urls[0] }));
		}
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const validation = validateAddPlaceDraft(draft);
		setErrors(validation.errors);
		if (!validation.isValid) return;

		const created = onSubmitPlace({
			name: draft.name.trim().replace(/\s+/g, " "),
			category: draft.category,
			district: draft.district,
			address: draft.address.trim().replace(/\s+/g, " "),
			lat: validation.parsedLat,
			lng: validation.parsedLng,
			openingHours: validation.formattedOpeningHours,
			priceRange: validation.formattedPriceRange,
			description: draft.description.trim().replace(/\s+/g, " "),
			photos: [draft.photoPreview],
			legalityDocumentName: draft.legalityDocumentName.trim() || undefined,
			legalityDocumentUrl: draft.legalityDocumentUrl.trim() || undefined,
		});

		setCreatedPlace(created);
	};

	if (createdPlace) {
		return (
			<AddPlaceSuccess
				place={createdPlace}
				onAddAnother={() => {
					setCreatedPlace(null);
					setErrors({});
					setPhotoError(null);
					setGeoMessage(null);
					setHasCustomLocation(false);
					setMapsLinkInput("");
					onResetDraft();
				}}
			/>
		);
	}

	const descLen = draft.description.trim().length;
	const hasErrors = Object.keys(errors).length > 0;

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10"
		>
			<div className="lg:col-span-7 space-y-8">
				<section className="space-y-5">
					<div className="space-y-0.5">
						<h2 className="text-base font-bold text-foreground">
							Detail Tempat Kuliner
						</h2>
						<p className="text-xs text-muted-foreground">
							Semua kolom bertanda bintang (
							<span className="text-red-text">*</span>) wajib diisi agar data
							kuliner Batang lengkap dan akurat.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="sm:col-span-2 space-y-1.5">
							<Label htmlFor={nameId}>
								Nama tempat kuliner <span className="text-red-text">*</span>
							</Label>
							<Input
								id={nameId}
								type="text"
								required
								maxLength={120}
								value={draft.name}
								onChange={(e) => {
									const value = e.target.value;
									clearError("name");
									onChangeDraft((prev) => ({ ...prev, name: value }));
								}}
								aria-invalid={Boolean(errors.name)}
								placeholder="Contoh: Warung Soto Ayam Bu Karmini"
							/>
							{errors.name ? (
								<p role="alert" className="text-xs font-medium text-red-text">
									{errors.name}
								</p>
							) : null}
						</div>

						<fieldset className="sm:col-span-2 space-y-2 border-0 p-0 m-0">
							<legend className="text-sm font-medium text-foreground">
								Kategori <span className="text-red-text">*</span>
							</legend>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{PLACE_CATEGORIES.map((cat) => {
									const active = draft.category === cat;
									return (
										<button
											key={cat}
											type="button"
											aria-pressed={active}
											onClick={() => {
												clearError("category");
												onChangeDraft((prev) => ({ ...prev, category: cat }));
											}}
											className={cn(
												"min-h-[44px] rounded-[8px] border px-3 py-2 text-xs sm:text-sm font-medium transition-colors",
												active
													? "border-primary bg-primary-soft text-primary-hover font-semibold"
													: "border-border bg-background text-foreground hover:border-card-hover-border",
											)}
										>
											{cat}
										</button>
									);
								})}
							</div>
							{errors.category ? (
								<p role="alert" className="text-xs font-medium text-red-text">
									{errors.category}
								</p>
							) : null}
						</fieldset>

						<div className="space-y-1.5">
							<Label htmlFor={distId}>
								Kawasan Batang <span className="text-red-text">*</span>
							</Label>
							<Select
								value={draft.district}
								onValueChange={(val) =>
									handleDistrictChange(val as BatangDistrict)
								}
							>
								<SelectTrigger
									id={distId}
									aria-invalid={Boolean(errors.district)}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BATANG_DISTRICTS.map((d) => (
										<SelectItem key={d} value={d}>
											{d}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.district ? (
								<p role="alert" className="text-xs font-medium text-red-text">
									{errors.district}
								</p>
							) : null}
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={addrId}>
								Alamat atau patokan <span className="text-red-text">*</span>
							</Label>
							<Input
								id={addrId}
								type="text"
								required
								maxLength={250}
								value={draft.address}
								onChange={(e) => {
									const value = e.target.value;
									clearError("address");
									onChangeDraft((prev) => ({ ...prev, address: value }));
								}}
								aria-invalid={Boolean(errors.address)}
								placeholder="Contoh: Sebelah barat Pasar Limpung"
							/>
							{errors.address ? (
								<p role="alert" className="text-xs font-medium text-red-text">
									{errors.address}
								</p>
							) : null}
						</div>
					</div>
				</section>

				<section className="space-y-5">
					<div className="space-y-0.5">
						<h2 className="text-base font-bold text-foreground">
							Jam Operasional, Harga, Deskripsi &amp; Foto
						</h2>
						<p className="text-xs text-muted-foreground">
							Ketik angka jam dan nominal harga langsung (pemisah dan format
							otomatis rapi), lalu lengkapi deskripsi serta foto tempat.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<OpeningHoursField
							id={hoursId}
							required
							showPresets
							value={draft.openingHours}
							error={errors.openingHours}
							onChange={(nextValue, nextError) => {
								if (nextError) {
									setErrors((prev) => ({ ...prev, openingHours: nextError }));
								} else {
									clearError("openingHours");
								}
								if (nextValue !== draft.openingHours) {
									onChangeDraft((prev) => ({
										...prev,
										openingHours: nextValue,
									}));
								}
							}}
							onBlurError={(err) => {
								if (err) {
									setErrors((prev) => ({ ...prev, openingHours: err }));
								}
							}}
						/>

						<PriceRangeField
							id={priceId}
							required
							showPresets
							value={draft.priceRange}
							error={errors.priceRange}
							onChange={(nextValue) => {
								clearError("priceRange");
								onChangeDraft((prev) => ({ ...prev, priceRange: nextValue }));
							}}
							onBlurError={(err) => {
								if (err) {
									setErrors((prev) => ({ ...prev, priceRange: err }));
								}
							}}
						/>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-baseline justify-between gap-2">
							<Label htmlFor={descId}>
								Deskripsi singkat <span className="text-red-text">*</span>
							</Label>
							<span
								className={cn(
									"text-xs tabular-nums",
									descLen >= 15
										? "font-medium text-primary-hover"
										: "text-muted-foreground",
								)}
							>
								{descLen} / 15 karakter min
							</span>
						</div>
						<Textarea
							id={descId}
							rows={3}
							required
							maxLength={500}
							value={draft.description}
							onChange={(e) => {
								const value = e.target.value;
								clearError("description");
								onChangeDraft((prev) => ({ ...prev, description: value }));
							}}
							aria-invalid={Boolean(errors.description)}
							placeholder="Ceritakan menu andalan, porsi, atau suasana warung..."
						/>
						{errors.description ? (
							<p role="alert" className="text-xs font-medium text-red-text">
								{errors.description}
							</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor={photoId}>
							Foto tempat <span className="text-red-text">*</span>
						</Label>
						<PhotoUploadDropzone
							id={photoId}
							icon={ImagePlus}
							title="Pilih atau seret foto ke sini"
							subtitle="JPG, PNG, atau WebP maksimal 5 MB"
							required
							hasError={Boolean(errors.photo)}
							className="min-h-[76px]"
							onFilesSelected={handleFiles}
						/>
						{photoError || errors.photo ? (
							<p role="alert" className="text-xs font-medium text-red-text">
								{photoError ?? errors.photo}
							</p>
						) : null}
						{draft.photoPreview ? (
							<div className="relative inline-block">
								<img
									src={draft.photoPreview}
									alt="Pratinjau foto tempat baru"
									width={320}
									height={200}
									className="h-32 w-52 rounded-[10px] border border-border object-cover"
								/>
								<button
									type="button"
									onClick={() =>
										onChangeDraft((prev) => ({ ...prev, photoPreview: "" }))
									}
									aria-label="Hapus pratinjau foto"
									className="absolute right-1.5 top-1.5 inline-flex size-11 items-center justify-center rounded-full bg-card/95 text-foreground border border-border shadow-xs hover:bg-background"
								>
									<X className="size-4" aria-hidden="true" />
								</button>
							</div>
						) : null}
					</div>

					<LegalityDocumentField
						id={legalityId}
						label="Surat legalitas usaha"
						helperText="Unggah NIB, SKU, SIUP, atau surat keterangan usaha jika ini usaha Anda sendiri agar bisa diverifikasi admin."
						fileName={draft.legalityDocumentName}
						fileUrl={draft.legalityDocumentUrl}
						error={errors.legalityDocument}
						onChangeFile={(file) => {
							clearError("legalityDocument");
							onChangeDraft((prev) => ({
								...prev,
								legalityDocumentName: file?.fileName ?? "",
								legalityDocumentUrl: file?.fileUrl ?? "",
							}));
						}}
						onError={(err) =>
							setErrors((prev) => {
								if (!err) {
									const next = { ...prev };
									delete next.legalityDocument;
									return next;
								}
								return { ...prev, legalityDocument: err };
							})
						}
					/>

					{hasErrors ? (
						<p role="alert" className="text-xs font-medium text-red-text">
							Periksa kembali data wajib bertanda bintang (*) yang belum valid.
						</p>
					) : null}

					<div className="flex flex-wrap items-center justify-end gap-3 pt-2">
						<Button asChild variant="ghost">
							<Link to="/contribute">Batal</Link>
						</Button>
						<Button type="submit" size="lg">
							<MapPinPlus className="size-4" aria-hidden="true" />
							Kirim
						</Button>
					</div>
				</section>
			</div>

			<div className="lg:col-span-5 space-y-8">
				<AddPlaceLocationSection
					draft={draft}
					errors={errors}
					geoMessage={geoMessage}
					mapsLinkInput={mapsLinkInput}
					onGeoMessageChange={setGeoMessage}
					onMapsLinkInputChange={setMapsLinkInput}
					onChangeDraft={handleLocationDraftChange}
				/>

				<AddPlaceLivePreview draft={draft} />
			</div>
		</form>
	);
}
