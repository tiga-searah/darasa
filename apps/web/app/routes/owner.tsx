import {
	Award,
	CheckCircle2,
	Compass,
	Gem,
	Lock,
	MessageSquareReply,
	Save,
	Star,
} from "lucide-react";
import { type FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { VerificationBadge } from "~/components/verification-badge";
import { useDarasa } from "~/context/darasa-store";
import type { Route } from "./+types/owner";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Usahamu | Darasa" },
		{
			name: "description",
			content:
				"Kelola profil usaha terverifikasi, pantau statistik ulasan, dan balas ulasan pelanggan di Darasa.",
		},
	];
}

export default function OwnerDashboardPage() {
	const {
		currentUser,
		places,
		updatePlaceProfile,
		replyToReview,
		switchDemoAccount,
	} = useDarasa();

	const ownedPlace = useMemo(() => {
		if (currentUser.claimedPlaceId) {
			return places.find((p) => p.id === currentUser.claimedPlaceId);
		}
		return places.find((p) => p.ownerId === currentUser.id);
	}, [places, currentUser]);

	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [openingHours, setOpeningHours] = useState("");
	const [priceRange, setPriceRange] = useState("");
	const [phone, setPhone] = useState("");
	const [description, setDescription] = useState("");
	const [savedNotice, setSavedNotice] = useState<string | null>(null);
	const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
	const [reviewFilter, setReviewFilter] = useState<"all" | "unanswered">("all");

	const nameId = useId();
	const addrId = useId();
	const hoursId = useId();
	const priceId = useId();
	const phoneId = useId();
	const descId = useId();

	useEffect(() => {
		if (!ownedPlace) return;
		setName(ownedPlace.name);
		setAddress(ownedPlace.address);
		setOpeningHours(ownedPlace.openingHours);
		setPriceRange(ownedPlace.priceRange);
		setPhone(ownedPlace.phone ?? "");
		setDescription(ownedPlace.description);
	}, [ownedPlace]);

	if (currentUser.role !== "owner" || !ownedPlace) {
		return (
			<div className="mx-auto max-w-2xl py-10 space-y-5">
				<div className="flex items-center gap-3">
					<span className="flex size-11 items-center justify-center rounded-[10px] bg-yellow-soft text-yellow-text border border-accent-yellow/50">
						<Lock className="size-5" aria-hidden="true" />
					</span>
					<div>
						<h1 className="text-xl font-bold text-foreground">
							Akses Usahamu Memerlukan Klaim Disetujui
						</h1>
						<p className="text-sm text-muted-foreground">
							Sesuai aturan PRD FR-040, pengelolaan profil usaha hanya aktif
							setelah pengajuan klaim disetujui administrator.
						</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-3">
					<Button asChild>
						<Link to="/claim">
							<Award className="size-4" aria-hidden="true" />
							Ajukan Klaim Usaha
						</Link>
					</Button>
					<Button
						variant="secondary"
						onClick={() => switchDemoAccount("usr-owner")}
					>
						Coba sebagai Pemilik Terverifikasi (Siti Aminah)
					</Button>
				</div>
			</div>
		);
	}

	const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
		star,
		count: ownedPlace.reviews.filter((r) => r.rating === star).length,
	}));
	const unansweredCount = ownedPlace.reviews.filter(
		(r) => !r.ownerReply,
	).length;
	const displayedReviews =
		reviewFilter === "unanswered"
			? ownedPlace.reviews.filter((r) => !r.ownerReply)
			: ownedPlace.reviews;

	const handleProfileSave = (e: FormEvent) => {
		e.preventDefault();
		updatePlaceProfile(ownedPlace.id, {
			name: name.trim(),
			address: address.trim(),
			openingHours: openingHours.trim(),
			priceRange: priceRange.trim(),
			phone: phone.trim(),
			description: description.trim(),
		});
		setSavedNotice("Informasi profil usaha berhasil diperbarui.");
	};

	const handleReplySubmit = (reviewId: string) => {
		const msg = replyDrafts[reviewId] ?? "";
		if (!msg.trim()) return;
		replyToReview(reviewId, msg);
		setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
	};

	return (
		<div className="space-y-6">
			{/* Flat Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
				<div className="space-y-1.5">
					<div className="flex flex-wrap items-center gap-2">
						<VerificationBadge status={ownedPlace.verificationStatus} />
						<Badge variant="secondary">{ownedPlace.district}</Badge>
					</div>
					<h1 className="text-2xl sm:text-[28px] font-bold text-foreground">
						Usahamu: {ownedPlace.name}
					</h1>
				</div>

				<Button asChild variant="secondary">
					<Link to={`/places/${ownedPlace.slug}`}>Lihat Halaman Publik</Link>
				</Button>
			</div>

			{/* Divided Stat Strip (No Stat Cards) */}
			<section
				aria-label="Statistik profil usaha"
				className="grid grid-cols-1 divide-y divide-border border-b border-border pb-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
			>
				<div className="py-2 sm:py-0 sm:pr-6 space-y-1">
					<p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
						<Star className="size-4 text-yellow-text" aria-hidden="true" />
						Rata-rata Rating &amp; Volume
					</p>
					<p className="text-2xl font-bold text-foreground tabular-nums">
						{ownedPlace.averageRating.toFixed(2)}{" "}
						<span className="text-sm font-normal text-muted-foreground">
							dari {ownedPlace.reviewCount} ulasan ·{" "}
							{ownedPlace.views.toLocaleString("id-ID")} kali dilihat
						</span>
					</p>
				</div>

				<div className="py-2 sm:py-0 sm:px-6 space-y-1">
					<p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
						<Compass className="size-4 text-primary" aria-hidden="true" />
						Explore Score Saat Ini
					</p>
					<p className="text-2xl font-bold text-foreground tabular-nums">
						{ownedPlace.exploreScore.toFixed(3)}
					</p>
				</div>

				<div className="py-2 sm:py-0 sm:pl-6 space-y-1">
					<p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
						<Gem className="size-4 text-yellow-text" aria-hidden="true" />
						Status Hidden Gem
					</p>
					<p className="text-lg font-bold text-foreground tabular-nums">
						{ownedPlace.hiddenGemEligible
							? `Memenuhi Syarat (${ownedPlace.hiddenGemScore.toFixed(2)})`
							: "Belum memenuhi syarat"}
					</p>
				</div>
			</section>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				<section className="lg:col-span-5 space-y-4">
					<h2 className="text-lg font-bold text-foreground">
						Perbarui Informasi Usaha
					</h2>

					{savedNotice ? (
						<div
							role="status"
							className="flex items-center gap-2 rounded-[8px] border border-primary/30 bg-primary-soft px-3.5 py-2.5 text-xs font-semibold text-primary-hover"
						>
							<CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
							{savedNotice}
						</div>
					) : null}

					<form onSubmit={handleProfileSave} className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor={nameId}>Nama usaha</Label>
							<Input
								id={nameId}
								type="text"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={addrId}>Alamat usaha</Label>
							<Input
								id={addrId}
								type="text"
								required
								value={address}
								onChange={(e) => setAddress(e.target.value)}
							/>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor={hoursId}>Jam buka</Label>
								<Input
									id={hoursId}
									type="text"
									value={openingHours}
									onChange={(e) => setOpeningHours(e.target.value)}
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor={priceId}>Kisaran harga</Label>
								<Input
									id={priceId}
									type="text"
									value={priceRange}
									onChange={(e) => setPriceRange(e.target.value)}
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={phoneId}>Nomor kontak / WhatsApp</Label>
							<Input
								id={phoneId}
								type="tel"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor={descId}>Deskripsi usaha</Label>
							<Textarea
								id={descId}
								rows={3}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>

						<Button type="submit" className="w-full">
							<Save className="size-4" aria-hidden="true" />
							Simpan Perubahan Profil
						</Button>
					</form>
				</section>

				<section className="lg:col-span-7 lg:border-l lg:border-border lg:pl-7 space-y-6">
					<div className="border-b border-border pb-6 space-y-3">
						<h2 className="text-lg font-bold text-foreground">
							Distribusi Bintang dari Ulasan Terdata
						</h2>
						<div className="space-y-2">
							{ratingDistribution.map((row) => {
								const pct =
									ownedPlace.reviewCount > 0
										? Math.round((row.count / ownedPlace.reviewCount) * 100)
										: 0;
								return (
									<div
										key={row.star}
										className="flex items-center gap-3 text-xs"
									>
										<span className="w-16 font-semibold text-foreground tabular-nums">
											{row.star} bintang
										</span>
										<div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
											<div
												style={{ width: `${pct}%` }}
												className="h-full rounded-full bg-primary transition-[width] duration-300"
											/>
										</div>
										<span className="w-10 text-right text-muted-foreground tabular-nums">
											{row.count}
										</span>
									</div>
								);
							})}
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h2 className="text-lg font-bold text-foreground">
								Balas Ulasan Pengunjung ({displayedReviews.length})
							</h2>
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									variant={reviewFilter === "all" ? "secondary" : "outline"}
									onClick={() => setReviewFilter("all")}
								>
									Semua ({ownedPlace.reviews.length})
								</Button>
								<Button
									size="sm"
									variant={
										reviewFilter === "unanswered" ? "secondary" : "outline"
									}
									onClick={() => setReviewFilter("unanswered")}
								>
									Belum Dibalas ({unansweredCount})
								</Button>
							</div>
						</div>

						{displayedReviews.length === 0 ? (
							<div className="border-t border-border py-8 text-center text-sm text-muted-foreground">
								Semua ulasan pengunjung sudah Anda balas. Kerja bagus menjaga
								komunikasi dengan pelanggan!
							</div>
						) : (
							<ul className="divide-y divide-border border-t border-border">
								{displayedReviews.map((rev) => (
									<li key={rev.id} className="py-5 space-y-3">
										<div className="flex items-center justify-between gap-2">
											<p className="text-sm font-semibold text-foreground">
												{rev.authorName}
											</p>
											<Badge variant="yellow">
												<Star
													className="size-3.5 fill-accent-yellow text-yellow-text"
													aria-hidden="true"
												/>
												<span className="tabular-nums">{rev.rating}/5</span>
											</Badge>
										</div>
										<p className="text-sm text-foreground">{rev.comment}</p>

										{rev.ownerReply ? (
											<div className="border-l-2 border-primary pl-3.5 py-0.5 space-y-1">
												<p className="text-xs font-semibold text-primary-hover">
													Balasan Anda
												</p>
												<p className="text-sm text-muted-foreground">
													{rev.ownerReply.message}
												</p>
											</div>
										) : (
											<div className="flex flex-col sm:flex-row gap-2">
												<label className="sr-only" htmlFor={`reply-${rev.id}`}>
													Balas ulasan {rev.authorName}
												</label>
												<Input
													id={`reply-${rev.id}`}
													type="text"
													value={replyDrafts[rev.id] ?? ""}
													onChange={(e) =>
														setReplyDrafts((prev) => ({
															...prev,
															[rev.id]: e.target.value,
														}))
													}
													placeholder="Tulis balasan sopan untuk pelanggan..."
													className="flex-1"
												/>
												<Button
													variant="secondary"
													onClick={() => handleReplySubmit(rev.id)}
												>
													<MessageSquareReply
														className="size-4"
														aria-hidden="true"
													/>
													Kirim Balasan
												</Button>
											</div>
										)}
									</li>
								))}
							</ul>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
