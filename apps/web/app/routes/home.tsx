import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { CategoryDistrictDirectory } from "~/components/home/category-district-directory";
import { HomeEmptyState, HomeSkeleton } from "~/components/home/home-states";
import { HorizontalPlaceShelf } from "~/components/home/horizontal-place-shelf";
import {
	LatestUpdatesSection,
	type UpdateFeedEntry,
} from "~/components/home/latest-updates-section";
import { PopularSpotlight } from "~/components/home/popular-spotlight";
import { useDarasa } from "~/context/darasa-store";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Home | Darasa" },
		{
			name: "description",
			content:
				"Beranda Darasa: kuliner populer Batang, pembaruan ulasan terbaru, hidden gem, tempat baru ditambahkan, serta direktori kategori dan kawasan.",
		},
	];
}

export default function HomePage() {
	const {
		places,
		hydrated,
		isBookmarked,
		toggleBookmark,
		setExploreFilters,
		resetExploreFilters,
		resetPrototypeData,
	} = useDarasa();
	const navigate = useNavigate();

	const popularSpotlightPlaces = useMemo(
		() =>
			[...places]
				.sort(
					(a, b) =>
						b.reviewCount - a.reviewCount ||
						b.averageRating - a.averageRating ||
						b.exploreScore - a.exploreScore,
				)
				.slice(0, 5),
		[places],
	);

	const newestPlaces = useMemo(
		() =>
			[...places].sort(
				(a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
			),
		[places],
	);

	const hiddenGemPlaces = useMemo(
		() =>
			[...places]
				.filter((p) => p.hiddenGemEligible)
				.sort((a, b) => b.hiddenGemScore - a.hiddenGemScore),
		[places],
	);

	const updateEntries = useMemo<UpdateFeedEntry[]>(() => {
		const entries: UpdateFeedEntry[] = [];

		for (const place of places) {
			const latestReview = place.reviews[0];
			if (latestReview) {
				entries.push({
					id: `rev-${latestReview.id}`,
					kind: "review",
					place,
					title: place.name,
					snippet: latestReview.comment,
					actorName: latestReview.authorName,
					rating: latestReview.rating,
					timestamp: latestReview.createdAt,
				});
			} else {
				entries.push({
					id: `plc-${place.id}`,
					kind: "place",
					place,
					title: place.name,
					snippet: place.description,
					actorName: place.submittedByName,
					timestamp: place.createdAt,
				});
			}
		}

		entries.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
		return entries.slice(0, 9);
	}, [places]);

	const openExploreWith = useCallback(
		(preset: Parameters<typeof setExploreFilters>[0]) => {
			resetExploreFilters();
			setExploreFilters(preset);
			navigate("/explore");
		},
		[navigate, resetExploreFilters, setExploreFilters],
	);

	if (!hydrated) {
		return <HomeSkeleton />;
	}

	if (!Array.isArray(places) || places.length === 0) {
		return <HomeEmptyState onResetData={resetPrototypeData} />;
	}

	return (
		<div className="space-y-10 pb-8">
			<PopularSpotlight
				places={popularSpotlightPlaces}
				hydrated={hydrated}
				isBookmarked={isBookmarked}
				onToggleBookmark={toggleBookmark}
			/>

			<LatestUpdatesSection
				entries={updateEntries}
				onViewAll={() => openExploreWith({ sortBy: "newest" })}
			/>

			<HorizontalPlaceShelf
				headingId="home-hidden-gem-heading"
				title="Hidden Gem Batang"
				items={hiddenGemPlaces}
				mode="hidden-gem"
				viewAllTo="/hidden-gem"
				viewAllLabel="Semua Hidden Gems"
				isBookmarked={isBookmarked}
				onToggleBookmark={toggleBookmark}
			/>

			<HorizontalPlaceShelf
				headingId="home-newest-heading"
				title="Baru Ditambahkan"
				items={newestPlaces}
				mode="newest"
				onViewAll={() => openExploreWith({ sortBy: "newest" })}
				viewAllLabel="Semua Tempat Terbaru"
				isBookmarked={isBookmarked}
				onToggleBookmark={toggleBookmark}
			/>

			<CategoryDistrictDirectory
				places={places}
				onSelectFilter={openExploreWith}
			/>
		</div>
	);
}
