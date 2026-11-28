import { Eye, ImagePlus, X } from "lucide-react";
import {
	type ChangeEvent,
	type DragEvent,
	type FormEvent,
	useId,
	useState,
} from "react";
import { Link } from "react-router";
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
import {
	AddPlaceLivePreview,
	AddPlacePreviewDialog,
} from "./add-place-preview";
import { AddPlaceSuccess } from "./add-place-success";
import {
	type AddPlaceDraft,
	type AddPlaceErrorField,
	type AddPlaceErrors,
	formatPriceRangeInput,
	handleOpeningHoursInput,
	parseOpeningHoursValue,
	parsePriceRangeValue,
	validateAddPlaceDraft,
} from "./add-place-validation";

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
	}) => { slug: string; name: string };
	onResetDraft: () => void;
}

const PRICE_PRESETS: Array<{ label: string; value: string }> = [
	{ label: "Rp 8.000 - Rp 18.000", value: "8.000 - 18.000" },
	{ label: "Rp 15.000 - Rp 30.000", value: "15.000 - 30.000" },
	{ label: "Rp 25.000 - Rp 55.000", value: "25.000 - 55.000" },
];

const HOURS_PRESETS: Array<{ label: string; value: string }> = [
	{ label: "06.00 - 15.00 WIB", value: "06.00 - 15.00" },
	{ label: "08.00 - 20.00 WIB", value: "08.00 - 20.00" },
	{ label: "16.00 - 23.00 WIB", value: "16.00 - 23.00" },
	{ label: "Buka 24 Jam", value: "Buka 24 Jam" },
];

export function AddPlaceForm({
	draft,
	onChangeDraft,
	onSubmitPlace,
	onResetDraft,
}: AddPlaceFormProps) {
	const [mapsLinkInput, setMapsLinkInput] = useState("");
	const [geoMessage, setGeoMessage] = useState<string | null>(null);
	const [photoError, setPhotoError] = useState<string | null>(null);
	const [isDragActive, setIsDragActive] = useState(false);
	const [errors, setErrors] = useState<AddPlaceErrors>({});
	const [previewOpen, setPreviewOpen] = useState(false);
	const [createdPlace, setCreatedPlace] = useState<{
		slug: string;
		name: string;
	} | null>(null);

	const nameId = useId();
	const distId = useId();
	const addrId = useId();
	const hoursId = useId();
	const priceId = useId();
	const descId = useId();
	const photoId = useId();

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
			lat: String(coords.lat),
			lng: String(coords.lng),
		}));
	};

	const handleLocationDraftChange = (
		updater: (prev: AddPlaceDraft) => AddPlaceDraft,
	) => {
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

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		void handleFiles(e.target.files);
		e.target.value = "";
	};

	const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragActive(false);
		void handleFiles(e.dataTransfer.files);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const validation = validateAddPlaceDraft(draft);
		setErrors(validation.errors);
		if (!validation.isValid) return;
		setPreviewOpen(true);
	};

	const handleConfirmSubmit = () => {
		const validation = validateAddPlaceDraft(draft);
		setErrors(validation.errors);
		if (!validation.isValid) {
			setPreviewOpen(false);
			return;
		}

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
		});

		setPreviewOpen(false);
		setCreatedPlace(created);
	};

	if (createdPlace) {
		return (
			<AddPlaceSuccess
				place={createdPlace}
				onAddAnother={() => {
					setCreatedPlace(null);
					setPreviewOpen(false);
					setErrors({});
					setPhotoError(null);
					setGeoMessage(null);
					setMapsLinkInput("");
					onResetDraft();
				}}
			/>
		);
	}

	const descLen = draft.description.trim().length;
	const hasErrors = Object.keys(errors).length > 0;
	const parsedLat = Number(draft.lat.trim());
	const parsedLng = Number(draft.lng.trim());
	const is24Hours = draft.openingHours === "Buka 24 Jam";

	return (
		<>
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
							<div className="space-y-2">
								<Label htmlFor={hoursId}>
									Jam buka <span className="text-red-text">*</span>
								</Label>
								<div className="relative">
									<Input
										id={hoursId}
										type="text"
										inputMode="numeric"
										required
										maxLength={13}
										value={draft.openingHours}
										onChange={(e) => {
											const raw = e.target.value;
											const result = handleOpeningHoursInput(
												raw,
												draft.openingHours,
											);
											if (result.error) {
												setErrors((prev) => ({
													...prev,
													openingHours: result.error,
												}));
											} else {
												clearError("openingHours");
											}
											if (result.value !== draft.openingHours) {
												onChangeDraft((prev) => ({
													...prev,
													openingHours: result.value,
												}));
											}
										}}
										onBlur={() => {
											if (!draft.openingHours.trim()) return;
											const check = parseOpeningHoursValue(draft.openingHours);
											if (check.error) {
												setErrors((prev) => ({
													...prev,
													openingHours: check.error,
												}));
											}
										}}
										aria-invalid={Boolean(errors.openingHours)}
										placeholder="08.00 - 20.00"
										className={cn("tabular-nums", !is24Hours && "pr-12")}
									/>
									{!is24Hours ? (
										<span
											aria-hidden="true"
											className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground"
										>
											WIB
										</span>
									) : null}
								</div>
								{errors.openingHours ? (
									<p role="alert" className="text-xs font-medium text-red-text">
										{errors.openingHours}
									</p>
								) : null}
								<div className="flex flex-wrap gap-1.5">
									{HOURS_PRESETS.map((preset) => {
										const active = draft.openingHours === preset.value;
										return (
											<button
												key={preset.label}
												type="button"
												onClick={() => {
													clearError("openingHours");
													onChangeDraft((prev) => ({
														...prev,
														openingHours:
															preset.value === "Buka 24 Jam" &&
															prev.openingHours === "Buka 24 Jam"
																? ""
																: preset.value,
													}));
												}}
												className={cn(
													"min-h-[44px] rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
													active
														? "border-primary bg-primary-soft text-primary-hover font-semibold"
														: "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground",
												)}
											>
												{preset.label}
											</button>
										);
									})}
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor={priceId}>
									Kisaran harga <span className="text-red-text">*</span>
								</Label>
								<div className="relative">
									<span
										aria-hidden="true"
										className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground"
									>
										Rp
									</span>
									<Input
										id={priceId}
										type="text"
										required
										maxLength={25}
										value={draft.priceRange}
										onChange={(e) => {
											const raw = e.target.value;
											clearError("priceRange");
											onChangeDraft((prev) => ({
												...prev,
												priceRange: formatPriceRangeInput(raw, prev.priceRange),
											}));
										}}
										onBlur={() => {
											if (!draft.priceRange.trim()) return;
											const check = parsePriceRangeValue(draft.priceRange);
											if (check.error) {
												setErrors((prev) => ({
													...prev,
													priceRange: check.error,
												}));
											}
										}}
										aria-invalid={Boolean(errors.priceRange)}
										placeholder="12.000 - 25.000"
										className="pl-9 tabular-nums"
									/>
								</div>
								{errors.priceRange ? (
									<p role="alert" className="text-xs font-medium text-red-text">
										{errors.priceRange}
									</p>
								) : null}
								<div className="flex flex-wrap gap-1.5">
									{PRICE_PRESETS.map((preset) => {
										const active = draft.priceRange === preset.value;
										return (
											<button
												key={preset.label}
												type="button"
												onClick={() => {
													clearError("priceRange");
													onChangeDraft((prev) => ({
														...prev,
														priceRange: preset.value,
													}));
												}}
												className={cn(
													"min-h-[44px] rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
													active
														? "border-primary bg-primary-soft text-primary-hover font-semibold"
														: "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground",
												)}
											>
												{preset.label}
											</button>
										);
									})}
								</div>
							</div>
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
							<label
								htmlFor={photoId}
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragActive(true);
								}}
								onDragLeave={() => setIsDragActive(false)}
								onDrop={handleDrop}
								className={cn(
									"flex min-h-[76px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed px-4 py-4 text-center text-sm transition-colors",
									isDragActive
										? "border-primary bg-primary-soft/60 text-foreground"
										: errors.photo
											? "border-secondary-red bg-red-soft/30 text-foreground"
											: "border-border bg-background/60 text-muted-foreground hover:border-primary hover:text-foreground",
								)}
							>
								<ImagePlus className="size-5 text-primary" aria-hidden="true" />
								<span className="font-medium text-foreground">
									Pilih atau seret foto ke sini
								</span>
								<span className="text-xs text-muted-foreground">
									JPG, PNG, atau WebP maksimal 5 MB
								</span>
							</label>
							<input
								id={photoId}
								type="file"
								accept="image/*"
								required
								onChange={handleFileChange}
								className="sr-only"
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

						{hasErrors ? (
							<p role="alert" className="text-xs font-medium text-red-text">
								Periksa kembali data wajib bertanda bintang (*) yang belum
								valid.
							</p>
						) : null}

						<div className="flex flex-wrap items-center justify-end gap-3 pt-2">
							<Button asChild variant="ghost">
								<Link to="/contribute">Batal</Link>
							</Button>
							<Button type="submit" size="lg">
								<Eye className="size-4" aria-hidden="true" />
								Pratinjau &amp; Kirim
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

			<AddPlacePreviewDialog
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				draft={draft}
				parsedLat={parsedLat}
				parsedLng={parsedLng}
				onConfirmSubmit={handleConfirmSubmit}
			/>
		</>
	);
}
