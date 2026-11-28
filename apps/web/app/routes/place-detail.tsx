import { ArrowLeft, Bookmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { BatangMapPreview } from "~/components/batang-map-preview";
import { PlacePhotoGallery } from "~/components/place-detail/place-photo-gallery";
import { PlaceRatingSummary } from "~/components/place-detail/place-rating-summary";
import { PlaceReviewList } from "~/components/place-detail/place-review-list";
import { PlaceSummaryInfo } from "~/components/place-detail/place-summary-info";
import { WriteReviewDialog } from "~/components/place-detail/write-review-dialog";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useDarasa } from "~/context/darasa-store";
import { INITIAL_PLACES } from "~/data/batang-places";
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
		deleteReview,
		isBookmarked,
		toggleBookmark,
		isReviewLiked,
		toggleReviewLike,
		getReviewLikeCount,
	} = useDarasa();
	const place = places.find((p) => p.slug === slug);
	const recordedPlaceIdRef = useRef<string | null>(null);

	const [ratingFilter, setRatingFilter] = useState<number | null>(null);
	const [reviewModalOpen, setReviewModalOpen] = useState(false);
	const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

	useEffect(() => {
		if (place) {
			document.title = `${place.name} | Darasa`;
		}
	}, [place]);

	useEffect(() => {
		if (place?.id) {
			setRatingFilter(null);
		}
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
				<Button asChild size="lg" className="text-base">
					<Link to="/explore">
						<ArrowLeft className="size-5" aria-hidden="true" />
						Kembali
					</Link>
				</Button>
			</div>
		);
	}

	const saved = isBookmarked(place.id);
	const hasReviewed = place.reviews.some((r) => r.userId === currentUser.id);

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between gap-3">
				<Link
					to="/explore"
					className="inline-flex min-h-[44px] items-center gap-2.5 rounded-[6px] text-base font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<ArrowLeft className="size-5 shrink-0" aria-hidden="true" />
					<span>Kembali</span>
				</Link>

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

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
				<PlacePhotoGallery
					placeId={place.id}
					placeName={place.name}
					photos={place.photos}
				/>
				<PlaceSummaryInfo
					place={place}
					isVisitor={currentUser.role === "visitor"}
					hasReviewed={hasReviewed}
					onOpenReviewModal={() => {
						if (!hasReviewed) setReviewModalOpen(true);
					}}
				/>
			</div>

			<Separator />

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
				<section className="lg:col-span-7 space-y-6">
					<PlaceRatingSummary
						place={place}
						ratingFilter={ratingFilter}
						onSelectRatingFilter={setRatingFilter}
					/>
					<PlaceReviewList
						key={place.id}
						reviews={place.reviews}
						ratingFilter={ratingFilter}
						onClearFilter={() => setRatingFilter(null)}
						isReviewLiked={isReviewLiked}
						getReviewLikeCount={getReviewLikeCount}
						onToggleReviewLike={toggleReviewLike}
						currentUserId={currentUser.id}
						canDeleteAnyReview={currentUser.role === "admin"}
						onDeleteReview={(reviewId) => {
							deleteReview(reviewId);
							setSubmitSuccess(null);
						}}
					/>
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

			<WriteReviewDialog
				open={reviewModalOpen}
				placeName={place.name}
				onOpenChange={setReviewModalOpen}
				onSubmitReview={({ rating, comment }) => {
					submitReview({
						placeId: place.id,
						rating,
						comment,
					});
					setSubmitSuccess(
						"Ulasan Anda berhasil disimpan dan skor Explore serta Hidden Gem telah diperbarui.",
					);
				}}
			/>
		</div>
	);
}
