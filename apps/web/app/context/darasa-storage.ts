import {
	DEMO_ACCOUNTS,
	INITIAL_CLAIMS,
	INITIAL_PLACES,
	INITIAL_REVIEWS,
	PLACE_CATEGORIES,
} from "~/data/batang-places";
import type { PlaceCategory } from "~/lib/types";
import type { PersistedState } from "./darasa-types";

export const STORAGE_KEY = "darasa_prototype_state_v1";

const LEGACY_CATEGORY_MAP: Record<string, PlaceCategory> = {
	"Masakan Tradisional": "Makanan berat",
	"Kuliner Pesisir": "Makanan berat",
	"Warung Pekerja": "Makanan berat",
	"Kopi & Kafe": "Minuman",
	"Bakso & Mie": "Street food",
	"Jajanan & Oleh-oleh": "Dessert",
};

const INITIAL_PHOTOS_BY_ID = new Map(
	INITIAL_PLACES.map((place) => [place.id, place.photos]),
);

export const DEFAULT_STATE: PersistedState = {
	places: INITIAL_PLACES,
	reviews: INITIAL_REVIEWS,
	claims: INITIAL_CLAIMS,
	accounts: DEMO_ACCOUNTS,
	currentUserId: "usr-visitor",
	anomalyOverrides: {},
	bookmarkedPlaceIds: [],
	likedReviewIds: [],
	contributions: [],
};

export function normalizeCategory(value: unknown): PlaceCategory {
	if (
		typeof value === "string" &&
		PLACE_CATEGORIES.includes(value as PlaceCategory)
	) {
		return value as PlaceCategory;
	}
	if (typeof value === "string" && value in LEGACY_CATEGORY_MAP) {
		return LEGACY_CATEGORY_MAP[value];
	}
	return "Makanan berat";
}

export function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "kuliner-batang"
	);
}

export function loadPersistedState(): PersistedState | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<PersistedState>;
		if (!Array.isArray(parsed.places) || !Array.isArray(parsed.reviews)) {
			return null;
		}
		const existingPlaceIds = new Set(parsed.places.map((p) => p.id));
		const missingSeedPlaces = INITIAL_PLACES.filter(
			(p) => !existingPlaceIds.has(p.id),
		);
		const existingReviewIds = new Set(parsed.reviews.map((r) => r.id));
		const missingSeedReviews = INITIAL_REVIEWS.filter(
			(r) => !existingReviewIds.has(r.id),
		);
		return {
			places: [
				...parsed.places.map((place) => {
					const seedPhotos = INITIAL_PHOTOS_BY_ID.get(place.id);
					const customPhotos = Array.isArray(place.photos)
						? place.photos.filter((src) => !src.endsWith(".svg"))
						: [];
					const photos =
						seedPhotos && place.isPrototypeSample
							? Array.from(new Set([...customPhotos, ...seedPhotos]))
							: place.photos;
					return {
						...place,
						category: normalizeCategory(place.category),
						photos,
						views:
							typeof place.views === "number" &&
							Number.isFinite(place.views) &&
							place.views >= 0
								? place.views
								: (INITIAL_PLACES.find((ip) => ip.id === place.id)?.views ?? 0),
					};
				}),
				...missingSeedPlaces,
			],
			reviews: [...parsed.reviews, ...missingSeedReviews],
			claims: Array.isArray(parsed.claims) ? parsed.claims : INITIAL_CLAIMS,
			accounts: Array.isArray(parsed.accounts)
				? parsed.accounts
				: DEMO_ACCOUNTS,
			currentUserId:
				typeof parsed.currentUserId === "string"
					? parsed.currentUserId
					: "usr-visitor",
			anomalyOverrides: parsed.anomalyOverrides ?? {},
			bookmarkedPlaceIds: Array.isArray(parsed.bookmarkedPlaceIds)
				? parsed.bookmarkedPlaceIds
				: [],
			likedReviewIds: Array.isArray(parsed.likedReviewIds)
				? parsed.likedReviewIds
				: [],
			contributions: Array.isArray(parsed.contributions)
				? parsed.contributions
				: [],
		};
	} catch {
		return null;
	}
}

export function savePersistedState(state: PersistedState): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Ignore quota errors in restricted browsers
	}
}

export function clearPersistedState(): void {
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Ignore
	}
}

export function getDeterministicBaseLikes(reviewId: string): number {
	let hash = 0;
	for (let i = 0; i < reviewId.length; i++) {
		hash = (hash * 31 + reviewId.charCodeAt(i)) % 17;
	}
	return reviewId.startsWith("rev-") && reviewId.length > 10
		? 0
		: (hash % 8) + 1;
}
