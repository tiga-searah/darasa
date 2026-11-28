import type { calculateExploreScore } from "~/lib/scoring";
import type {
	AnomalyFlag,
	AnomalyResolution,
	BatangDistrict,
	BusinessClaim,
	CulinaryPlace,
	PlaceCategory,
	ReviewItem,
	UserAccount,
	VerificationStatus,
} from "~/lib/types";

export type ExploreSortOption =
	| "explore"
	| "rating"
	| "reviews"
	| "views"
	| "newest"
	| "az"
	| "za";
export type ExploreViewMode = "grid" | "list";
export type ExploreMinRating =
	| "all"
	| "2.0"
	| "2.5"
	| "3.0"
	| "3.5"
	| "4.0"
	| "4.5";
export type ExplorePriceTier =
	| "all"
	| "under_25k"
	| "25k_50k"
	| "50k_100k"
	| "over_100k";

export interface ExploreFilters {
	keyword: string;
	category: PlaceCategory | "all";
	district: BatangDistrict | "all";
	verification: VerificationStatus | "all";
	minRating: ExploreMinRating;
	priceTier: ExplorePriceTier;
	onlyHiddenGem: boolean;
	onlyBookmarked: boolean;
	sortBy: ExploreSortOption;
	viewMode: ExploreViewMode;
}

export const DEFAULT_EXPLORE_FILTERS: ExploreFilters = {
	keyword: "",
	category: "all",
	district: "all",
	verification: "all",
	minRating: "all",
	priceTier: "all",
	onlyHiddenGem: false,
	onlyBookmarked: false,
	sortBy: "explore",
	viewMode: "grid",
};

export interface ContributionActivity {
	id: string;
	userId: string;
	type: "place" | "review" | "photo" | "edit";
	placeId: string;
	placeName: string;
	summary: string;
	createdAt: string;
}

export interface PersistedState {
	places: CulinaryPlace[];
	reviews: ReviewItem[];
	claims: BusinessClaim[];
	accounts: UserAccount[];
	currentUserId: string;
	anomalyOverrides: Record<string, AnomalyResolution>;
	bookmarkedPlaceIds: string[];
	likedReviewIds: string[];
	contributions: ContributionActivity[];
}

export interface PlaceWithMetrics extends CulinaryPlace {
	reviews: ReviewItem[];
	averageRating: number;
	reviewCount: number;
	exploreScore: number;
	exploreBreakdown: ReturnType<typeof calculateExploreScore>;
	hiddenGemEligible: boolean;
	hiddenGemScore: number;
}

export interface ToastNotification {
	id: number;
	message: string;
	tone: "success" | "info";
}

export interface DarasaContextValue {
	hydrated: boolean;
	currentUser: UserAccount;
	accounts: UserAccount[];
	places: PlaceWithMetrics[];
	claims: BusinessClaim[];
	anomalies: AnomalyFlag[];
	bookmarkedPlaceIds: string[];
	contributions: ContributionActivity[];
	toast: ToastNotification | null;
	exploreFilters: ExploreFilters;
	setExploreFilters: (
		updater:
			| Partial<ExploreFilters>
			| ((prev: ExploreFilters) => ExploreFilters),
	) => void;
	resetExploreFilters: () => void;
	isBookmarked: (placeId: string) => boolean;
	toggleBookmark: (placeId: string) => void;
	isReviewLiked: (reviewId: string) => boolean;
	toggleReviewLike: (reviewId: string) => void;
	getReviewLikeCount: (reviewId: string) => number;
	notify: (message: string, tone?: "success" | "info") => void;
	dismissToast: () => void;
	loginWithCredentials: (
		email: string,
		password: string,
	) => { ok: true; user: UserAccount } | { ok: false; error: string };
	loginWithGoogle: (input: {
		name: string;
		email: string;
		accountId?: string;
	}) => UserAccount;
	registerAccount: (
		name: string,
		email: string,
		password: string,
	) => { ok: true; user: UserAccount } | { ok: false; error: string };
	switchDemoAccount: (userId: string) => void;
	logout: () => void;
	submitPlace: (
		input: Omit<
			CulinaryPlace,
			| "id"
			| "slug"
			| "views"
			| "verificationStatus"
			| "submittedByUserId"
			| "submittedByName"
			| "createdAt"
			| "isPendingModeration"
		>,
	) => CulinaryPlace;
	recordPlaceView: (placeId: string) => void;
	submitReview: (input: {
		placeId: string;
		rating: number;
		comment: string;
	}) => ReviewItem;
	deleteReview: (reviewId: string) => void;
	submitClaim: (input: {
		placeId: string;
		businessRole: string;
		whatsappNumber: string;
		evidenceSummary: string;
		evidenceFileName: string;
		evidenceFileUrl?: string;
	}) => BusinessClaim;
	reviewClaim: (
		claimId: string,
		decision: "approved" | "rejected",
		adminNote?: string,
	) => void;
	updatePlaceProfile: (
		placeId: string,
		updates: Partial<
			Pick<
				CulinaryPlace,
				| "name"
				| "address"
				| "openingHours"
				| "priceRange"
				| "phone"
				| "description"
				| "category"
				| "district"
			>
		>,
	) => void;
	addPlacePhoto: (placeId: string, photoUrl: string) => void;
	suggestPlaceUpdate: (
		placeId: string,
		updates: Partial<
			Pick<
				CulinaryPlace,
				"address" | "openingHours" | "priceRange" | "phone" | "description"
			>
		>,
		note?: string,
	) => void;
	replyToReview: (reviewId: string, message: string) => void;
	setPlaceVerification: (
		placeId: string,
		status: VerificationStatus,
		approvePending?: boolean,
	) => void;
	resolveAnomalyFlag: (flagId: string, resolution: AnomalyResolution) => void;
	resetPrototypeData: () => void;
}
