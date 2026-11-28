import { ImagePlus, MapPinPlus, X } from "lucide-react";
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
import { AddPlaceSuccess } from "./add-place-success";

export interface AddPlaceDraft {
	name: string;
	category: PlaceCategory;
	district: BatangDistrict;
	address: string;
	lat: string;
	lng: string;
	openingHours: string;
	priceRange: string;
	description: string;
	photoPreview: string;
}

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

const PRICE_PRESETS = [
	"Rp 8.000 - Rp 18.000",
	"Rp 15.000 - Rp 30.000",
	"Rp 25.000 - Rp 55.000",
];

const HOURS_PRESETS = [
	"06.00 - 15.00 WIB",
	"08.00 - 20.00 WIB",
	"16.00 - 23.00 WIB",
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
	const [errors, setErrors] = useState<Record<string, string>>({});
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

	const handleDistrictChange = (nextDistrict: BatangDistrict) => {
		const coords = DISTRICT_COORDINATES[nextDistrict];
		onChangeDraft((prev) => ({
			...prev,
			district: nextDistrict,
			lat: String(coords.lat),
			lng: String(coords.lng),
		}));
	};

	const handleFiles = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0) return;
		const { urls, error } = await readImageFiles([files[0]]);
		if (error) {
			setPhotoError(error);
			return;
		}
		setPhotoError(null);
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
		const nextErrors: Record<string, string> = {};

		if (draft.name.trim().length < 3) {
			nextErrors.name = "Nama tempat kuliner minimal 3 karakter.";
		}
		if (draft.address.trim().length < 6) {
			nextErrors.address = "Alamat atau patokan lokasi minimal 6 karakter.";
		}
		const parsedLat = Number(draft.lat);
		const parsedLng = Number(draft.lng);
		if (Number.isNaN(parsedLat) || parsedLat < -7.5 || parsedLat > -6.5) {
			nextErrors.lat =
				"Latitude harus berada di wilayah Batang (-7.5 s.d. -6.5).";
		}
		if (Number.isNaN(parsedLng) || parsedLng < 109.4 || parsedLng > 110.3) {
			nextErrors.lng =
				"Longitude harus berada di wilayah Batang (109.4 s.d. 110.3).";
		}
		if (draft.description.trim().length < 15) {
			nextErrors.description = "Deskripsi singkat minimal 15 karakter.";
		}

		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		const created = onSubmitPlace({
			name: draft.name.trim(),
			category: draft.category,
			district: draft.district,
			address: draft.address.trim(),
			lat: parsedLat,
			lng: parsedLng,
			openingHours: draft.openingHours.trim() || "Jam buka belum dikonfirmasi",
			priceRange: draft.priceRange.trim() || "Harga belum dicantumkan",
			description: draft.description.trim(),
			photos: draft.photoPreview ? [draft.photoPreview] : [],
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
					setGeoMessage(null);
					setMapsLinkInput("");
					onResetDraft();
				}}
			/>
		);
	}

	const descLen = draft.description.trim().length;

	return (
		<form onSubmit={handleSubmit} noValidate className="space-y-5">
			{/* Section 1: Identity & Location Details */}
			<section className="rounded-[12px] border border-border bg-card p-5 sm:p-6 space-y-5">
				<div className="flex items-start gap-3">
					<span
						aria-hidden="true"
						className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-hover tabular-nums"
					>
						1
					</span>
					<div className="space-y-0.5">
						<h2 className="text-base font-semibold text-foreground">
							Detail Tempat Kuliner
						</h2>
						<p className="text-xs text-muted-foreground">
							Isi nama warung atau kedai, kategori hidangan, kawasan, dan
							patokan alamat yang mudah dikenali.
						</p>
					</div>
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
							value={draft.name}
							onChange={(e) => {
								const value = e.target.value;
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
										onClick={() =>
											onChangeDraft((prev) => ({ ...prev, category: cat }))
										}
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
							<SelectTrigger id={distId}>
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
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={addrId}>
							Alamat atau patokan <span className="text-red-text">*</span>
						</Label>
						<Input
							id={addrId}
							type="text"
							required
							value={draft.address}
							onChange={(e) => {
								const value = e.target.value;
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

			<AddPlaceLocationSection
				draft={draft}
				errors={errors}
				geoMessage={geoMessage}
				mapsLinkInput={mapsLinkInput}
				onGeoMessageChange={setGeoMessage}
				onMapsLinkInputChange={setMapsLinkInput}
				onChangeDraft={onChangeDraft}
			/>

			{/* Section 3: Hours, Price, Description & Photo */}
			<section className="rounded-[12px] border border-border bg-card p-5 sm:p-6 space-y-5">
				<div className="flex items-start gap-3">
					<span
						aria-hidden="true"
						className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-hover tabular-nums"
					>
						3
					</span>
					<div className="space-y-0.5">
						<h2 className="text-base font-semibold text-foreground">
							Jam Operasional, Deskripsi &amp; Foto
						</h2>
						<p className="text-xs text-muted-foreground">
							Lengkapi detail tambahan agar pengunjung langsung mendapat
							gambaran menu dan harganya.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor={hoursId}>Jam buka (opsional)</Label>
						<Input
							id={hoursId}
							type="text"
							value={draft.openingHours}
							onChange={(e) => {
								const value = e.target.value;
								onChangeDraft((prev) => ({ ...prev, openingHours: value }));
							}}
							placeholder="07.00 - 17.00 WIB"
						/>
						<div className="flex flex-wrap gap-1.5">
							{HOURS_PRESETS.map((preset) => (
								<button
									key={preset}
									type="button"
									onClick={() =>
										onChangeDraft((prev) => ({ ...prev, openingHours: preset }))
									}
									className="min-h-[44px] rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
								>
									{preset}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor={priceId}>Kisaran harga (opsional)</Label>
						<Input
							id={priceId}
							type="text"
							value={draft.priceRange}
							onChange={(e) => {
								const value = e.target.value;
								onChangeDraft((prev) => ({ ...prev, priceRange: value }));
							}}
							placeholder="Rp 12.000 - Rp 25.000"
						/>
						<div className="flex flex-wrap gap-1.5">
							{PRICE_PRESETS.map((preset) => (
								<button
									key={preset}
									type="button"
									onClick={() =>
										onChangeDraft((prev) => ({ ...prev, priceRange: preset }))
									}
									className="min-h-[44px] rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
								>
									{preset}
								</button>
							))}
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
						value={draft.description}
						onChange={(e) => {
							const value = e.target.value;
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
					<Label htmlFor={photoId}>Foto tempat (opsional)</Label>
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
						onChange={handleFileChange}
						className="sr-only"
					/>
					{photoError ? (
						<p role="alert" className="text-xs font-medium text-red-text">
							{photoError}
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

				<div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
					<Button asChild variant="ghost">
						<Link to="/contribute">Batal</Link>
					</Button>
					<Button type="submit" size="lg">
						<MapPinPlus className="size-4" aria-hidden="true" />
						Kirim Tempat Kuliner
					</Button>
				</div>
			</section>
		</form>
	);
}
