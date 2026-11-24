import {
	CheckCircle2,
	Clock,
	Compass,
	ImagePlus,
	LocateFixed,
	LogIn,
	MapPin,
	PlusCircle,
	Star,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useId, useState } from "react";
import { Link } from "react-router";
import { GoogleMapPicker } from "~/components/google-map-picker";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
import type { Route } from "./+types/submit-place";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Tambah Tempat Kuliner | Darasa" },
		{
			name: "description",
			content:
				"Tambahkan usaha kuliner lokal di Kabupaten Batang agar lebih mudah ditemukan warga dan pengunjung.",
		},
	];
}

export default function SubmitPlacePage() {
	const { currentUser, submitPlace } = useDarasa();

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

	const parseGoogleMapsInput = (raw: string) => {
		setMapsLinkInput(raw);
		const trimmed = raw.trim();
		if (!trimmed) return;

		// Match @lat,lng | q=lat,lng | ll=lat,lng | !3dlat!4dlng | plain "lat, lng"
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

	const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			setPhotoPreview("");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") setPhotoPreview(reader.result);
		};
		reader.readAsDataURL(file);
	};

	const handleSubmit = (e: FormEvent) => {
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

	if (currentUser.role === "visitor") {
		return (
			<Card className="mx-auto max-w-xl p-8 text-center space-y-4">
				<h1 className="text-2xl font-bold text-foreground">
					Masuk untuk Menambahkan Tempat Kuliner
				</h1>
				<p className="text-sm text-muted-foreground">
					Sesuai aturan kontribusi komunitas Darasa, setiap penambahan tempat
					kuliner baru harus terhubung dengan akun pengguna terdaftar.
				</p>
				<div className="flex flex-wrap justify-center gap-3">
					<Button asChild>
						<Link to="/login?redirect=/submit-place">
							<LogIn className="size-4" aria-hidden="true" />
							Masuk Akun
						</Link>
					</Button>
					<Button asChild variant="secondary">
						<Link to="/register">Daftar Baru</Link>
					</Button>
				</div>
			</Card>
		);
	}

	if (createdSlug) {
		return (
			<Card className="mx-auto max-w-xl p-8 space-y-4">
				<div className="flex items-center gap-3 text-primary">
					<CheckCircle2 className="size-7 shrink-0" aria-hidden="true" />
					<h1 className="text-2xl font-bold text-foreground">
						Usulan Tempat Kuliner Terkirim
					</h1>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					Data tempat kuliner Anda sudah masuk ke antrean validasi komunitas dan
					admin sebelum ditandai terverifikasi penuh.
				</p>
				<div className="flex flex-wrap gap-3 pt-2">
					<Button asChild>
						<Link to={`/places/${createdSlug}`}>Lihat Halaman Tempat</Link>
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
			</Card>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground">
					Tambah Tempat Kuliner di Batang
				</h1>
				<p className="text-sm sm:text-base text-muted-foreground">
					Bantu UMKM lokal yang belum memiliki profil digital agar mudah
					ditemukan warga dan pekerja di Kabupaten Batang.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				<Card className="lg:col-span-7 p-6 sm:p-8">
					<form onSubmit={handleSubmit} noValidate className="space-y-6">
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
									Nama tempat kuliner <span className="text-red-text">*</span>
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
									<p role="alert" className="text-xs font-medium text-red-text">
										{errors.name}
									</p>
								) : null}
							</div>

							<div className="space-y-1.5">
								<Label htmlFor={catId}>
									Kategori kuliner <span className="text-red-text">*</span>
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
									Kecamatan / Kawasan <span className="text-red-text">*</span>
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
									placeholder="Contoh: Sebelah barat Pasar Limpung atau koridor depan gerbang KITB"
								/>
								{errors.address ? (
									<p role="alert" className="text-xs font-medium text-red-text">
										{errors.address}
									</p>
								) : null}
							</div>

							<div className="sm:col-span-2 rounded-[10px] border border-border bg-background p-4 space-y-4">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className="flex items-center gap-2 text-sm font-bold text-foreground">
										<span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
											2
										</span>
										Lokasi pada Peta &amp; Google Maps
									</span>
									<Button
										variant="secondary"
										size="sm"
										onClick={handleUseCurrentLocation}
									>
										<LocateFixed className="size-4" aria-hidden="true" />
										Gunakan Lokasi Perangkat
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
									<Label htmlFor={mapsUrlId} className="text-xs font-semibold">
										Atau tempel tautan Google Maps / koordinat
									</Label>
									<Input
										id={mapsUrlId}
										type="text"
										value={mapsLinkInput}
										onChange={(e) => parseGoogleMapsInput(e.target.value)}
										placeholder="Contoh: https://www.google.com/maps/@-6.9078,109.7302,17z atau -6.9078, 109.7302"
									/>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<span className="text-xs font-medium text-muted-foreground">
										Titik cepat Batang:
									</span>
									{BATANG_DISTRICTS.map((d) => (
										<Button
											key={d}
											variant={district === d ? "secondary" : "outline"}
											size="sm"
											onClick={() => handleDistrictChange(d)}
											className="min-h-[34px] px-2.5 text-xs"
										>
											{d}
										</Button>
									))}
								</div>

								{geoMessage ? (
									<p
										role="status"
										className="text-xs font-medium text-primary-hover"
									>
										{geoMessage}
									</p>
								) : null}

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
									<p role="alert" className="text-xs font-medium text-red-text">
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
									<span>Pilih foto dari perangkat (JPG, PNG, WebP)</span>
								</label>
								<input
									id={photoId}
									type="file"
									accept="image/*"
									onChange={handlePhotoChange}
									className="visually-hidden"
								/>
								{photoPreview ? (
									<img
										src={photoPreview}
										alt="Pratinjau foto tempat baru"
										width={320}
										height={200}
										className="mt-2 h-36 w-56 rounded-[8px] border border-border object-cover"
									/>
								) : null}
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
							<Button asChild variant="outline">
								<Link to="/">Batal</Link>
							</Button>
							<Button type="submit" size="lg">
								<PlusCircle className="size-4" aria-hidden="true" />
								Kirim Tempat Kuliner
							</Button>
						</div>
					</form>
				</Card>

				<aside className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start space-y-4">
					<Card className="overflow-hidden">
						<div className="border-b border-border bg-background px-5 py-3.5">
							<h2 className="text-sm font-bold text-foreground">
								Pratinjau Kartu Darasa
							</h2>
							<p className="text-xs text-muted-foreground">
								Tampilan langsung bagaimana tempat kuliner ini akan muncul di
								halaman Jelajah.
							</p>
						</div>

						<div className="relative aspect-[16/10] w-full overflow-hidden bg-background">
							<img
								src={photoPreview || "/images/megono-batang.svg"}
								alt="Pratinjau visual tempat kuliner"
								className="h-full w-full object-cover"
							/>
							<div className="absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-2">
								<Badge
									variant="outline"
									className="bg-card/95 text-foreground shadow-xs"
								>
									{category}
								</Badge>
								<Badge
									variant="default"
									className="bg-primary-soft/95 shadow-xs"
								>
									<Compass className="size-3.5" aria-hidden="true" />
									Baru Terdaftar
								</Badge>
							</div>
						</div>

						<div className="space-y-3 p-5">
							<div className="space-y-1.5">
								<h3 className="text-[18px] font-semibold leading-snug text-foreground">
									{name.trim() || "Nama Warung / Kedai Anda"}
								</h3>
								<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
									<span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
										<Star
											className="size-4 fill-accent-yellow text-accent-yellow"
											aria-hidden="true"
										/>
										Baru
										<span className="font-normal text-muted-foreground">
											(0 ulasan)
										</span>
									</span>
									<span aria-hidden="true" className="text-border">
										/
									</span>
									<span className="inline-flex items-center gap-1 text-muted-foreground">
										<MapPin
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										{district}
									</span>
								</div>
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
								<span>{openingHours.trim() || "Jam buka fleksibel"}</span>
							</div>

							<Separator />

							<div className="flex items-center justify-between gap-2 text-xs">
								<Badge variant="outline">Menunggu Tinjauan</Badge>
								<span className="font-medium text-muted-foreground tabular-nums">
									{priceRange.trim() || "Rp 10.000 - Rp 25.000"}
								</span>
							</div>

							<p className="rounded-[8px] border border-border bg-background px-3 py-2 text-xs text-muted-foreground tabular-nums">
								Titik koordinat peta: {lat}, {lng}
							</p>
						</div>
					</Card>
				</aside>
			</div>
		</div>
	);
}
