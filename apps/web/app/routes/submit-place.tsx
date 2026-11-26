import {
	Award,
	Camera,
	CheckCircle2,
	Clock,
	Compass,
	ImagePlus,
	LocateFixed,
	LogIn,
	MapPin,
	MapPinPlus,
	MessageSquarePlus,
	PencilLine,
	PlusCircle,
	Star,
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
import { Badge } from "~/components/ui/badge";
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
import { Separator } from "~/components/ui/separator";
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
		{ title: "Contribute Kuliner Batang | Darasa" },
		{
			name: "description",
			content:
				"Kontribusi seperti Google Maps untuk menambahkan tempat kuliner baru, mengunggah foto, memperbarui info, dan menulis ulasan di Kabupaten Batang.",
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
	const [category, setCategory] = useState<PlaceCategory>(
		"Masakan Tradisional",
	);
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

	// Contributor stats & unified activity feed (derived + recorded)
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

	const photoContribCount = userExtraContribs.filter(
		(c) => c.type === "photo",
	).length;
	const editContribCount = userExtraContribs.filter(
		(c) => c.type === "edit",
	).length;
	const totalPoints =
		userSubmittedPlaces.length * 15 +
		userReviews.length * 10 +
		photoContribCount * 5 +
		editContribCount * 5;
	const contributorLevel = Math.max(1, Math.floor(totalPoints / 30) + 1);

	const suggestedForReview = useMemo(
		() =>
			places
				.filter((p) => !p.reviews.some((r) => r.userId === currentUser.id))
				.slice(0, 4),
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
				setGeoMessage(
					"Koordinat berhasil diambil dari tautan Google Maps dan peta diperbarui.",
				);
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
			setGeoMessage("Browser Anda tidak mendukung Geolocation API.");
			return;
		}
		setGeoMessage("Mengambil koordinat GPS perangkat...");
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setLat(pos.coords.latitude.toFixed(4));
				setLng(pos.coords.longitude.toFixed(4));
				setGeoMessage("Koordinat GPS berhasil diisi dari perangkat Anda.");
			},
			() => {
				setGeoMessage(
					"Izin lokasi ditolak atau tidak tersedia. Menggunakan titik referensi kawasan Batang.",
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
				"Latitude harus berada di sekitar wilayah Batang (-7.5 s.d. -6.5).";
		}
		if (Number.isNaN(parsedLng) || parsedLng < 109.4 || parsedLng > 110.3) {
			nextErrors.lng =
				"Longitude harus berada di sekitar wilayah Batang (109.4 s.d. 110.3).";
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
		setEditSaved("Saran pembaruan informasi usaha telah diterapkan.");
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
		setPhotoSuccess("Foto baru berhasil ditambahkan ke galeri tempat kuliner.");
	};

	const handleReviewSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (reviewComment.trim().length < 10) {
			setReviewError(
				"Tulis ulasan minimal 10 karakter agar membantu pengunjung lain.",
			);
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

	const quickActions: Array<{
		id: ContributeTab;
		label: string;
		subtitle: string;
		icon: typeof MapPinPlus;
	}> = [
		{
			id: "add_place",
			label: "Tambah Tempat",
			subtitle: "Daftarkan UMKM baru",
			icon: MapPinPlus,
		},
		{
			id: "update_info",
			label: "Perbarui Info",
			subtitle: "Jam buka, harga & alamat",
			icon: PencilLine,
		},
		{
			id: "add_photo",
			label: "Tambah Foto",
			subtitle: "Unggah foto makanan",
			icon: Camera,
		},
		{
			id: "write_review",
			label: "Tulis Ulasan",
			subtitle: "Beri rating & cerita",
			icon: MessageSquarePlus,
		},
	];

	return (
		<div className="space-y-8">
			{/* Google Maps-style Contributor Header */}
			<section className="border-b border-border pb-6 space-y-5">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-center gap-4">
						<img
							src="/images/avatar-profile.svg"
							alt={`Avatar ${currentUser.name}`}
							width={56}
							height={56}
							className="size-14 shrink-0 rounded-full border-2 border-primary bg-muted object-cover"
						/>
						<div className="space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
									Contribute · {currentUser.name}
								</h1>
								<Badge variant="yellow">
									<Award className="size-3.5" aria-hidden="true" />
									Local Guide Level {contributorLevel}
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground">
								Bantu lengkapi peta kuliner Batang dengan tempat baru, foto,
								pembaruan info, dan ulasan komunitas.
							</p>
						</div>
					</div>

					{/* Contributor Metrics Strip */}
					<dl className="grid grid-cols-4 divide-x divide-border rounded-[12px] border border-border bg-background py-3 text-center">
						<div className="px-3">
							<dt className="text-[11px] font-medium text-muted-foreground">
								Tempat
							</dt>
							<dd className="text-base font-bold text-foreground tabular-nums">
								{userSubmittedPlaces.length}
							</dd>
						</div>
						<div className="px-3">
							<dt className="text-[11px] font-medium text-muted-foreground">
								Ulasan
							</dt>
							<dd className="text-base font-bold text-foreground tabular-nums">
								{userReviews.length}
							</dd>
						</div>
						<div className="px-3">
							<dt className="text-[11px] font-medium text-muted-foreground">
								Foto
							</dt>
							<dd className="text-base font-bold text-foreground tabular-nums">
								{photoContribCount}
							</dd>
						</div>
						<div className="px-3">
							<dt className="text-[11px] font-medium text-muted-foreground">
								Edit
							</dt>
							<dd className="text-base font-bold text-foreground tabular-nums">
								{editContribCount}
							</dd>
						</div>
					</dl>
				</div>

				{/* Google Maps 4 Quick Contribute Action Buttons */}
				<div
					role="tablist"
					aria-label="Jenis kontribusi Darasa"
					className="grid grid-cols-2 gap-3 sm:grid-cols-4"
				>
					{quickActions.map((action) => {
						const Icon = action.icon;
						const active = activeTab === action.id;
						return (
							<button
								key={action.id}
								type="button"
								role="tab"
								aria-selected={active}
								onClick={() => setActiveTab(action.id)}
								className={cn(
									"flex flex-col items-center gap-2.5 rounded-[12px] border p-3.5 text-center transition-colors sm:flex-row sm:items-center sm:gap-3 sm:text-left",
									active
										? "border-primary bg-primary-soft text-primary-hover"
										: "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/60",
								)}
							>
								<span
									className={cn(
										"flex size-10 shrink-0 items-center justify-center rounded-full",
										active
											? "bg-primary text-primary-foreground"
											: "bg-card text-primary border border-border",
									)}
								>
									<Icon className="size-5" aria-hidden="true" />
								</span>
								<span className="min-w-0">
									<span className="block text-sm font-bold leading-tight">
										{action.label}
									</span>
									<span className="mt-0.5 block text-xs text-muted-foreground">
										{action.subtitle}
									</span>
								</span>
							</button>
						);
					})}
				</div>
			</section>

			{isVisitor ? (
				<div className="rounded-[14px] border border-border bg-background p-6 sm:p-8 text-center space-y-4">
					<h2 className="text-lg font-bold text-foreground">
						Masuk untuk Mulai Berkontribusi di Darasa
					</h2>
					<p className="mx-auto max-w-lg text-sm text-muted-foreground">
						Seperti Google Maps Contribute, setiap penambahan tempat, foto, edit
						info, dan ulasan terhubung dengan akun kontributor Anda.
					</p>
					<div className="flex flex-wrap justify-center gap-2.5">
						<Button
							type="button"
							onClick={() => switchDemoAccount("usr-warga")}
						>
							<PlusCircle className="size-4" aria-hidden="true" />
							Coba Langsung sebagai Warga
						</Button>
						<Button asChild variant="outline">
							<Link to="/login?redirect=/submit-place">
								<LogIn className="size-4" aria-hidden="true" />
								Masuk Akun
							</Link>
						</Button>
						<Button asChild variant="ghost">
							<Link to="/register">Daftar Baru</Link>
						</Button>
					</div>
				</div>
			) : (
				<>
					{/* TAB 1: ADD PLACE */}
					{activeTab === "add_place" ? (
						createdSlug ? (
							<div className="mx-auto max-w-xl py-8 space-y-4 rounded-[14px] border border-border bg-background p-6">
								<div className="flex items-center gap-3 text-primary">
									<CheckCircle2
										className="size-7 shrink-0"
										aria-hidden="true"
									/>
									<h2 className="text-xl font-bold text-foreground">
										Usulan Tempat Kuliner Terkirim
									</h2>
								</div>
								<p className="text-sm text-muted-foreground leading-relaxed">
									Data tempat kuliner Anda sudah masuk ke direktori dan antrean
									validasi komunitas Darasa.
								</p>
								<div className="flex flex-wrap gap-3 pt-2">
									<Button asChild>
										<Link to={`/places/${createdSlug}`}>
											Lihat Halaman Tempat
										</Link>
									</Button>
									<Button
										variant="secondary"
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
							<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
								<div className="lg:col-span-7">
									<form
										onSubmit={handleAddPlaceSubmit}
										noValidate
										className="space-y-6"
									>
										<div className="flex items-center gap-2 border-b border-border pb-2.5">
											<span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
												1
											</span>
											<h2 className="text-sm font-bold text-foreground">
												Identitas Tempat Kuliner
											</h2>
										</div>

										<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
													Kategori kuliner{" "}
													<span className="text-red-text">*</span>
												</Label>
												<Select
													value={category}
													onValueChange={(val) =>
														setCategory(val as PlaceCategory)
													}
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
													Kecamatan / Kawasan{" "}
													<span className="text-red-text">*</span>
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
													Alamat / Patokan lokasi{" "}
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

											<div className="sm:col-span-2 border-t border-border pt-5 space-y-4">
												<div className="flex flex-wrap items-center justify-between gap-2">
													<span className="flex items-center gap-2 text-sm font-bold text-foreground">
														<span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
															2
														</span>
														Pin Lokasi pada Peta &amp; Google Maps
													</span>
													<Button
														type="button"
														variant="secondary"
														size="sm"
														onClick={handleUseCurrentLocation}
													>
														<LocateFixed
															className="size-4"
															aria-hidden="true"
														/>
														Gunakan Lokasi Perangkat
													</Button>
												</div>

												<GoogleMapPicker
													lat={
														Number(lat) ||
														DISTRICT_COORDINATES["Batang Kota"].lat
													}
													lng={
														Number(lng) ||
														DISTRICT_COORDINATES["Batang Kota"].lng
													}
													onPickLocation={(nextLat, nextLng, note) => {
														setLat(String(nextLat));
														setLng(String(nextLng));
														if (note) setGeoMessage(note);
													}}
												/>

												<div className="space-y-1.5">
													<Label
														htmlFor={mapsUrlId}
														className="text-xs font-semibold"
													>
														Atau tempel tautan Google Maps / koordinat
													</Label>
													<Input
														id={mapsUrlId}
														type="text"
														value={mapsLinkInput}
														onChange={(e) =>
															parseGoogleMapsInput(e.target.value)
														}
														placeholder="Contoh: https://www.google.com/maps/@-6.9078,109.7302,17z"
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
													className="rounded-[10px] border border-border bg-background px-3.5 py-2.5"
												>
													<summary className="text-xs font-semibold text-muted-foreground hover:text-foreground">
														Atur koordinat manual ({lat}, {lng})
													</summary>
													<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
																className="tabular-nums bg-card"
															/>
															{errors.lat ? (
																<p
																	role="alert"
																	className="text-xs text-red-text"
																>
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
																className="tabular-nums bg-card"
															/>
															{errors.lng ? (
																<p
																	role="alert"
																	className="text-xs text-red-text"
																>
																	{errors.lng}
																</p>
															) : null}
														</div>
													</div>
												</details>
											</div>

											<div className="sm:col-span-2 flex items-center gap-2 border-b border-border pb-2.5 pt-2">
												<span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
													3
												</span>
												<h2 className="text-sm font-bold text-foreground">
													Jam Buka, Kisaran Harga &amp; Foto
												</h2>
											</div>

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
												<Label htmlFor={priceId}>
													Kisaran harga (opsional)
												</Label>
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
													Deskripsi menu andalan &amp; suasana{" "}
													<span className="text-red-text">*</span>
												</Label>
												<Textarea
													id={descId}
													rows={3}
													required
													value={description}
													onChange={(e) => setDescription(e.target.value)}
													aria-invalid={Boolean(errors.description)}
													placeholder="Jelaskan menu andalan, porsi, atau ciri khas tempat makan ini..."
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

											<div className="sm:col-span-2 space-y-1.5">
												<Label htmlFor={photoId}>
													Foto awal tempat atau makanan (opsional)
												</Label>
												<label
													htmlFor={photoId}
													className="flex min-h-[48px] items-center gap-2.5 rounded-[8px] border border-dashed border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:border-primary"
												>
													<ImagePlus
														className="size-4 text-primary"
														aria-hidden="true"
													/>
													<span>
														Pilih foto dari perangkat (JPG, PNG, WebP)
													</span>
												</label>
												<input
													id={photoId}
													type="file"
													accept="image/*"
													onChange={(e) => readImageFile(e, setPhotoPreview)}
													className="visually-hidden"
												/>
												{photoPreview ? (
													<img
														src={photoPreview}
														alt="Pratinjau foto tempat baru"
														width={320}
														height={200}
														className="mt-2 h-36 w-56 rounded-[10px] border border-border object-cover"
													/>
												) : null}
											</div>
										</div>

										<div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
											<Button asChild variant="outline">
												<Link to="/explore">Batal</Link>
											</Button>
											<Button type="submit" size="lg">
												<PlusCircle className="size-4" aria-hidden="true" />
												Kirim Tempat Kuliner
											</Button>
										</div>
									</form>
								</div>

								{/* Cardless Sticky Preview */}
								<aside className="lg:col-span-5 lg:border-l lg:border-border lg:pl-7 lg:sticky lg:top-24 lg:self-start space-y-4">
									<div className="space-y-0.5">
										<h2 className="text-sm font-bold text-foreground">
											Pratinjau Tampilan Darasa
										</h2>
										<p className="text-xs text-muted-foreground">
											Tampilan langsung di halaman Jelajah Kuliner.
										</p>
									</div>

									<div className="space-y-3">
										<div className="relative aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-muted">
											<img
												src={photoPreview || "/images/megono-batang.svg"}
												alt="Pratinjau visual tempat kuliner"
												className="h-full w-full object-cover"
											/>
											<div className="absolute inset-x-2.5 top-2.5 flex flex-wrap items-center justify-between gap-2">
												<Badge
													variant="outline"
													className="bg-card/95 text-foreground"
												>
													{category}
												</Badge>
												<Badge variant="default" className="bg-primary-soft/95">
													<Compass className="size-3.5" aria-hidden="true" />
													Baru Terdaftar
												</Badge>
											</div>
										</div>

										<div className="space-y-2">
											<h3 className="text-[18px] font-semibold leading-snug text-foreground">
												{name.trim() || "Nama Warung / Kedai Anda"}
											</h3>
											<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
												<span className="inline-flex items-center gap-1 font-semibold text-foreground">
													<Star
														className="size-4 fill-accent-yellow text-accent-yellow"
														aria-hidden="true"
													/>
													Baru
													<span className="font-normal text-muted-foreground">
														(0)
													</span>
												</span>
												<span aria-hidden="true" className="text-border">
													·
												</span>
												<span className="inline-flex items-center gap-1 text-muted-foreground">
													<MapPin
														className="size-3.5 text-primary"
														aria-hidden="true"
													/>
													{district}
												</span>
											</div>

											<p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
												{description.trim() ||
													"Ceritakan menu andalan, suasana warung, atau ciri khas yang membuat warga Batang perlu mampir ke sini."}
											</p>

											<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
												<Clock
													className="size-3.5 shrink-0 text-primary"
													aria-hidden="true"
												/>
												<span>
													{openingHours.trim() || "Jam buka fleksibel"}
												</span>
											</div>

											<Separator />

											<div className="flex items-center justify-between gap-2 text-xs">
												<Badge variant="outline">Menunggu Tinjauan</Badge>
												<span className="font-medium text-muted-foreground tabular-nums">
													{priceRange.trim() || "Rp 10.000 - Rp 25.000"}
												</span>
											</div>

											<p className="text-xs text-muted-foreground tabular-nums">
												Koordinat: {lat}, {lng}
											</p>
										</div>
									</div>
								</aside>
							</div>
						)
					) : null}

					{/* TAB 2: UPDATE PLACE INFO */}
					{activeTab === "update_info" ? (
						<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
							<form
								onSubmit={handleUpdateInfoSubmit}
								className="lg:col-span-7 space-y-5"
							>
								<div className="space-y-1">
									<h2 className="text-lg font-bold text-foreground">
										Perbarui Informasi Tempat (Suggest an Edit)
									</h2>
									<p className="text-sm text-muted-foreground">
										Lihat jam buka berubah, harga terbaru, atau patokan alamat
										kurang tepat? Bantu perbarui infonya untuk warga Batang.
									</p>
								</div>

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
										<Label htmlFor={editAddrId}>Alamat / Patokan Terbaru</Label>
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
											placeholder="Contoh: Sekarang buka sampai pukul 22.00 WIB di hari Minggu."
										/>
									</div>
								</div>

								<div className="flex flex-wrap items-center justify-between gap-3 pt-2">
									<Link
										to={
											selectedEditPlace
												? `/claim?placeId=${selectedEditPlace.id}`
												: "/claim"
										}
										className="text-xs font-semibold text-primary hover:underline"
									>
										Anda pemilik usaha ini? Ajukan Klaim Usaha &rarr;
									</Link>
									<Button type="submit">
										<PencilLine className="size-4" aria-hidden="true" />
										Simpan Pembaruan Info
									</Button>
								</div>
							</form>

							{selectedEditPlace ? (
								<aside className="lg:col-span-5 lg:border-l lg:border-border lg:pl-7 space-y-3">
									<h3 className="text-sm font-bold text-foreground">
										Data Saat Ini
									</h3>
									<div className="rounded-[12px] border border-border bg-background p-4 space-y-2.5 text-sm">
										<p className="font-semibold text-foreground">
											{selectedEditPlace.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{selectedEditPlace.address}
										</p>
										<p className="text-xs text-muted-foreground">
											Jam buka: {selectedEditPlace.openingHours}
										</p>
										<p className="text-xs text-muted-foreground">
											Harga: {selectedEditPlace.priceRange}
										</p>
										<Link
											to={`/places/${selectedEditPlace.slug}`}
											className="inline-block pt-1 text-xs font-semibold text-primary hover:underline"
										>
											Buka profil tempat &rarr;
										</Link>
									</div>
								</aside>
							) : null}
						</div>
					) : null}

					{/* TAB 3: ADD PHOTO */}
					{activeTab === "add_photo" ? (
						<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
							<div className="lg:col-span-7 space-y-5">
								<div className="space-y-1">
									<h2 className="text-lg font-bold text-foreground">
										Tambah Foto Kuliner
									</h2>
									<p className="text-sm text-muted-foreground">
										Bagikan foto hidangan, suasana warung, atau daftar menu agar
										pengunjung lain punya gambaran nyata.
									</p>
								</div>

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

								<form onSubmit={handleAddPhotoSubmit} className="space-y-4">
									<div className="space-y-1.5">
										<Label htmlFor={photoSelectId}>Pilih Tempat Kuliner</Label>
										<Select
											value={photoPlaceId}
											onValueChange={setPhotoPlaceId}
										>
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

									<div className="space-y-1.5">
										<Label htmlFor={extraPhotoId}>Unggah Foto</Label>
										<label
											htmlFor={extraPhotoId}
											className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-[10px] border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground hover:border-primary"
										>
											<Camera
												className="size-5 text-primary"
												aria-hidden="true"
											/>
											<span>Pilih foto dari galeri / kamera perangkat</span>
										</label>
										<input
											id={extraPhotoId}
											type="file"
											accept="image/*"
											onChange={(e) => {
												setPhotoError(null);
												readImageFile(e, setExtraPhotoPreview);
											}}
											className="visually-hidden"
										/>
									</div>

									{extraPhotoPreview ? (
										<img
											src={extraPhotoPreview}
											alt="Pratinjau foto unggahan"
											width={360}
											height={220}
											className="h-44 w-72 rounded-[10px] border border-border object-cover"
										/>
									) : null}

									<Button type="submit">
										<ImagePlus className="size-4" aria-hidden="true" />
										Tambahkan ke Galeri
									</Button>
								</form>
							</div>

							{(() => {
								const selectedPhotoPlace =
									places.find((p) => p.id === photoPlaceId) ?? places[0];
								if (!selectedPhotoPlace) return null;
								return (
									<aside className="lg:col-span-5 lg:border-l lg:border-border lg:pl-7 space-y-3">
										<h3 className="text-sm font-bold text-foreground">
											Galeri Saat Ini · {selectedPhotoPlace.name}
										</h3>
										<div className="grid grid-cols-2 gap-2.5">
											{selectedPhotoPlace.photos.map((src, idx) => (
												<img
													key={src}
													src={src}
													alt={`Foto ${idx + 1} ${selectedPhotoPlace.name}`}
													className="aspect-[16/10] w-full rounded-[8px] border border-border object-cover"
												/>
											))}
										</div>
									</aside>
								);
							})()}
						</div>
					) : null}

					{/* TAB 4: WRITE REVIEW */}
					{activeTab === "write_review" ? (
						<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
							<form
								onSubmit={handleReviewSubmit}
								className="lg:col-span-7 space-y-5"
							>
								<div className="space-y-1">
									<h2 className="text-lg font-bold text-foreground">
										Tulis Ulasan &amp; Rating
									</h2>
									<p className="text-sm text-muted-foreground">
										Ulasan jujur membantu menaikkan Explore Score dan mengangkat
										Hidden Gem lokal di Batang.
									</p>
								</div>

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

								<div className="space-y-1.5">
									<Label htmlFor={reviewSelectId}>Pilih Tempat Kuliner</Label>
									<Select
										value={reviewPlaceId}
										onValueChange={setReviewPlaceId}
									>
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
								</div>

								<fieldset className="m-0 space-y-1.5 border-0 p-0">
									<legend className="text-sm font-medium text-foreground">
										Rating Rasa &amp; Pengalaman
									</legend>
									<div className="flex items-center gap-1.5">
										{[1, 2, 3, 4, 5].map((star) => (
											<button
												key={star}
												type="button"
												onClick={() => setReviewRating(star)}
												aria-label={`Beri ${star} bintang`}
												aria-pressed={reviewRating === star}
												className="inline-flex size-10 items-center justify-center rounded-[8px] border border-border bg-background hover:border-accent-yellow"
											>
												<Star
													className={cn(
														"size-5",
														star <= reviewRating
															? "fill-accent-yellow text-accent-yellow"
															: "text-muted-foreground",
													)}
													aria-hidden="true"
												/>
											</button>
										))}
										<span className="ml-2 text-sm font-semibold text-foreground tabular-nums">
											{reviewRating} / 5
										</span>
									</div>
								</fieldset>

								<div className="space-y-1.5">
									<Label htmlFor={reviewCommentId}>
										Ceritakan Pengalaman Anda
									</Label>
									<Textarea
										id={reviewCommentId}
										rows={4}
										value={reviewComment}
										onChange={(e) => setReviewComment(e.target.value)}
										placeholder="Bagaimana rasa makanannya, porsinya, harga, atau suasana tempatnya?"
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor={reviewPhotoId}>
										Foto pendukung (opsional)
									</Label>
									<label
										htmlFor={reviewPhotoId}
										className="flex min-h-[44px] items-center gap-2 rounded-[8px] border border-dashed border-border bg-background px-3.5 py-2 text-sm text-muted-foreground hover:border-primary"
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
										className="visually-hidden"
									/>
									{reviewPhotoPreview ? (
										<img
											src={reviewPhotoPreview}
											alt="Pratinjau foto ulasan"
											width={280}
											height={180}
											className="mt-2 h-32 w-48 rounded-[8px] border border-border object-cover"
										/>
									) : null}
								</div>

								<Button type="submit">
									<MessageSquarePlus className="size-4" aria-hidden="true" />
									Kirim Ulasan
								</Button>
							</form>

							{/* Google Maps-style "Places waiting for your review" */}
							<aside className="lg:col-span-5 lg:border-l lg:border-border lg:pl-7 space-y-3">
								<h3 className="text-sm font-bold text-foreground">
									Rekomendasi Tempat untuk Diulas
								</h3>
								<div className="space-y-2.5">
									{suggestedForReview.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => setReviewPlaceId(p.id)}
											className={cn(
												"flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition-colors",
												reviewPlaceId === p.id
													? "border-primary bg-primary-soft/60"
													: "border-border bg-background hover:bg-muted/60",
											)}
										>
											<img
												src={p.photos[0] ?? "/images/megono-batang.svg"}
												alt=""
												width={56}
												height={42}
												className="h-11 w-14 shrink-0 rounded-[6px] object-cover"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold text-foreground">
													{p.name}
												</p>
												<p className="truncate text-xs text-muted-foreground">
													{p.district} · {p.category}
												</p>
											</div>
										</button>
									))}
								</div>
							</aside>
						</div>
					) : null}
				</>
			)}

			{/* Your Contributions Activity Section */}
			<section
				aria-labelledby="your-contributions-heading"
				className="border-t border-border pt-7 space-y-4"
			>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2
						id="your-contributions-heading"
						className="text-lg font-bold text-foreground"
					>
						Kontribusi Anda ({currentUser.name})
					</h2>
					<span className="text-xs font-medium text-muted-foreground tabular-nums">
						{totalPoints} poin kontribusi
					</span>
				</div>

				{userSubmittedPlaces.length === 0 &&
				userReviews.length === 0 &&
				userExtraContribs.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Belum ada aktivitas kontribusi dari akun ini. Pilih salah satu aksi
						di atas untuk mulai berkontribusi.
					</p>
				) : (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						{userSubmittedPlaces.map((p) => (
							<Link
								key={`place-${p.id}`}
								to={`/places/${p.slug}`}
								className="flex items-start gap-3 rounded-[10px] border border-border bg-background p-3.5 transition-colors hover:border-primary"
							>
								<MapPinPlus
									className="mt-0.5 size-4 shrink-0 text-primary"
									aria-hidden="true"
								/>
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-foreground">
										Menambahkan {p.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{p.district} · {p.category}
									</p>
								</div>
							</Link>
						))}

						{userReviews.map(({ place, review }) => (
							<Link
								key={`rev-${review.id}`}
								to={`/places/${place.slug}`}
								className="flex items-start gap-3 rounded-[10px] border border-border bg-background p-3.5 transition-colors hover:border-primary"
							>
								<Star
									className="mt-0.5 size-4 shrink-0 fill-accent-yellow text-accent-yellow"
									aria-hidden="true"
								/>
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-foreground">
										Mengulas {place.name} ({review.rating}/5)
									</p>
									<p className="line-clamp-1 text-xs text-muted-foreground">
										{review.comment}
									</p>
								</div>
							</Link>
						))}

						{userExtraContribs.map((item) => {
							const target = places.find((p) => p.id === item.placeId);
							return (
								<Link
									key={item.id}
									to={target ? `/places/${target.slug}` : "/explore"}
									className="flex items-start gap-3 rounded-[10px] border border-border bg-background p-3.5 transition-colors hover:border-primary"
								>
									{item.type === "photo" ? (
										<Camera
											className="mt-0.5 size-4 shrink-0 text-primary"
											aria-hidden="true"
										/>
									) : (
										<PencilLine
											className="mt-0.5 size-4 shrink-0 text-primary"
											aria-hidden="true"
										/>
									)}
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-foreground">
											{item.placeName}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{item.summary}
										</p>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}
