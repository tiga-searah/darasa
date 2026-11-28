import type {
	ExploreFilters,
	ExploreMinRating,
	ExplorePriceTier,
	ExploreSortOption,
	PlaceWithMetrics,
} from "~/context/darasa-store";
import type { VerificationStatus } from "~/lib/types";

export const SORT_LABELS: Record<ExploreSortOption, string> = {
	explore: "Explore Score",
	rating: "Rating Tertinggi",
	reviews: "Ulasan Terbanyak",
	views: "Paling Sering Dilihat",
	newest: "Terbaru Ditambahkan",
	az: "Nama A-Z",
	za: "Nama Z-A",
};

export const MIN_RATING_OPTIONS: Array<{
	value: ExploreMinRating;
	label: string;
}> = [
	{ value: "all", label: "Semua Rating" },
	{ value: "2.0", label: "2.0+" },
	{ value: "2.5", label: "2.5+" },
	{ value: "3.0", label: "3.0+" },
	{ value: "3.5", label: "3.5+" },
	{ value: "4.0", label: "4.0+" },
	{ value: "4.5", label: "4.5+" },
];

export const PRICE_TIER_LABELS: Record<
	Exclude<ExplorePriceTier, "all">,
	string
> = {
	under_25k: "< Rp 25.000",
	"25k_50k": "Rp 25.000 - Rp 50.000",
	"50k_100k": "Rp 50.000 - Rp 100.000",
	over_100k: "> Rp 100.000",
};

export const PRICE_TIER_OPTIONS: Array<{
	value: ExplorePriceTier;
	label: string;
}> = [
	{ value: "all", label: "Semua Harga" },
	...(
		Object.entries(PRICE_TIER_LABELS) as Array<
			[Exclude<ExplorePriceTier, "all">, string]
		>
	).map(([value, label]) => ({ value, label })),
];

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
	owner_verified: "Terverifikasi Pemilik",
	community_verified: "Terverifikasi Komunitas",
	unverified: "Belum Terverifikasi",
};

function parsePriceBounds(
	priceRange: string,
): { min: number; max: number } | null {
	const matches = priceRange.match(/\d[\d.]*(?:\s*(?:rb|ribu|k))?/gi);
	if (!matches || matches.length === 0) return null;
	const numbers = matches
		.map((raw) => {
			const hasThousandSuffix = /(?:rb|ribu|k)$/i.test(raw.trim());
			const value = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
			if (Number.isNaN(value)) return Number.NaN;
			return hasThousandSuffix && value < 1000 ? value * 1000 : value;
		})
		.filter((n) => !Number.isNaN(n));
	if (numbers.length === 0) return null;
	return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

export function matchesPriceTier(
	priceRange: string,
	tier: ExplorePriceTier,
): boolean {
	if (tier === "all") return true;
	const bounds = parsePriceBounds(priceRange);
	if (bounds === null) return true;
	switch (tier) {
		case "under_25k":
			return bounds.min <= 25000;
		case "25k_50k":
			return bounds.max > 25000 && bounds.min <= 50000;
		case "50k_100k":
			return bounds.max > 50000 && bounds.min <= 100000;
		case "over_100k":
			return bounds.max > 100000;
	}
}

export function filterAndSortExplorePlaces(
	places: readonly PlaceWithMetrics[],
	filters: ExploreFilters,
	bookmarkedPlaceIds: readonly string[],
): PlaceWithMetrics[] {
	const q = filters.keyword.trim().toLowerCase();
	return places
		.filter((place) => {
			if (q) {
				const haystack =
					`${place.name} ${place.category} ${place.district} ${place.address} ${place.description}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			if (filters.category !== "all" && place.category !== filters.category) {
				return false;
			}
			if (filters.district !== "all" && place.district !== filters.district) {
				return false;
			}
			if (
				filters.verification !== "all" &&
				place.verificationStatus !== filters.verification
			) {
				return false;
			}
			if (filters.minRating !== "all") {
				const threshold = Number.parseFloat(filters.minRating);
				if (place.averageRating < threshold) return false;
			}
			if (!matchesPriceTier(place.priceRange, filters.priceTier)) return false;
			if (filters.onlyHiddenGem && !place.hiddenGemEligible) return false;
			if (filters.onlyBookmarked && !bookmarkedPlaceIds.includes(place.id)) {
				return false;
			}
			return true;
		})
		.sort((a, b) => {
			switch (filters.sortBy) {
				case "rating":
					return (
						b.averageRating - a.averageRating || b.reviewCount - a.reviewCount
					);
				case "reviews":
					return b.reviewCount - a.reviewCount;
				case "views":
					return b.views - a.views || b.reviewCount - a.reviewCount;
				case "newest":
					return Date.parse(b.createdAt) - Date.parse(a.createdAt);
				case "az":
					return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
				case "za":
					return b.name.localeCompare(a.name, "id", { sensitivity: "base" });
				default:
					return b.exploreScore - a.exploreScore;
			}
		});
}
