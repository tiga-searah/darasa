import {
	ArrowLeft,
	Award,
	Bookmark,
	ChevronLeft,
	ChevronRight,
	Clock,
	Compass,
	Eye,
	Gem,
	ImagePlus,
	MapPin,
	Maximize2,
	MessageSquarePlus,
	Phone,
	Star,
	Store,
	ThumbsUp,
	X,
} from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { Link, useParams } from "react-router";
import { BatangMapPreview } from "~/components/batang-map-preview";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogClose,
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
import { INITIAL_PLACES } from "~/data/batang-places";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/place-detail";

function formatSlugTitle(slug?: string): string {
	if (!slug) return "Detail Kuliner";
	return slug
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export function meta({ params }: Route.MetaArgs) {
	const matchedPlace = INITIAL_PLACES.find((p) => p.slug === params.slug);
	const pageTitle = matchedPlace?.name ?? formatSlugTitle(params.slug);
	return [
		{ title: `${pageTitle} | Darasa` },
		{
			name: "description",
			content:
				matchedPlace?.description ??
				"Detail tempat kuliner, foto, rating, ulasan komunitas, dan lokasi peta di Kabupaten Batang.",
		},
	];
}

export default function PlaceDetailPage() {
	const { slug } = useParams();
	const {
		places,
		hydrated,
		currentUser,
		recordPlaceView,
		submitReview,
		isBookmarked,
		toggleBookmark,
		isReviewLiked,
		toggleReviewLike,
		getReviewLikeCount,
	} = useDarasa();
	const place = places.find((p) => p.slug === slug);
	const recordedPlaceIdRef = useRef<string | null>(null);

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

	useEffect(() => {
		if (place) {
			document.title = `${place.name} | Darasa`;
		}
	}, [place]);

	useEffect(() => {
		if (!place?.id) return;
		setActivePhotoIndex(0);
	}, [place?.id]);

	useEffect(() => {
		if (!hydrated || !place?.id) return;
		if (recordedPlaceIdRef.current === place.id) return;
		recordedPlaceIdRef.current = place.id;
		recordPlaceView(place.id);
	}, [hydrated, place?.id, recordPlaceView]);

	if (!place) {
		return (
			<div className="py-16 text-center space-y-4">
				<h1 className="text-2xl font-bold text-foreground">
					Tempat kuliner tidak ditemukan
				</h1>
				<p className="text-sm text-muted-foreground">
					Profil kuliner yang Anda cari mungkin belum tersedia atau tautannya
					berubah.
				</p>
				<Button asChild>
					<Link to="/explore">
						<ArrowLeft className="size-4" aria-hidden="true" />
						Kembali ke Jelajah
					</Link>
				</Button>
			</div>
		);
	}

	const photos = Array.from(
		new Set(
			place.photos.length > 0 ? place.photos : ["/images/megono-batang.svg"],
		),
	);
	const safePhotoIndex = Math.min(
		activePhotoIndex,
		Math.max(0, photos.length - 1),
	);
	const activePhoto = photos[safePhotoIndex] ?? photos[0];
	const hasMultiplePhotos = photos.length > 1;
	const showPrevPhoto = () => {
		setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
	};
	const showNextPhoto = () => {
		setActivePhotoIndex((prev) => (prev + 1) % photos.length);
	};
	const isVisitor = currentUser.role === "visitor";
	const isClaimed = Boolean(place.ownerId);
	const saved = isBookmarked(place.id);

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
		<div className="space-y-8">
			<div className="flex items-center justify-between gap-3">
				<Button asChild variant="ghost" size="sm" className="-ml-3">
					<Link to="/explore">
						<ArrowLeft className="size-4" aria-hidden="true" />
						Kembali ke Jelajah Kuliner
					</Link>
				</Button>

				<Button
					type="button"
					variant={saved ? "default" : "outline"}
					size="sm"
					aria-pressed={saved}
					onClick={() => toggleBookmark(place.id)}
				>
					<Bookmark
						className={`size-4 ${saved ? "fill-current" : ""}`}
						aria-hidden="true"
					/>
					{saved ? "Tersimpan" : "Simpan"}
				</Button>
			</div>

			{submitSuccess ? (
				<div
					role="status"
					className="rounded-[10px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-hover"
				>
					{submitSuccess}
				</div>
			) : null}

			{/* Top Hero & Summary Split (Cardless, Play Store / Maps style) */}
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
				<section
					aria-label="Galeri foto tempat kuliner"
					className="lg:col-span-7 space-y-3"
				>
					<div className="group relative overflow-hidden rounded-[14px] bg-muted">
						<button
							type="button"
							onClick={() => setLightboxOpen(true)}
							aria-label={`Perbesar foto ${place.name}`}
							className="block w-full overflow-hidden text-left"
						>
							<img
								src={activePhoto}
								alt={`Foto ${safePhotoIndex + 1} ${place.name}`}
								width={800}
								height={500}
								fetchPriority="high"
								className="aspect-[16/10] w-full object-cover"
							/>
						</button>

						{hasMultiplePhotos ? (
							<>
								<button
									type="button"
									onClick={showPrevPhoto}
									aria-label="Foto sebelumnya"
									title="Foto sebelumnya"
									className="absolute left-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm transition-colors hover:bg-card hover:text-primary"
								>
									<ChevronLeft className="size-4" aria-hidden="true" />
								</button>
								<button
									type="button"
									onClick={showNextPhoto}
									aria-label="Foto berikutnya"
									title="Foto berikutnya"
									className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm transition-colors hover:bg-card hover:text-primary"
								>
									<ChevronRight className="size-4" aria-hidden="true" />
								</button>
							</>
						) : null}

						<button
							type="button"
							onClick={() => setLightboxOpen(true)}
							aria-label={`Perbesar foto ${place.name}`}
							title="Perbesar foto"
							className="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm transition-colors hover:bg-card hover:text-primary"
						>
							<Maximize2 className="size-4" aria-hidden="true" />
						</button>
					</div>

					<Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
						<DialogContent
							bare
							onKeyDown={(event) => {
								if (!hasMultiplePhotos) return;
								if (event.key === "ArrowLeft") {
									event.preventDefault();
									showPrevPhoto();
								} else if (event.key === "ArrowRight") {
									event.preventDefault();
									showNextPhoto();
								}
							}}
						>
							<DialogTitle className="sr-only">{place.name}</DialogTitle>
							<DialogDescription className="sr-only">
								Foto ke-{safePhotoIndex + 1} dari {photos.length}
							</DialogDescription>
							<div className="relative">
								<img
									src={activePhoto}
									alt={`Foto ukuran penuh ${safePhotoIndex + 1} ${place.name}`}
									className="block max-h-[88dvh] max-w-[92dvw] w-auto h-auto rounded-[10px] object-contain"
								/>
								<DialogClose
									aria-label="Tutup foto"
									className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
								>
									<X className="size-5" aria-hidden="true" />
								</DialogClose>
								{hasMultiplePhotos ? (
									<>
										<button
											type="button"
											onClick={showPrevPhoto}
											aria-label="Foto sebelumnya"
											title="Foto sebelumnya"
											className="absolute left-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80"
										>
											<ChevronLeft className="size-5" aria-hidden="true" />
										</button>
										<button
											type="button"
											onClick={showNextPhoto}
											aria-label="Foto berikutnya"
											title="Foto berikutnya"
											className="absolute right-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80"
										>
											<ChevronRight className="size-5" aria-hidden="true" />
										</button>
									</>
								) : null}
							</div>
						</DialogContent>
					</Dialog>

					{hasMultiplePhotos ? (
						<div className="flex gap-2 overflow-x-auto pb-1">
							{photos.map((src, idx) => (
								<button
									key={src}
									type="button"
									onClick={() => setActivePhotoIndex(idx)}
									aria-label={`Lihat foto ${idx + 1}`}
									aria-pressed={idx === safePhotoIndex}
									className={`shrink-0 overflow-hidden rounded-[8px] border-2 transition-colors ${
										idx === safePhotoIndex
											? "border-primary"
											: "border-border hover:border-input"
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

				<div className="lg:col-span-5 flex flex-col justify-between gap-6">
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

						<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
							<span aria-hidden="true" className="text-border">
								·
							</span>
							<span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground tabular-nums">
								<Eye className="size-4 text-primary" aria-hidden="true" />
								{place.views.toLocaleString("id-ID")}
							</span>
						</div>

						<p className="text-sm leading-relaxed text-muted-foreground">
							{place.description}
						</p>

						<Separator />

						<dl className="space-y-3 text-sm">
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

						{/* Inline Play-Store-style metric bar instead of boxed stat cards */}
						<div className="grid grid-cols-2 divide-x divide-border py-3">
							<div className="pr-3">
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
							<div className="pl-4">
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
										: place.reviews.some((r) => r.comment.trim().length > 0)
											? "Tidak masuk (<4.0)"
											: "Butuh ulasan tertulis"}
								</p>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-2.5">
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
				</div>
			</div>

			<Separator />

			{/* Map & Reviews Split (Open divided sections, minimal card) */}
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
				<section className="lg:col-span-7 space-y-6">
					{/* Darasa Rating Summary */}
					<div className="space-y-4 border-b border-border pb-6">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<h2 className="text-lg font-bold text-foreground">
								Rating &amp; Rincian Skor
							</h2>
							<span className="text-xs text-muted-foreground">
								Ditambahkan oleh {place.submittedByName}
							</span>
						</div>

						<div className="grid grid-cols-1 gap-6 sm:grid-cols-12 sm:items-center">
							<div className="sm:col-span-4 space-y-1.5">
								<p className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
									{place.reviewCount > 0 ? place.averageRating.toFixed(1) : "—"}
								</p>
								<div
									role="img"
									className="flex items-center gap-0.5"
									aria-label={`Rata-rata ${place.averageRating.toFixed(1)} dari 5 bintang`}
								>
									{[1, 2, 3, 4, 5].map((starValue) => {
										const filled =
											place.reviewCount > 0 &&
											starValue <= Math.round(place.averageRating);
										return (
											<Star
												key={starValue}
												className={cn(
													"size-4",
													filled
														? "fill-accent-yellow text-accent-yellow"
														: "text-border",
												)}
												aria-hidden="true"
											/>
										);
									})}
								</div>
								<p className="text-xs text-muted-foreground tabular-nums">
									{place.reviewCount} ulasan komunitas
								</p>
							</div>

							<div className="sm:col-span-8 space-y-1.5">
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
											<span className="inline-flex w-7 items-center gap-1 font-semibold text-foreground tabular-nums">
												{star}
												<Star
													className="size-3 fill-accent-yellow text-accent-yellow"
													aria-hidden="true"
												/>
											</span>
											<div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
												<div
													style={{ width: `${pct}%` }}
													className="h-full rounded-full bg-primary transition-[width] duration-300"
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
					</div>

					{/* Darasa Community Reviews Feed */}
					<div className="space-y-2">
						<h2 className="text-lg font-bold text-foreground">
							Ulasan Komunitas ({place.reviews.length})
						</h2>

						{place.reviews.length === 0 ? (
							<div className="py-10 text-center space-y-2">
								<h3 className="text-base font-semibold text-foreground">
									Belum ada ulasan untuk tempat ini
								</h3>
								<p className="text-sm text-muted-foreground">
									Jadilah kontributor pertama yang membagikan pengalaman rasa
									dan harga di sini.
								</p>
							</div>
						) : (
							<ul className="divide-y divide-border">
								{place.reviews.map((rev) => {
									const liked = isReviewLiked(rev.id);
									const likeCount = getReviewLikeCount(rev.id);
									return (
										<li key={rev.id} className="py-5 space-y-3">
											<div className="flex flex-wrap items-center justify-between gap-2">
												<div className="flex items-center gap-2.5">
													<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
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

												<div
													role="img"
													className="flex items-center gap-0.5"
													aria-label={`${rev.rating} dari 5 bintang`}
												>
													{[1, 2, 3, 4, 5].map((starValue) => (
														<Star
															key={starValue}
															className={cn(
																"size-4",
																starValue <= rev.rating
																	? "fill-accent-yellow text-accent-yellow"
																	: "text-border",
															)}
															aria-hidden="true"
														/>
													))}
												</div>
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
													className="mt-2 h-44 w-full max-w-xs rounded-[10px] border border-border object-cover"
												/>
											) : null}

											<div className="flex items-center justify-between gap-3 pt-0.5">
												<button
													type="button"
													onClick={() => toggleReviewLike(rev.id)}
													aria-pressed={liked}
													aria-label={
														liked
															? `Batal suka ulasan ${rev.authorName}`
															: `Suka ulasan ${rev.authorName}`
													}
													className={cn(
														"group/like inline-flex items-center gap-1.5 bg-transparent p-0 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
														liked
															? "text-primary"
															: "text-muted-foreground hover:text-primary",
													)}
												>
													<ThumbsUp
														className={cn(
															"size-4 transition-[color,transform,fill] duration-150 group-hover/like:scale-110",
															liked ? "fill-primary text-primary" : "",
														)}
														aria-hidden="true"
													/>
													<span className="tabular-nums">{likeCount}</span>
												</button>
											</div>

											{rev.ownerReply ? (
												<div className="mt-2 rounded-[10px] border border-border bg-muted/45 p-3.5 space-y-1">
													<p className="text-xs font-semibold text-primary-hover">
														{rev.ownerReply.authorName}
													</p>
													<p className="text-sm text-muted-foreground leading-relaxed">
														{rev.ownerReply.message}
													</p>
												</div>
											) : null}
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</section>

				<aside className="lg:col-span-5 space-y-4">
					<h2 className="text-lg font-bold text-foreground">
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
											className="relative inline-flex size-11 items-center justify-center rounded-[8px] transition-transform duration-150 hover:scale-110 active:scale-95 focus-within:outline-2 focus-within:outline-ring"
										>
											<input
												type="radio"
												name="rating"
												value={value}
												checked={rating === value}
												onChange={() => setRating(value)}
												aria-label={`${value} bintang`}
												className="sr-only"
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
