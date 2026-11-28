import {
	Award,
	CheckCircle2,
	Clock,
	Compass,
	Eye,
	Gem,
	MapPin,
	MessageSquarePlus,
	Phone,
	Star,
	Store,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { VerificationBadge } from "~/components/verification-badge";
import type { PlaceWithMetrics } from "~/context/darasa-store";

interface PlaceSummaryInfoProps {
	place: PlaceWithMetrics;
	isVisitor: boolean;
	hasReviewed?: boolean;
	onOpenReviewModal: () => void;
}

export function PlaceSummaryInfo({
	place,
	isVisitor,
	hasReviewed = false,
	onOpenReviewModal,
}: PlaceSummaryInfoProps) {
	const isClaimed = Boolean(place.ownerId);

	return (
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
							<dd className="text-foreground font-medium">{place.address}</dd>
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
								<dd className="text-foreground tabular-nums">{place.phone}</dd>
							</div>
						</div>
					) : null}
				</dl>

				<div className="grid grid-cols-2 divide-x divide-border py-3">
					<div className="pr-3">
						<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<Compass className="size-3.5 text-primary" aria-hidden="true" />
							Explore Score
						</p>
						<p className="mt-0.5 text-lg font-bold text-foreground tabular-nums">
							{place.exploreScore.toFixed(2)}
						</p>
					</div>
					<div className="pl-4">
						<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<Gem
								className="size-3.5 fill-[#f7c95c]/30 text-amber-500 dark:text-yellow-text"
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
				) : hasReviewed ? (
					<Button type="button" variant="outline" disabled className="w-full">
						<CheckCircle2 className="size-4" aria-hidden="true" />
						Anda Sudah Mengulas Tempat Ini
					</Button>
				) : (
					<Button onClick={onOpenReviewModal} className="w-full">
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
	);
}
