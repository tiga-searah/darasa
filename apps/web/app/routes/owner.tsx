import {
	CheckCircle2,
	Clock,
	Compass,
	ExternalLink,
	Lock,
	MapPin,
	Star,
	XCircle,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { OwnerProfileForm } from "~/components/owner/owner-profile-form";
import { OwnerReviewsPanel } from "~/components/owner/owner-reviews-panel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { type PlaceWithMetrics, useDarasa } from "~/context/darasa-store";
import type { BusinessClaim, ClaimStatus } from "~/lib/types";
import type { Route } from "./+types/owner";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Usahamu | Darasa" },
		{
			name: "description",
			content:
				"Kelola profil usaha, pantau rating, dan balas ulasan pelanggan di Darasa.",
		},
	];
}

interface OwnerBusinessEntry {
	place: PlaceWithMetrics;
	approvalStatus: ClaimStatus;
	claim?: BusinessClaim;
}

const APPROVAL_LABELS: Record<ClaimStatus, string> = {
	approved: "Disetujui",
	pending: "Menunggu",
	rejected: "Ditolak",
};

function ApprovalStatusBadge({ status }: { status: ClaimStatus }) {
	if (status === "approved") {
		return (
			<Badge variant="default" className="shrink-0">
				<CheckCircle2 className="size-3.5" aria-hidden="true" />
				Disetujui
			</Badge>
		);
	}
	if (status === "rejected") {
		return (
			<Badge variant="destructive" className="shrink-0">
				<XCircle className="size-3.5" aria-hidden="true" />
				Ditolak
			</Badge>
		);
	}
	return (
		<Badge variant="yellow" className="shrink-0">
			<Clock className="size-3.5" aria-hidden="true" />
			Menunggu
		</Badge>
	);
}

export default function OwnerDashboardPage() {
	const {
		currentUser,
		places,
		claims,
		updatePlaceProfile,
		replyToReview,
		switchDemoAccount,
	} = useDarasa();
	const businessSelectId = useId();

	const ownerBusinesses = useMemo<OwnerBusinessEntry[]>(() => {
		if (currentUser.role === "visitor") return [];

		const latestClaimByPlaceId = new Map<string, BusinessClaim>();
		for (const claim of claims) {
			if (claim.claimantUserId !== currentUser.id) continue;
			const prev = latestClaimByPlaceId.get(claim.placeId);
			if (
				!prev ||
				Date.parse(claim.submittedAt) > Date.parse(prev.submittedAt)
			) {
				latestClaimByPlaceId.set(claim.placeId, claim);
			}
		}

		const entries: OwnerBusinessEntry[] = [];
		const seenPlaceIds = new Set<string>();

		for (const place of places) {
			const isOwned =
				place.ownerId === currentUser.id ||
				(Boolean(currentUser.claimedPlaceId) &&
					place.id === currentUser.claimedPlaceId);
			if (!isOwned) continue;
			seenPlaceIds.add(place.id);
			entries.push({
				place,
				approvalStatus: "approved",
				claim: latestClaimByPlaceId.get(place.id),
			});
		}

		for (const [placeId, claim] of latestClaimByPlaceId.entries()) {
			if (seenPlaceIds.has(placeId)) continue;
			const place = places.find((p) => p.id === placeId);
			if (!place) continue;
			seenPlaceIds.add(placeId);
			entries.push({
				place,
				approvalStatus: claim.status,
				claim,
			});
		}

		return entries;
	}, [places, claims, currentUser]);

	const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");

	useEffect(() => {
		if (ownerBusinesses.length === 0) {
			if (selectedPlaceId !== "") setSelectedPlaceId("");
			return;
		}
		if (!ownerBusinesses.some((item) => item.place.id === selectedPlaceId)) {
			setSelectedPlaceId(ownerBusinesses[0].place.id);
		}
	}, [ownerBusinesses, selectedPlaceId]);

	const selectedEntry =
		ownerBusinesses.find((item) => item.place.id === selectedPlaceId) ??
		ownerBusinesses[0];

	const hasAnyApproved = ownerBusinesses.some(
		(item) => item.approvalStatus === "approved",
	);

	if (
		(currentUser.role !== "owner" && ownerBusinesses.length === 0) ||
		!selectedEntry
	) {
		return (
			<div className="mx-auto max-w-lg py-12 pb-8">
				<section className="rounded-[12px] border border-border bg-card p-6 sm:p-8 text-center space-y-4">
					<span className="mx-auto flex size-11 items-center justify-center rounded-full bg-yellow-soft text-yellow-text">
						<Lock className="size-5" aria-hidden="true" />
					</span>
					<div className="space-y-1">
						<h1 className="text-xl font-bold text-foreground">
							Kelola Profil Usahamu
						</h1>
						<p className="text-sm text-muted-foreground">
							Ajukan klaim usaha terlebih dahulu agar dapat mengelola profil dan
							membalas ulasan.
						</p>
					</div>

					<div className="flex flex-wrap justify-center gap-2.5 pt-1">
						<Button asChild>
							<Link to="/explore">
								<Compass className="size-4" aria-hidden="true" />
								Cari Usaha di Jelajah
							</Link>
						</Button>
						<Button
							variant="outline"
							onClick={() => switchDemoAccount("usr-owner")}
						>
							Coba sebagai Pemilik
						</Button>
					</div>
				</section>
			</div>
		);
	}

	const ownedPlace = selectedEntry.place;
	const isApproved =
		selectedEntry.approvalStatus === "approved" &&
		(currentUser.role === "owner" || hasAnyApproved);

	return (
		<div className="space-y-6 pb-8">
			<header className="space-y-4 border-b border-border pb-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="space-y-1">
						<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
							Usahamu
						</h1>
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<MapPin className="size-3.5 text-primary" aria-hidden="true" />
							<span>
								{ownedPlace.category} · {ownedPlace.district}
							</span>
						</p>
					</div>

					<Button asChild variant="outline" size="sm">
						<Link to={`/places/${ownedPlace.slug}`}>
							Lihat Halaman Publik
							<ExternalLink className="size-3.5" aria-hidden="true" />
						</Link>
					</Button>
				</div>

				<div className="flex flex-wrap items-center gap-2.5">
					<div className="min-w-[220px] flex-1 sm:max-w-sm">
						<Select value={ownedPlace.id} onValueChange={setSelectedPlaceId}>
							<SelectTrigger id={businessSelectId} aria-label="Pilih usaha">
								<SelectValue placeholder="Pilih usaha" />
							</SelectTrigger>
							<SelectContent>
								{ownerBusinesses.map((entry) => (
									<SelectItem key={entry.place.id} value={entry.place.id}>
										{entry.place.name} · {APPROVAL_LABELS[entry.approvalStatus]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<ApprovalStatusBadge status={selectedEntry.approvalStatus} />
				</div>
			</header>

			{isApproved ? (
				<>
					<section
						aria-label="Ringkasan performa usaha"
						className="grid grid-cols-1 gap-4 border-b border-border pb-5 sm:grid-cols-3 sm:gap-8"
					>
						<div className="space-y-0.5">
							<p className="text-xs font-medium text-muted-foreground">
								Rating
							</p>
							<p className="flex items-baseline gap-2 text-2xl font-bold text-foreground tabular-nums">
								<span className="inline-flex items-center gap-1.5">
									<Star
										className="size-4 fill-accent-yellow text-accent-yellow"
										aria-hidden="true"
									/>
									{ownedPlace.averageRating.toFixed(2)}
								</span>
								<span className="text-xs font-normal text-muted-foreground">
									({ownedPlace.reviewCount} ulasan ·{" "}
									{ownedPlace.views.toLocaleString("id-ID")} dilihat)
								</span>
							</p>
						</div>

						<div className="space-y-0.5">
							<p className="text-xs font-medium text-muted-foreground">
								Explore Score
							</p>
							<p className="text-2xl font-bold text-foreground tabular-nums">
								{ownedPlace.exploreScore.toFixed(3)}
							</p>
						</div>

						<div className="space-y-0.5">
							<p className="text-xs font-medium text-muted-foreground">
								Hidden Gem
							</p>
							<p className="text-lg font-bold text-foreground tabular-nums">
								{ownedPlace.hiddenGemEligible
									? `${ownedPlace.hiddenGemScore.toFixed(2)}`
									: "Belum memenuhi syarat"}
							</p>
						</div>
					</section>

					<div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
						<OwnerProfileForm
							key={ownedPlace.id}
							place={ownedPlace}
							onSave={(updates) => updatePlaceProfile(ownedPlace.id, updates)}
						/>
						<OwnerReviewsPanel
							key={ownedPlace.id}
							place={ownedPlace}
							onReplyToReview={replyToReview}
						/>
					</div>
				</>
			) : (
				<section className="rounded-[12px] border border-border bg-card p-6 space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="text-base font-bold text-foreground">
							{selectedEntry.approvalStatus === "rejected"
								? "Klaim Ditolak"
								: "Menunggu Persetujuan Admin"}
						</h2>
						<ApprovalStatusBadge status={selectedEntry.approvalStatus} />
					</div>
					<p className="text-sm text-muted-foreground">
						{selectedEntry.approvalStatus === "rejected"
							? "Pengajuan klaim untuk usaha ini belum disetujui."
							: "Pengelolaan profil aktif setelah klaim disetujui admin."}
					</p>
					{selectedEntry.claim?.adminNote ? (
						<div className="rounded-[8px] bg-background px-3 py-2.5 space-y-0.5 dark:bg-muted">
							<p className="text-[11px] font-semibold text-primary-hover">
								Catatan Admin
							</p>
							<p className="text-xs text-muted-foreground leading-relaxed">
								{selectedEntry.claim.adminNote}
							</p>
						</div>
					) : null}
					<div className="flex flex-wrap gap-2.5 pt-1">
						<Button asChild variant="outline" size="sm">
							<Link to={`/claim?placeId=${ownedPlace.id}`}>Status Klaim</Link>
						</Button>
						<Button asChild variant="secondary" size="sm">
							<Link to={`/places/${ownedPlace.slug}`}>Lihat Tempat</Link>
						</Button>
					</div>
				</section>
			)}
		</div>
	);
}
