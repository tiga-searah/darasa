import { Award, Compass, Gem, Lock, MapPin, Star } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { OwnerProfileForm } from "~/components/owner/owner-profile-form";
import { OwnerReviewsPanel } from "~/components/owner/owner-reviews-panel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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

	if (currentUser.role !== "owner" || !ownedPlace) {
		return (
			<div className="mx-auto max-w-2xl py-10 pb-8">
				<section className="rounded-[12px] border border-border bg-card p-6 sm:p-8 text-center space-y-5">
					<span className="mx-auto flex size-12 items-center justify-center rounded-full bg-yellow-soft text-yellow-text border border-accent-yellow/50">
						<Lock className="size-5" aria-hidden="true" />
					</span>
					<div className="space-y-1.5">
						<h1 className="text-xl font-bold text-foreground sm:text-2xl">
							Akses Usahamu Memerlukan Klaim Disetujui
						</h1>
						<p className="mx-auto max-w-md text-sm text-muted-foreground">
							Sesuai aturan PRD FR-040, pengelolaan profil usaha hanya aktif
							setelah pengajuan klaim disetujui administrator.
						</p>
					</div>

					<div className="flex flex-wrap justify-center gap-3">
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
				</section>
			</div>
		);
	}

	return (
		<div className="space-y-6 pb-8">
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
				<div className="space-y-1.5">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">{ownedPlace.category}</Badge>
						<VerificationBadge status={ownedPlace.verificationStatus} />
						<span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<MapPin className="size-3.5 text-primary" aria-hidden="true" />
							{ownedPlace.district}
						</span>
					</div>
					<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
						Usahamu: {ownedPlace.name}
					</h1>
				</div>

				<Button asChild variant="secondary">
					<Link to={`/places/${ownedPlace.slug}`}>Lihat Halaman Publik</Link>
				</Button>
			</div>

			<section
				aria-label="Statistik profil usaha"
				className="grid grid-cols-1 divide-y divide-border border-b border-border pb-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
			>
				<div className="py-2 sm:py-0 sm:pr-6 space-y-1">
					<p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
						<Star
							className="size-4 fill-accent-yellow text-accent-yellow"
							aria-hidden="true"
						/>
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
						<Gem
							className="size-4 fill-[#f7c95c] text-yellow-text dark:fill-[#f7c95c]/30"
							aria-hidden="true"
						/>
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
				<OwnerProfileForm
					place={ownedPlace}
					onSave={(updates) => updatePlaceProfile(ownedPlace.id, updates)}
				/>
				<OwnerReviewsPanel place={ownedPlace} onReplyToReview={replyToReview} />
			</div>
		</div>
	);
}
