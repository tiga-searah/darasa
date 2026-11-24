import {
	ArrowLeft,
	Award,
	Clock,
	Compass,
	Gem,
	ImagePlus,
	MapPin,
	Maximize2,
	MessageSquarePlus,
	Phone,
	Star,
	Store,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useId, useState } from "react";
import { Link, useParams } from "react-router";
import { BatangMapPreview } from "~/components/batang-map-preview";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { VerificationBadge } from "~/components/verification-badge";
import { useDarasa } from "~/context/darasa-store";
import type { Route } from "./+types/place-detail";

export function meta({ params }: Route.MetaArgs) {
	return [
		{ title: `${params.slug ?? "Detail Kuliner"} | Darasa` },
		{
			name: "description",
			content:
				"Detail tempat kuliner, foto, rating, ulasan komunitas, dan lokasi peta di Kabupaten Batang.",
		},
	];
}

export default function PlaceDetailPage() {
	const { slug } = useParams();
	const { places, currentUser, submitReview } = useDarasa();
	const place = places.find((p) => p.slug === slug);

	const [activePhotoIndex, setActivePhotoIndex] = useState(0);
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [reviewModalOpen, setReviewModalOpen] = useState(false);
	const [rating, setRating] = useState(5);
	const [hoverRating, setHoverRating] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [photoPreview, setPhotoPreview] = useState<string>("");
	const [formError, setFormError] = useState<string | null>(null);
	const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

	const commentId = useId();
	const photoInputId = useId();
	const errorId = useId();

	if (!place) {
		return (
			<Card className="p-10 text-center space-y-4">
				<h1 className="text-2xl font-bold text-foreground">
					Tempat kuliner tidak ditemukan
				</h1>
				<p className="text-sm text-muted-foreground">
					Profil kuliner yang Anda cari mungkin belum tersedia atau tautannya
					berubah.
				</p>
				<Button asChild>
					<Link to="/">
						<ArrowLeft className="size-4" aria-hidden="true" />
						Kembali ke Jelajah
					</Link>
				</Button>
			</Card>
		);
	}

	const photos =
		place.photos.length > 0 ? place.photos : ["/images/megono-batang.svg"];
	const activePhoto = photos[activePhotoIndex] ?? photos[0];
	const isVisitor = currentUser.role === "visitor";
	const isClaimed = Boolean(place.ownerId);

	const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			setPhotoPreview("");
			return;
		}
		if (!file.type.startsWith("image/")) {
			setFormError("File harus berupa gambar (JPG, PNG, WebP).");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				setPhotoPreview(reader.result);
			}
		};
		reader.readAsDataURL(file);
	};

	const handleReviewSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (comment.trim().length < 10) {
			setFormError(
				"Tulis ulasan minimal 10 karakter agar bermanfaat bagi pengunjung lain.",
			);
			return;
		}
		submitReview({
			placeId: place.id,
			rating,
			comment,
			photoUrl: photoPreview || undefined,
		});
		setFormError(null);
		setComment("");
		setPhotoPreview("");
		setRating(5);
		setReviewModalOpen(false);
		setSubmitSuccess(
			"Ulasan Anda berhasil disimpan dan skor Explore serta Hidden Gem telah diperbarui.",
		);
	};

	return (
		<div className="space-y-6">
			<div>
				<Button asChild variant="ghost" size="sm" className="-ml-3">
					<Link to="/">
						<ArrowLeft className="size-4" aria-hidden="true" />
						Kembali ke Jelajah Kuliner
					</Link>
				</Button>
			</div>

			{submitSuccess ? (
				<div
					role="status"
					className="rounded-[12px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-hover"
				>
					{submitSuccess}
				</div>
			) : null}

			{/* Top Hero & Summary Grid */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				<section
					aria-label="Galeri foto tempat kuliner"
					className="lg:col-span-7 space-y-3"
				>
					<Card className="overflow-hidden">
						<button
							type="button"
							onClick={() => setLightboxOpen(true)}
							aria-label={`Perbesar foto ${place.name}`}
							className="group relative block w-full overflow-hidden text-left"
						>
							<img
								src={activePhoto}
								alt={`Foto utama ${place.name}`}
								width={800}
								height={500}
								fetchPriority="high"
								className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
							/>
							<span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm border border-border">
								<Maximize2
									className="size-3.5 text-primary"
									aria-hidden="true"
								/>
								Perbesar foto
							</span>
						</button>
					</Card>

					<Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
						<DialogContent className="max-w-3xl p-4 sm:p-6">
							<DialogHeader>
								<DialogTitle>{place.name}</DialogTitle>
								<DialogDescription>
									Foto ke-{activePhotoIndex + 1} dari {photos.length} ·{" "}
									{place.district}, Kabupaten Batang
								</DialogDescription>
							</DialogHeader>
							<div className="overflow-hidden rounded-[10px] border border-border bg-background">
								<img
									src={activePhoto}
									alt={`Foto ukuran penuh ${place.name}`}
									className="max-h-[70vh] w-full object-contain"
								/>
							</div>
							{photos.length > 1 ? (
								<div className="flex flex-wrap gap-2">
									{photos.map((src, idx) => (
										<button
											key={src}
											type="button"
											onClick={() => setActivePhotoIndex(idx)}
											className={`overflow-hidden rounded-[8px] border-2 ${
												idx === activePhotoIndex
													? "border-primary"
													: "border-border"
											}`}
										>
											<img
												src={src}
												alt={`Pilih foto ${idx + 1}`}
												className="h-14 w-20 object-cover"
											/>
										</button>
									))}
								</div>
							) : null}
						</DialogContent>
					</Dialog>

					{photos.length > 1 ? (
						<div className="flex flex-wrap gap-2">
							{photos.map((src, idx) => (
								<button
									key={src}
									type="button"
									onClick={() => setActivePhotoIndex(idx)}
									aria-label={`Lihat foto ${idx + 1}`}
									aria-pressed={idx === activePhotoIndex}
									className={`overflow-hidden rounded-[8px] border-2 ${
										idx === activePhotoIndex
											? "border-primary"
											: "border-border"
									}`}
								>
									<img
										src={src}
										alt={`Pratinjau foto ${idx + 1} ${place.name}`}
										width={120}
										height={75}
										className="h-16 w-24 object-cover"
									/>
								</button>
							))}
						</div>
					) : null}
				</section>

				<Card className="lg:col-span-5 p-6 flex flex-col justify-between gap-5">
					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">{place.category}</Badge>
							<VerificationBadge
								status={place.verificationStatus}
								isPendingModeration={place.isPendingModeration}
							/>
						</div>

						<h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground leading-tight">
							{place.name}
						</h1>

						<div className="flex items-center gap-2">
							<Star
								className="size-5 fill-accent-yellow text-yellow-text"
								aria-hidden="true"
							/>
							<span className="text-xl font-bold text-foreground tabular-nums">
								{place.reviewCount > 0
									? place.averageRating.toFixed(1)
									: "Belum ada"}
							</span>
							<span className="text-sm text-muted-foreground tabular-nums">
								({place.reviewCount} ulasan)
							</span>
						</div>

						<p className="text-sm leading-relaxed text-muted-foreground">
							{place.description}
						</p>

						<Separator />

						<dl className="space-y-2.5 text-sm">
							<div className="flex items-start gap-2.5">
								<MapPin
									className="mt-0.5 size-4 shrink-0 text-primary"
									aria-hidden="true"
								/>
								<div>
									<dt className="sr-only">Alamat</dt>
									<dd className="text-foreground font-medium">
										{place.address}
									</dd>
									<dd className="text-xs text-muted-foreground">
										{place.district}, Kabupaten Batang
									</dd>
								</div>
							</div>
							<div className="flex items-center gap-2.5">
								<Clock
									className="size-4 shrink-0 text-primary"
									aria-hidden="true"
								/>
								<div>
									<dt className="sr-only">Jam operasional</dt>
									<dd className="text-foreground">{place.openingHours}</dd>
								</div>
							</div>
							<div className="flex items-center gap-2.5">
								<Store
									className="size-4 shrink-0 text-primary"
									aria-hidden="true"
								/>
								<div>
									<dt className="sr-only">Kisaran harga</dt>
									<dd className="text-foreground tabular-nums">
										{place.priceRange}
									</dd>
								</div>
							</div>
							{place.phone ? (
								<div className="flex items-center gap-2.5">
									<Phone
										className="size-4 shrink-0 text-primary"
										aria-hidden="true"
									/>
									<div>
										<dt className="sr-only">Kontak usaha</dt>
										<dd className="text-foreground tabular-nums">
											{place.phone}
										</dd>
									</div>
								</div>
							) : null}
						</dl>

						<div className="grid grid-cols-2 gap-3 rounded-[10px] border border-border bg-background p-3.5">
							<div>
								<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
									<Compass
										className="size-3.5 text-primary"
										aria-hidden="true"
									/>
									Explore Score
								</p>
								<p className="mt-0.5 text-lg font-bold text-foreground tabular-nums">
									{place.exploreScore.toFixed(2)}
								</p>
							</div>
							<div>
								<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
									<Gem
										className="size-3.5 text-yellow-text"
										aria-hidden="true"
									/>
									Hidden Gem Score
								</p>
								<p className="mt-0.5 text-lg font-bold text-foreground tabular-nums">
									{place.hiddenGemEligible
										? place.hiddenGemScore.toFixed(2)
										: "Tidak masuk (<4.0)"}
								</p>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-2.5 border-t border-border pt-4">
						{isVisitor ? (
							<Button asChild className="w-full">
								<Link to={`/login?redirect=/places/${place.slug}`}>
									<MessageSquarePlus className="size-4" aria-hidden="true" />
									Masuk untuk Menulis Ulasan
								</Link>
							</Button>
						) : (
							<Button
								onClick={() => setReviewModalOpen(true)}
								className="w-full"
							>
								<MessageSquarePlus className="size-4" aria-hidden="true" />
								Tulis Rating &amp; Ulasan
							</Button>
						)}

						{!isClaimed ? (
							<Button asChild variant="secondary" className="w-full">
								<Link to={`/claim?placeId=${place.id}`}>
									<Award className="size-4" aria-hidden="true" />
									Klaim Profil Usaha Ini
								</Link>
							</Button>
						) : (
							<p className="text-center text-xs text-muted-foreground">
								Profil usaha ini sudah diklaim dan diverifikasi pemilik.
							</p>
						)}
					</div>
				</Card>
			</div>

			{/* Map & Reviews Split */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				<section className="lg:col-span-7 space-y-4">
					<Card className="p-5 space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<h2 className="text-base font-bold text-foreground">
								Rincian Skor &amp; Distribusi Rating
							</h2>
							<span className="text-xs text-muted-foreground">
								{place.reviewCount > 0
									? `Rata-rata ${place.averageRating.toFixed(1)} dari ${place.reviewCount} ulasan`
									: "Belum ada ulasan tercatat"}
							</span>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-1.5 rounded-[10px] border border-border bg-background p-3.5 text-xs">
								<p className="font-semibold text-foreground">
									Transparansi Perhitungan Darasa
								</p>
								<p className="text-muted-foreground">
									Explore Score:{" "}
									<strong className="text-foreground tabular-nums">
										{place.exploreScore.toFixed(2)}
									</strong>{" "}
									(rating + log jumlah ulasan + bonus verifikasi)
								</p>
								<p className="text-muted-foreground">
									Hidden Gem Score:{" "}
									<strong className="text-foreground tabular-nums">
										{place.hiddenGemEligible
											? place.hiddenGemScore.toFixed(2)
											: "Belum memenuhi syarat"}
									</strong>{" "}
									(rating tinggi dengan ulasan masih sedikit)
								</p>
							</div>

							<div className="space-y-1.5">
								{[5, 4, 3, 2, 1].map((star) => {
									const count = place.reviews.filter(
										(r) => r.rating === star,
									).length;
									const pct =
										place.reviewCount > 0
											? Math.round((count / place.reviewCount) * 100)
											: 0;
									return (
										<div
											key={star}
											className="flex items-center gap-2.5 text-xs"
										>
											<span className="w-12 font-semibold text-foreground tabular-nums">
												{star} bin.
											</span>
											<div className="h-2 flex-1 overflow-hidden rounded-full border border-border bg-background">
												<div
													style={{ width: `${pct}%` }}
													className="h-full bg-primary transition-[width] duration-300"
												/>
											</div>
											<span className="w-6 text-right text-muted-foreground tabular-nums">
												{count}
											</span>
										</div>
									);
								})}
							</div>
						</div>
					</Card>

					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="text-xl font-bold text-foreground">
							Ulasan Komunitas ({place.reviews.length})
						</h2>
						<span className="text-xs text-muted-foreground">
							Ditambahkan oleh {place.submittedByName}
						</span>
					</div>

					{place.reviews.length === 0 ? (
						<Card className="p-8 text-center space-y-3">
							<h3 className="text-base font-semibold text-foreground">
								Belum ada ulasan untuk tempat ini
							</h3>
							<p className="text-sm text-muted-foreground">
								Jadilah kontributor pertama yang membagikan pengalaman rasa dan
								harga di sini.
							</p>
						</Card>
					) : (
						<ul className="space-y-4">
							{place.reviews.map((rev) => (
								<li key={rev.id}>
									<Card className="p-5 space-y-3">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex items-center gap-2.5">
												<span className="flex size-8 items-center justify-center rounded-[8px] bg-secondary text-xs font-bold text-secondary-foreground">
													{rev.authorName.slice(0, 1).toUpperCase()}
												</span>
												<div>
													<p className="text-sm font-semibold text-foreground">
														{rev.authorName}
													</p>
													<p className="text-xs text-muted-foreground">
														{new Date(rev.createdAt).toLocaleDateString(
															"id-ID",
															{
																day: "numeric",
																month: "short",
																year: "numeric",
															},
														)}
													</p>
												</div>
											</div>

											<Badge variant="yellow">
												<Star
													className="size-3.5 fill-accent-yellow text-yellow-text"
													aria-hidden="true"
												/>
												<span className="tabular-nums">{rev.rating} / 5</span>
											</Badge>
										</div>

										<p className="text-sm leading-relaxed text-foreground">
											{rev.comment}
										</p>

										{rev.photoUrl ? (
											<img
												src={rev.photoUrl}
												alt={`Foto ulasan oleh ${rev.authorName}`}
												width={360}
												height={220}
												className="mt-2 h-44 w-full max-w-xs rounded-[8px] border border-border object-cover"
											/>
										) : null}

										{rev.ownerReply ? (
											<div className="mt-3 rounded-[8px] border border-primary/25 bg-primary-soft/60 p-3.5 space-y-1">
												<p className="text-xs font-semibold text-primary-hover">
													Balasan {rev.ownerReply.authorName}
												</p>
												<p className="text-sm text-foreground">
													{rev.ownerReply.message}
												</p>
											</div>
										) : null}
									</Card>
								</li>
							))}
						</ul>
					)}
				</section>

				<aside className="lg:col-span-5 space-y-4">
					<h2 className="text-xl font-bold text-foreground">
						Lokasi di Batang
					</h2>
					<BatangMapPreview
						name={place.name}
						district={place.district}
						address={place.address}
						lat={place.lat}
						lng={place.lng}
					/>
				</aside>
			</div>

			{/* Shadcn Dialog for Review Submission */}
			<Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ulas {place.name}</DialogTitle>
						<DialogDescription>
							Penilaian Anda terhubung ke akun untuk menjaga kualitas kurasi dan
							analisis anomali.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleReviewSubmit} noValidate className="space-y-4">
						{formError ? (
							<div
								id={errorId}
								role="alert"
								className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-3.5 py-2.5 text-sm font-medium text-red-text"
							>
								{formError}
							</div>
						) : null}

						<fieldset
							className="space-y-2"
							onMouseLeave={() => setHoverRating(null)}
						>
							<legend className="text-sm font-semibold text-foreground">
								Berikan Rating Bintang
							</legend>
							<div className="flex flex-wrap items-center gap-1.5">
								{[1, 2, 3, 4, 5].map((value) => {
									const activeLimit = hoverRating ?? rating;
									const isFilled = value <= activeLimit;
									return (
										<label
											key={value}
											onMouseEnter={() => setHoverRating(value)}
											className="inline-flex size-11 items-center justify-center rounded-[8px] transition-transform duration-150 hover:scale-110 active:scale-95 focus-within:outline-2 focus-within:outline-ring"
										>
											<input
												type="radio"
												name="rating"
												value={value}
												checked={rating === value}
												onChange={() => setRating(value)}
												aria-label={`${value} bintang`}
												className="visually-hidden"
											/>
											<Star
												className={`size-8 transition-colors duration-150 ${
													isFilled
														? "fill-accent-yellow text-accent-yellow"
														: "text-border hover:text-accent-yellow/70"
												}`}
												aria-hidden="true"
											/>
										</label>
									);
								})}
								<span className="ml-2 text-sm font-medium text-muted-foreground">
									{
										[
											"Kurang Memuaskan",
											"Cukup",
											"Enak",
											"Direkomendasikan",
											"Sangat Memuaskan",
										][(hoverRating ?? rating) - 1]
									}
								</span>
							</div>
						</fieldset>

						<div className="space-y-1.5">
							<Label htmlFor={commentId}>Ulasan tertulis</Label>
							<Textarea
								id={commentId}
								rows={4}
								required
								value={comment}
								onChange={(e) => {
									setComment(e.target.value);
									if (formError) setFormError(null);
								}}
								aria-invalid={Boolean(formError)}
								aria-describedby={formError ? errorId : undefined}
								placeholder="Ceritakan rasa makanan, harga, porsi, atau suasana warung..."
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={photoInputId}>
								Unggah foto makanan atau tempat (opsional)
							</Label>
							<label
								htmlFor={photoInputId}
								className="flex min-h-[44px] items-center gap-2 rounded-[8px] border border-dashed border-border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground hover:border-primary"
							>
								<ImagePlus className="size-4 text-primary" aria-hidden="true" />
								<span>Pilih file gambar dari perangkat Anda</span>
							</label>
							<input
								id={photoInputId}
								type="file"
								accept="image/*"
								onChange={handlePhotoChange}
								className="visually-hidden"
							/>
							{photoPreview ? (
								<img
									src={photoPreview}
									alt="Pratinjau foto ulasan"
									width={240}
									height={140}
									className="mt-2 h-28 w-44 rounded-[8px] border border-border object-cover"
								/>
							) : null}
						</div>

						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setReviewModalOpen(false)}
							>
								Batal
							</Button>
							<Button type="submit">Kirim Ulasan</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
