import { useEffect, useMemo, useState } from "react";
import type { MetaArgs } from "react-router";
import { ContributeSubpageShell } from "~/components/contribute/contribute-subpage-shell";
import { useContributePlaceSelection } from "~/components/contribute/use-contribute-place";
import { WriteReviewForm } from "~/components/contribute/write-review-form";
import { XP_REWARDS } from "~/components/contribute/xp";
import { useDarasa } from "~/context/darasa-store";

export function meta(_args: MetaArgs) {
	return [
		{ title: "Tulis Ulasan | Darasa" },
		{
			name: "description",
			content:
				"Beri rating dan tulis ulasan tentang rasa, porsi, serta suasana tempat kuliner di Kabupaten Batang.",
		},
	];
}

function parseInitialRating(value: string | null): number {
	if (!value) return 5;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 5;
	return Math.min(5, Math.max(1, Math.round(parsed)));
}

export default function ContributeWriteReviewPage() {
	const { currentUser, submitReview } = useDarasa();
	const {
		places,
		searchParams,
		selectedPlaceId,
		setSelectedPlaceId,
		handleRequestAddNewPlace,
		redirectPath,
	} = useContributePlaceSelection("/contribute/write-review");

	const ratingParam = searchParams.get("rating");
	const [rating, setRating] = useState<number>(() =>
		parseInitialRating(ratingParam),
	);

	useEffect(() => {
		setRating(parseInitialRating(ratingParam));
	}, [ratingParam]);

	const suggestedForReview = useMemo(
		() =>
			places
				.filter((p) => !p.reviews.some((r) => r.userId === currentUser.id))
				.slice(0, 3),
		[places, currentUser.id],
	);

	return (
		<ContributeSubpageShell
			title="Tulis Ulasan"
			description="Beri bintang dan ceritakan rasa, porsi, serta pengalaman Anda berkunjung."
			xpReward={XP_REWARDS.review}
			redirectPath={redirectPath}
		>
			<WriteReviewForm
				places={places}
				selectedPlaceId={selectedPlaceId}
				onSelectPlace={setSelectedPlaceId}
				rating={rating}
				onChangeRating={setRating}
				suggestedPlaces={suggestedForReview}
				onSubmitReview={submitReview}
				onRequestAddNewPlace={handleRequestAddNewPlace}
			/>
		</ContributeSubpageShell>
	);
}
