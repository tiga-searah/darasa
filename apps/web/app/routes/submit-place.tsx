import {
	Camera,
	CheckCircle2,
	ImagePlus,
	LocateFixed,
	LogIn,
	MapPinPlus,
	MessageSquarePlus,
	PencilLine,
	PlusCircle,
	Star,
	X,
} from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	useId,
	useMemo,
	useState,
} from "react";
import { Link } from "react-router";
import { GoogleMapPicker } from "~/components/google-map-picker";
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
import { useDarasa } from "~/context/darasa-store";
import {
	BATANG_DISTRICTS,
	DISTRICT_COORDINATES,
	PLACE_CATEGORIES,
} from "~/data/batang-places";
import type { BatangDistrict, PlaceCategory } from "~/lib/types";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/submit-place";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Contribute | Darasa" },
		{
			name: "description",
			content:
				"Tambahkan tempat kuliner baru, perbarui info, unggah foto, dan tulis ulasan untuk kuliner Kabupaten Batang.",
		},
	];
}

type ContributeTab = "add_place" | "update_info" | "add_photo" | "write_review";

export default function SubmitPlacePage() {
	const {
		currentUser,
		places,
		contributions,
		switchDemoAccount,
		submitPlace,
		submitReview,
		addPlacePhoto,
		suggestPlaceUpdate,
	} = useDarasa();

	const [activeTab, setActiveTab] = useState<ContributeTab>("add_place");

	// Tab 1: Add Place state
	const [name, setName] = useState("");
	const [category, setCategory] = useState<PlaceCategory>("Makanan berat");
	const [district, setDistrict] = useState<BatangDistrict>("Batang Kota");
	const [address, setAddress] = useState("");
	const [lat, setLat] = useState(
		String(DISTRICT_COORDINATES["Batang Kota"].lat),
	);
	const [lng, setLng] = useState(
		String(DISTRICT_COORDINATES["Batang Kota"].lng),
	);
	const [openingHours, setOpeningHours] = useState("08.00 - 20.00 WIB");
	const [priceRange, setPriceRange] = useState("Rp 12.000 - Rp 25.000");
	const [description, setDescription] = useState("");
	const [photoPreview, setPhotoPreview] = useState("");
	const [mapsLinkInput, setMapsLinkInput] = useState("");
	const [geoMessage, setGeoMessage] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [createdSlug, setCreatedSlug] = useState<string | null>(null);

	// Tab 2: Update Info state
	const [editPlaceId, setEditPlaceId] = useState(places[0]?.id ?? "");
	const selectedEditPlace =
		places.find((p) => p.id === editPlaceId) ?? places[0];
	const [editAddress, setEditAddress] = useState(
		selectedEditPlace?.address ?? "",
	);
	const [editHours, setEditHours] = useState(
		selectedEditPlace?.openingHours ?? "",
	);
	const [editPrice, setEditPrice] = useState(
		selectedEditPlace?.priceRange ?? "",
	);
	const [editPhone, setEditPhone] = useState(selectedEditPlace?.phone ?? "");
	const [editNote, setEditNote] = useState("");
	const [editSaved, setEditSaved] = useState<string | null>(null);

	// Tab 3: Add Photo state
	const [photoPlaceId, setPhotoPlaceId] = useState(places[0]?.id ?? "");
	const [extraPhotoPreview, setExtraPhotoPreview] = useState("");
	const [photoError, setPhotoError] = useState<string | null>(null);
	const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);

	// Tab 4: Write Review state
	const [reviewPlaceId, setReviewPlaceId] = useState(places[0]?.id ?? "");
	const [reviewRating, setReviewRating] = useState(5);
	const [reviewHoverRating, setReviewHoverRating] = useState<number | null>(
		null,
	);
	const [reviewComment, setReviewComment] = useState("");
	const [reviewPhotoPreview, setReviewPhotoPreview] = useState("");
	const [reviewError, setReviewError] = useState<string | null>(null);
	const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

	// IDs
	const nameId = useId();
	const catId = useId();
	const distId = useId();
	const addrId = useId();
	const mapsUrlId = useId();
	const latId = useId();
	const lngId = useId();
	const hoursId = useId();
	const priceId = useId();
	const descId = useId();
	const photoId = useId();
	const editSelectId = useId();
	const editAddrId = useId();
	const editHoursId = useId();
	const editPriceId = useId();
	const editPhoneId = useId();
	const editNoteId = useId();
	const photoSelectId = useId();
	const extraPhotoId = useId();
	const reviewSelectId = useId();
	const reviewCommentId = useId();
	const reviewPhotoId = useId();

	const isVisitor = currentUser.role === "visitor";

	const userSubmittedPlaces = useMemo(
		() => places.filter((p) => p.submittedByUserId === currentUser.id),
		[places, currentUser.id],
	);

	const userReviews = useMemo(
		() =>
			places.flatMap((place) =>
				place.reviews
					.filter((r) => r.userId === currentUser.id)
					.map((review) => ({ place, review })),
			),
		[places, currentUser.id],
	);

	const userExtraContribs = useMemo(
		() => contributions.filter((c) => c.userId === currentUser.id),
		[contributions, currentUser.id],
	);

	const totalContributions =
		userSubmittedPlaces.length + userReviews.length + userExtraContribs.length;

	const selectedPhotoPlace =
		places.find((p) => p.id === photoPlaceId) ?? places[0];

	const suggestedForReview = useMemo(
		() =>
			places
				.filter((p) => !p.reviews.some((r) => r.userId === currentUser.id))
				.slice(0, 3),
		[places, currentUser.id],
	);

	const readImageFile = (
		e: ChangeEvent<HTMLInputElement>,
		onLoaded: (dataUrl: string) => void,
	) => {
		const file = e.target.files?.[0];
		if (!file) {
			onLoaded("");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") onLoaded(reader.result);
		};
		reader.readAsDataURL(file);
	};

	const parseGoogleMapsInput = (raw: string) => {
		setMapsLinkInput(raw);
		const trimmed = raw.trim();
		if (!trimmed) return;

		const patterns = [
			/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
			/[?&](?:q|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
			/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
			/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/,
		];

		for (const regex of patterns) {
			const match = trimmed.match(regex);
			if (match) {
				setLat(Number(match[1]).toFixed(4));
				setLng(Number(match[2]).toFixed(4));
				setGeoMessage("Koordinat diambil dari tautan Google Maps.");
				return;
			}
		}
	};

	const handleDistrictChange = (nextDistrict: BatangDistrict) => {
		setDistrict(nextDistrict);
		const coords = DISTRICT_COORDINATES[nextDistrict];
		setLat(String(coords.lat));
		setLng(String(coords.lng));
	};

	const handleUseCurrentLocation = () => {
		if (!("geolocation" in navigator)) {
			setGeoMessage("Browser tidak mendukung Geolocation.");
			return;
		}
		setGeoMessage("Mengambil lokasi perangkat...");
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setLat(pos.coords.latitude.toFixed(4));
				setLng(pos.coords.longitude.toFixed(4));
				setGeoMessage("Koordinat GPS berhasil diisi.");
			},
			() => {
				setGeoMessage(
					"Izin lokasi tidak tersedia. Menggunakan titik referensi kawasan.",
				);
			},
		);
	};

	const handleAddPlaceSubmit = (e: FormEvent) => {
		e.preventDefault();
		const nextErrors: Record<string, string> = {};

		if (name.trim().length < 3) {
			nextErrors.name = "Nama tempat kuliner minimal 3 karakter.";
		}
		if (address.trim().length < 6) {
			nextErrors.address = "Alamat atau patokan lokasi minimal 6 karakter.";
		}
		const parsedLat = Number(lat);
		const parsedLng = Number(lng);
		if (Number.isNaN(parsedLat) || parsedLat < -7.5 || parsedLat > -6.5) {
			nextErrors.lat =
				"Latitude harus di sekitar wilayah Batang (-7.5 s.d. -6.5).";
		}
		if (Number.isNaN(parsedLng) || parsedLng < 109.4 || parsedLng > 110.3) {
			nextErrors.lng =
				"Longitude harus di sekitar wilayah Batang (109.4 s.d. 110.3).";
		}
		if (description.trim().length < 15) {
			nextErrors.description = "Deskripsi singkat minimal 15 karakter.";
		}

		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		const created = submitPlace({
			name: name.trim(),
			category,
			district,
			address: address.trim(),
			lat: parsedLat,
			lng: parsedLng,
			openingHours: openingHours.trim() || "Jam buka belum dikonfirmasi",
			priceRange: priceRange.trim() || "Harga belum dicantumkan",
			description: description.trim(),
			photos: photoPreview ? [photoPreview] : [],
		});

		setCreatedSlug(created.slug);
	};

	const handleSelectEditPlace = (id: string) => {
		setEditPlaceId(id);
		const target = places.find((p) => p.id === id);
		if (target) {
			setEditAddress(target.address);
			setEditHours(target.openingHours);
			setEditPrice(target.priceRange);
			setEditPhone(target.phone ?? "");
			setEditSaved(null);
		}
	};

	const handleUpdateInfoSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!editPlaceId) return;
		suggestPlaceUpdate(
			editPlaceId,
			{
				address: editAddress.trim() || selectedEditPlace?.address,
				openingHours: editHours.trim() || selectedEditPlace?.openingHours,
				priceRange: editPrice.trim() || selectedEditPlace?.priceRange,
				phone: editPhone.trim() || undefined,
			},
			editNote,
		);
		setEditNote("");
		setEditSaved("Pembaruan informasi tempat telah disimpan.");
	};

	const handleAddPhotoSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!extraPhotoPreview) {
			setPhotoError("Pilih foto dari perangkat terlebih dahulu.");
			return;
		}
		addPlacePhoto(photoPlaceId, extraPhotoPreview);
		setExtraPhotoPreview("");
		setPhotoError(null);
		setPhotoSuccess("Foto berhasil ditambahkan ke galeri tempat.");
	};

	const handleReviewSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (reviewComment.trim().length < 10) {
			setReviewError("Tulis ulasan minimal 10 karakter.");
			return;
		}
		submitReview({
			placeId: reviewPlaceId,
			rating: reviewRating,
			comment: reviewComment,
			photoUrl: reviewPhotoPreview || undefined,
		});
		setReviewError(null);
		setReviewComment("");
		setReviewPhotoPreview("");
		setReviewRating(5);
		setReviewSuccess("Ulasan Anda berhasil diterbitkan.");
	};

	const tabs: Array<{
		id: ContributeTab;
		label: string;
		icon: typeof MapPinPlus;
	}> = [
		{ id: "add_place", label: "Tambah Tempat", icon: MapPinPlus },
		{ id: "update_info", label: "Perbarui Info", icon: PencilLine },
		{ id: "add_photo", label: "Tambah Foto", icon: Camera },
		{ id: "write_review", label: "Tulis Ulasan", icon: MessageSquarePlus },
	];

	return (
		<div className="space-y-6">
			{/* Simple Header + Segmented Tabs */}
			<header className="space-y-3 border-b border-border pb-4">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<div className="space-y-1">
						<h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground leading-tight">
							Contribute
						</h1>
						<p className="text-sm text-muted-foreground">
							Tambahkan tempat kuliner baru, perbarui info, unggah foto, atau
							tulis ulasan.
						</p>
					</div>
					{!isVisitor && totalContributions > 0 ? (
						<span className="text-xs font-medium text-muted-foreground tabular-nums">
							{totalContributions} kontribusi · {currentUser.name}
						</span>
					) : null}
				</div>

				<div
					role="tablist"
					aria-label="Jenis kontribusi"
					className="inline-flex w-full flex-wrap gap-1.5 rounded-[12px] border border-border bg-background p-1 sm:w-auto"
				>
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const active = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={active}
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									"inline-flex flex-1 sm:flex-initial min-h-[40px] items-center justify-center gap-2 rounded-[8px] px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors",
									active
										? "bg-primary text-primary-foreground shadow-xs"
										: "text-muted-foreground hover:bg-card hover:text-foreground",
								)}
							>
								<Icon className="size-4 shrink-0" aria-hidden="true" />
								<span className="whitespace-nowrap">{tab.label}</span>
							</button>
						);
					})}
				</div>
			</header>

			{isVisitor ? (
				<div className="rounded-[12px] border border-border bg-background p-6 text-center space-y-4">
					<div className="space-y-1.5">
						<h2 className="text-base font-semibold text-foreground">
							Masuk untuk berkontribusi
						</h2>
						<p className="mx-auto max-w-md text-sm text-muted-foreground">
							Penambahan tempat, edit info, foto, dan ulasan terhubung ke akun
							kontributor Anda.
						</p>
					</div>
					<div className="flex flex-wrap justify-center gap-2.5">
						<Button
							type="button"
							onClick={() => switchDemoAccount("usr-warga")}
						>
							<PlusCircle className="size-4" aria-hidden="true" />
							Coba sebagai Warga
						</Button>
						<Button asChild variant="outline">
							<Link to="/login?redirect=/submit-place">
								<LogIn className="size-4" aria-hidden="true" />
								Masuk Akun
							</Link>
						</Button>
						<Button asChild variant="ghost">
							<Link to="/register">Daftar</Link>
						</Button>
					</div>
				</div>
			) : (
				<>
					{/* TAB 1: ADD PLACE */}
					{activeTab === "add_place" ? (
						createdSlug ? (
							<div className="rounded-[12px] border border-border bg-background p-6 space-y-4">
								<div className="flex items-center gap-2.5 text-primary">
									<CheckCircle2
										className="size-6 shrink-0"
										aria-hidden="true"
									/>
									<h2 className="text-lg font-bold text-foreground">
										Tempat kuliner berhasil dikirim
									</h2>
								</div>
								<p className="text-sm text-muted-foreground">
									Data tempat baru sudah masuk ke direktori dan antrean validasi
									komunitas Darasa.
								</p>
								<div className="flex flex-wrap gap-2.5">
									<Button asChild>
										<Link to={`/places/${createdSlug}`}>
											Lihat Halaman Tempat
										</Link>
									</Button>
									<Button
										variant="outline"
										onClick={() => {
											setCreatedSlug(null);
											setName("");
											setAddress("");
											setDescription("");
											setPhotoPreview("");
										}}
									>
										Tambah Tempat Lainnya
									</Button>
								</div>
							</div>
						) : (
							<form
								onSubmit={handleAddPlaceSubmit}
								noValidate
								className="max-w-4xl space-y-5"
							>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div className="sm:col-span-2 space-y-1.5">
										<Label htmlFor={nameId}>
											Nama tempat kuliner{" "}
											<span className="text-red-text">*</span>
										</Label>
										<Input
											id={nameId}
											type="text"
											required
											value={name}
											onChange={(e) => setName(e.target.value)}
											aria-invalid={Boolean(errors.name)}
											placeholder="Contoh: Warung Soto Ayam Bu Karmini"
										/>
										{errors.name ? (
											<p
												role="alert"
												className="text-xs font-medium text-red-text"
											>
												{errors.name}
											</p>
										) : null}
									</div>

									<div className="space-y-1.5">
										<Label htmlFor={catId}>
											Kategori <span className="text-red-text">*</span>
										</Label>
										<Select
											value={category}
											onValueChange={(val) => setCategory(val as PlaceCategory)}
										>
											<SelectTrigger id={catId}>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{PLACE_CATEGORIES.map((c) => (
													<SelectItem key={c} value={c}>
														{c}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-1.5">
										<Label htmlFor={distId}>
											Kawasan <span className="text-red-text">*</span>
										</Label>
										<Select
											value={district}
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

									<div className="sm:col-span-2 space-y-1.5">
										<Label htmlFor={addrId}>
											Alamat atau patokan{" "}
											<span className="text-red-text">*</span>
										</Label>
										<Input
											id={addrId}
											type="text"
											required
											value={address}
											onChange={(e) => setAddress(e.target.value)}
											aria-invalid={Boolean(errors.address)}
											placeholder="Contoh: Sebelah barat Pasar Limpung atau depan gerbang KITB"
										/>
										{errors.address ? (
											<p
												role="alert"
												className="text-xs font-medium text-red-text"
											>
												{errors.address}
											</p>
										) : null}
									</div>
								</div>

								<div className="space-y-3 border-t border-border pt-5">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span className="text-sm font-semibold text-foreground">
											Titik Lokasi Peta
										</span>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={handleUseCurrentLocation}
										>
											<LocateFixed className="size-4" aria-hidden="true" />
											Lokasi Saya
										</Button>
									</div>

									<GoogleMapPicker
										lat={Number(lat) || DISTRICT_COORDINATES["Batang Kota"].lat}
										lng={Number(lng) || DISTRICT_COORDINATES["Batang Kota"].lng}
										onPickLocation={(nextLat, nextLng, note) => {
											setLat(String(nextLat));
											setLng(String(nextLng));
											if (note) setGeoMessage(note);
										}}
									/>

									<div className="space-y-1.5">
										<Label
											htmlFor={mapsUrlId}
											className="text-xs text-muted-foreground"
										>
											Tautan Google Maps / koordinat (opsional)
										</Label>
										<Input
											id={mapsUrlId}
											type="text"
											value={mapsLinkInput}
											onChange={(e) => parseGoogleMapsInput(e.target.value)}
											placeholder="Tempel tautan Google Maps atau koordinat (-6.9078, 109.7302)"
										/>
									</div>

									{geoMessage ? (
										<p
											role="status"
											className="text-xs font-medium text-primary-hover"
										>
											{geoMessage}
										</p>
									) : null}

									<details
										open={Boolean(errors.lat || errors.lng)}
										className="text-xs"
									>
										<summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
											Koordinat manual ({lat}, {lng})
										</summary>
										<div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
											<div className="space-y-1">
												<Label
													htmlFor={latId}
													className="text-xs text-muted-foreground"
												>
													Latitude
												</Label>
												<Input
													id={latId}
													type="text"
													inputMode="decimal"
													value={lat}
													onChange={(e) => setLat(e.target.value)}
													aria-invalid={Boolean(errors.lat)}
													className="tabular-nums"
												/>
												{errors.lat ? (
													<p role="alert" className="text-xs text-red-text">
														{errors.lat}
													</p>
												) : null}
											</div>

											<div className="space-y-1">
												<Label
													htmlFor={lngId}
													className="text-xs text-muted-foreground"
												>
													Longitude
												</Label>
												<Input
													id={lngId}
													type="text"
													inputMode="decimal"
													value={lng}
													onChange={(e) => setLng(e.target.value)}
													aria-invalid={Boolean(errors.lng)}
													className="tabular-nums"
												/>
												{errors.lng ? (
													<p role="alert" className="text-xs text-red-text">
														{errors.lng}
													</p>
												) : null}
											</div>
										</div>
									</details>
								</div>

								<div className="grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
									<div className="space-y-1.5">
										<Label htmlFor={hoursId}>Jam buka (opsional)</Label>
										<Input
											id={hoursId}
											type="text"
											value={openingHours}
											onChange={(e) => setOpeningHours(e.target.value)}
											placeholder="07.00 - 17.00 WIB"
										/>
									</div>

									<div className="space-y-1.5">
										<Label htmlFor={priceId}>Kisaran harga (opsional)</Label>
										<Input
											id={priceId}
											type="text"
											value={priceRange}
											onChange={(e) => setPriceRange(e.target.value)}
											placeholder="Rp 12.000 - Rp 25.000"
										/>
									</div>

									<div className="sm:col-span-2 space-y-1.5">
										<Label htmlFor={descId}>
											Deskripsi singkat <span className="text-red-text">*</span>
										</Label>
										<Textarea
											id={descId}
											rows={3}
											required
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											aria-invalid={Boolean(errors.description)}
											placeholder="Ceritakan menu andalan, porsi, atau suasana warung..."
										/>
										{errors.description ? (
											<p
												role="alert"
												className="text-xs font-medium text-red-text"
											>
												{errors.description}
											</p>
										) : null}
									</div>

									<div className="sm:col-span-2 space-y-2">
										<Label htmlFor={photoId}>Foto tempat (opsional)</Label>
										<label
											htmlFor={photoId}
											className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[8px] border border-dashed border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary"
										>
											<ImagePlus
												className="size-4 text-primary"
												aria-hidden="true"
											/>
											<span>Pilih foto (JPG, PNG, WebP)</span>
										</label>
										<input
											id={photoId}
											type="file"
											accept="image/*"
											onChange={(e) => readImageFile(e, setPhotoPreview)}
											className="sr-only"
										/>
										{photoPreview ? (
											<div className="relative inline-block">
												<img
													src={photoPreview}
													alt="Pratinjau foto tempat baru"
													width={320}
													height={200}
													className="h-32 w-52 rounded-[10px] border border-border object-cover"
												/>
												<button
													type="button"
													onClick={() => setPhotoPreview("")}
													aria-label="Hapus pratinjau foto"
													className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-xs hover:bg-background"
												>
													<X className="size-3.5" aria-hidden="true" />
												</button>
											</div>
										) : null}
									</div>
								</div>

								<div className="flex items-center justify-end gap-3 border-t border-border pt-5">
									<Button asChild variant="ghost">
										<Link to="/explore">Batal</Link>
									</Button>
									<Button type="submit">
										<PlusCircle className="size-4" aria-hidden="true" />
										Kirim Tempat
									</Button>
								</div>
							</form>
						)
					) : null}

					{/* TAB 2: UPDATE PLACE INFO */}
					{activeTab === "update_info" ? (
						<form
							onSubmit={handleUpdateInfoSubmit}
							className="max-w-4xl space-y-5"
						>
							{editSaved ? (
								<div
									role="status"
									className="rounded-[8px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-hover"
								>
									{editSaved}
								</div>
							) : null}

							<div className="space-y-1.5">
								<Label htmlFor={editSelectId}>Pilih Tempat Kuliner</Label>
								<Select
									value={editPlaceId}
									onValueChange={handleSelectEditPlace}
								>
									<SelectTrigger id={editSelectId}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{places.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name} · {p.district}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="sm:col-span-2 space-y-1.5">
									<Label htmlFor={editAddrId}>Alamat / Patokan</Label>
									<Input
										id={editAddrId}
										value={editAddress}
										onChange={(e) => setEditAddress(e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor={editHoursId}>Jam Buka</Label>
									<Input
										id={editHoursId}
										value={editHours}
										onChange={(e) => setEditHours(e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor={editPriceId}>Kisaran Harga</Label>
									<Input
										id={editPriceId}
										value={editPrice}
										onChange={(e) => setEditPrice(e.target.value)}
									/>
								</div>
								<div className="sm:col-span-2 space-y-1.5">
									<Label htmlFor={editPhoneId}>
										Nomor Kontak / WhatsApp (opsional)
									</Label>
									<Input
										id={editPhoneId}
										value={editPhone}
										onChange={(e) => setEditPhone(e.target.value)}
										placeholder="0812-xxxx-xxxx"
									/>
								</div>
								<div className="sm:col-span-2 space-y-1.5">
									<Label htmlFor={editNoteId}>
										Catatan Perubahan (opsional)
									</Label>
									<Textarea
										id={editNoteId}
										rows={2}
										value={editNote}
										onChange={(e) => setEditNote(e.target.value)}
										placeholder="Contoh: Sekarang buka sampai pukul 22.00 WIB di akhir pekan."
									/>
								</div>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
								<Link
									to={
										selectedEditPlace
											? `/claim?placeId=${selectedEditPlace.id}`
											: "/claim"
									}
									className="text-xs font-medium text-primary hover:underline"
								>
									Pemilik usaha ini? Ajukan klaim &rarr;
								</Link>
								<Button type="submit">
									<PencilLine className="size-4" aria-hidden="true" />
									Simpan Pembaruan
								</Button>
							</div>
						</form>
					) : null}

					{/* TAB 3: ADD PHOTO */}
					{activeTab === "add_photo" ? (
						<form
							onSubmit={handleAddPhotoSubmit}
							className="max-w-4xl space-y-5"
						>
							{photoSuccess ? (
								<div
									role="status"
									className="rounded-[8px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-hover"
								>
									{photoSuccess}
								</div>
							) : null}

							{photoError ? (
								<div
									role="alert"
									className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-4 py-3 text-sm font-medium text-red-text"
								>
									{photoError}
								</div>
							) : null}

							<div className="space-y-1.5">
								<Label htmlFor={photoSelectId}>Pilih Tempat Kuliner</Label>
								<Select value={photoPlaceId} onValueChange={setPhotoPlaceId}>
									<SelectTrigger id={photoSelectId}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{places.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name} · {p.district}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{selectedPhotoPlace && selectedPhotoPlace.photos.length > 0 ? (
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-muted-foreground">
										Foto saat ini ({selectedPhotoPlace.photos.length})
									</p>
									<div className="flex gap-2 overflow-x-auto pb-1">
										{selectedPhotoPlace.photos.map((src, idx) => (
											<img
												key={src}
												src={src}
												alt={`Foto ${idx + 1} ${selectedPhotoPlace.name}`}
												className="h-16 w-24 shrink-0 rounded-[8px] border border-border object-cover"
											/>
										))}
									</div>
								</div>
							) : null}

							<div className="space-y-2">
								<Label htmlFor={extraPhotoId}>Unggah Foto Baru</Label>
								<label
									htmlFor={extraPhotoId}
									className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary"
								>
									<Camera className="size-4 text-primary" aria-hidden="true" />
									<span>Pilih foto dari galeri / kamera</span>
								</label>
								<input
									id={extraPhotoId}
									type="file"
									accept="image/*"
									onChange={(e) => {
										setPhotoError(null);
										readImageFile(e, setExtraPhotoPreview);
									}}
									className="sr-only"
								/>
							</div>

							{extraPhotoPreview ? (
								<div className="relative inline-block">
									<img
										src={extraPhotoPreview}
										alt="Pratinjau foto unggahan"
										width={360}
										height={220}
										className="h-40 w-64 rounded-[10px] border border-border object-cover"
									/>
									<button
										type="button"
										onClick={() => setExtraPhotoPreview("")}
										aria-label="Hapus pratinjau foto"
										className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-xs hover:bg-background"
									>
										<X className="size-3.5" aria-hidden="true" />
									</button>
								</div>
							) : null}

							<div className="flex justify-end border-t border-border pt-5">
								<Button type="submit">
									<ImagePlus className="size-4" aria-hidden="true" />
									Tambahkan Foto
								</Button>
							</div>
						</form>
					) : null}

					{/* TAB 4: WRITE REVIEW */}
					{activeTab === "write_review" ? (
						<form onSubmit={handleReviewSubmit} className="max-w-4xl space-y-5">
							{reviewSuccess ? (
								<div
									role="status"
									className="rounded-[8px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-hover"
								>
									{reviewSuccess}
								</div>
							) : null}

							{reviewError ? (
								<div
									role="alert"
									className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-4 py-3 text-sm font-medium text-red-text"
								>
									{reviewError}
								</div>
							) : null}

							<div className="space-y-2">
								<Label htmlFor={reviewSelectId}>Pilih Tempat Kuliner</Label>
								<Select value={reviewPlaceId} onValueChange={setReviewPlaceId}>
									<SelectTrigger id={reviewSelectId}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{places.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name} · {p.district}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{suggestedForReview.length > 0 ? (
									<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
										<span className="text-xs text-muted-foreground">
											Saran:
										</span>
										{suggestedForReview.map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => setReviewPlaceId(p.id)}
												className={cn(
													"rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
													reviewPlaceId === p.id
														? "border-primary bg-primary-soft text-primary-hover"
														: "border-border bg-background text-muted-foreground hover:text-foreground",
												)}
											>
												{p.name}
											</button>
										))}
									</div>
								) : null}
							</div>

							<fieldset
								className="space-y-1.5 border-0 p-0"
								onMouseLeave={() => setReviewHoverRating(null)}
							>
								<legend className="text-sm font-medium text-foreground">
									Rating
								</legend>
								<div className="flex items-center gap-1">
									{[1, 2, 3, 4, 5].map((star) => {
										const activeLimit = reviewHoverRating ?? reviewRating;
										const isFilled = star <= activeLimit;
										return (
											<button
												key={star}
												type="button"
												onMouseEnter={() => setReviewHoverRating(star)}
												onClick={() => setReviewRating(star)}
												aria-label={`Beri ${star} bintang`}
												aria-pressed={reviewRating === star}
												className="inline-flex size-10 items-center justify-center rounded-[8px] transition-transform duration-150 hover:scale-110 active:scale-95"
											>
												<Star
													className={cn(
														"size-7 transition-colors duration-150",
														isFilled
															? "fill-accent-yellow text-accent-yellow"
															: "text-border hover:text-accent-yellow/70",
													)}
													aria-hidden="true"
												/>
											</button>
										);
									})}
									<span className="ml-2 text-xs font-medium text-muted-foreground tabular-nums">
										{reviewRating} / 5
									</span>
								</div>
							</fieldset>

							<div className="space-y-1.5">
								<Label htmlFor={reviewCommentId}>Ulasan</Label>
								<Textarea
									id={reviewCommentId}
									rows={4}
									value={reviewComment}
									onChange={(e) => setReviewComment(e.target.value)}
									placeholder="Ceritakan rasa makanan, porsi, harga, atau suasana tempat..."
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor={reviewPhotoId}>Foto pendukung (opsional)</Label>
								<label
									htmlFor={reviewPhotoId}
									className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-border bg-background px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary"
								>
									<ImagePlus
										className="size-4 text-primary"
										aria-hidden="true"
									/>
									<span>Lampirkan foto menu atau tempat</span>
								</label>
								<input
									id={reviewPhotoId}
									type="file"
									accept="image/*"
									onChange={(e) => readImageFile(e, setReviewPhotoPreview)}
									className="sr-only"
								/>
								{reviewPhotoPreview ? (
									<div className="relative inline-block">
										<img
											src={reviewPhotoPreview}
											alt="Pratinjau foto ulasan"
											width={280}
											height={180}
											className="h-28 w-44 rounded-[8px] border border-border object-cover"
										/>
										<button
											type="button"
											onClick={() => setReviewPhotoPreview("")}
											aria-label="Hapus pratinjau foto"
											className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-xs hover:bg-background"
										>
											<X className="size-3.5" aria-hidden="true" />
										</button>
									</div>
								) : null}
							</div>

							<div className="flex justify-end border-t border-border pt-5">
								<Button type="submit">
									<MessageSquarePlus className="size-4" aria-hidden="true" />
									Kirim Ulasan
								</Button>
							</div>
						</form>
					) : null}
				</>
			)}

			{/* Minimal Activity Feed (only shown when user has contributions) */}
			{totalContributions > 0 ? (
				<section
					aria-labelledby="your-contributions-heading"
					className="max-w-4xl border-t border-border pt-5 space-y-3"
				>
					<h2
						id="your-contributions-heading"
						className="text-sm font-semibold text-foreground"
					>
						Riwayat Kontribusi ({totalContributions})
					</h2>

					<div className="divide-y divide-border border-t border-border">
						{userSubmittedPlaces.map((p) => (
							<Link
								key={`place-${p.id}`}
								to={`/places/${p.slug}`}
								className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-primary"
							>
								<MapPinPlus
									className="size-4 shrink-0 text-primary"
									aria-hidden="true"
								/>
								<span className="min-w-0 flex-1 truncate font-medium">
									Menambahkan {p.name}
								</span>
								<span className="shrink-0 text-xs text-muted-foreground">
									{p.district}
								</span>
							</Link>
						))}

						{userReviews.map(({ place, review }) => (
							<Link
								key={`rev-${review.id}`}
								to={`/places/${place.slug}`}
								className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-primary"
							>
								<Star
									className="size-4 shrink-0 fill-accent-yellow text-accent-yellow"
									aria-hidden="true"
								/>
								<span className="min-w-0 flex-1 truncate font-medium">
									Mengulas {place.name} ({review.rating}/5)
								</span>
								<span className="hidden sm:inline max-w-[220px] truncate text-xs text-muted-foreground">
									{review.comment}
								</span>
							</Link>
						))}

						{userExtraContribs.map((item) => {
							const target = places.find((p) => p.id === item.placeId);
							return (
								<Link
									key={item.id}
									to={target ? `/places/${target.slug}` : "/explore"}
									className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-primary"
								>
									{item.type === "photo" ? (
										<Camera
											className="size-4 shrink-0 text-primary"
											aria-hidden="true"
										/>
									) : (
										<PencilLine
											className="size-4 shrink-0 text-primary"
											aria-hidden="true"
										/>
									)}
									<span className="min-w-0 flex-1 truncate font-medium">
										{item.placeName}
									</span>
									<span className="shrink-0 text-xs text-muted-foreground">
										{item.summary}
									</span>
								</Link>
							);
						})}
					</div>
				</section>
			) : null}
		</div>
	);
}
