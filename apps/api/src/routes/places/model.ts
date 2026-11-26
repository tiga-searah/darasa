import { t } from "elysia";

export const PlaceSort = t.Union([
	t.Literal("explore"),
	t.Literal("newest"),
	t.Literal("rating"),
	t.Literal("nearby"),
]);

export const PlaceVerified = t.Union([
	t.Literal("community"),
	t.Literal("owner"),
	t.Literal("any"),
]);

export const PlaceListQuery = t.Object({
	q: t.Optional(t.String()),
	category: t.Optional(t.String()),
	sort: t.Optional(PlaceSort),
	lat: t.Optional(t.Numeric({ minimum: -90, maximum: 90 })),
	lng: t.Optional(t.Numeric({ minimum: -180, maximum: 180 })),
	radiusKm: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
	verified: t.Optional(PlaceVerified),
	page: t.Optional(t.Numeric({ minimum: 1 })),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
});

export type PlaceListQueryType = {
	q?: string;
	category?: string;
	sort?: "explore" | "newest" | "rating" | "nearby";
	lat?: number;
	lng?: number;
	radiusKm?: number;
	verified?: "community" | "owner" | "any";
	page?: number;
	limit?: number;
};

export const HiddenGemsQuery = t.Object({
	category: t.Optional(t.String()),
	page: t.Optional(t.Numeric({ minimum: 1 })),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
});

export type HiddenGemsQueryType = {
	category?: string;
	page?: number;
	limit?: number;
};

export const CategorySummary = t.Object({
	id: t.String(),
	name: t.String(),
	slug: t.String(),
	icon: t.Nullable(t.String()),
});

export const PlaceListItem = t.Object({
	id: t.String(),
	slug: t.String(),
	name: t.String(),
	category: CategorySummary,
	address: t.Nullable(t.String()),
	latitude: t.Number(),
	longitude: t.Number(),
	coverUrl: t.Nullable(t.String()),
	status: t.String(),
	communityVerified: t.Boolean(),
	ownerVerified: t.Boolean(),
	ratingAvg: t.Number(),
	reviewCount: t.Number(),
	exploreScore: t.Number(),
	hiddenGemScore: t.Number(),
	distanceKm: t.Nullable(t.Number()),
});

export type PlaceListItemType = {
	id: string;
	slug: string;
	name: string;
	category: { id: string; name: string; slug: string; icon: string | null };
	address: string | null;
	latitude: number;
	longitude: number;
	coverUrl: string | null;
	status: string;
	communityVerified: boolean;
	ownerVerified: boolean;
	ratingAvg: number;
	reviewCount: number;
	exploreScore: number;
	hiddenGemScore: number;
	distanceKm: number | null;
};

export const PlacePhotoItem = t.Object({
	id: t.String(),
	mediaId: t.String(),
	url: t.String(),
	sortOrder: t.Number(),
});

export const PlaceDetail = t.Object({
	id: t.String(),
	slug: t.String(),
	name: t.String(),
	category: CategorySummary,
	description: t.Nullable(t.String()),
	address: t.Nullable(t.String()),
	latitude: t.Number(),
	longitude: t.Number(),
	phone: t.Nullable(t.String()),
	openingHours: t.Nullable(t.Any()),
	coverMediaId: t.Nullable(t.String()),
	coverUrl: t.Nullable(t.String()),
	photos: t.Array(PlacePhotoItem),
	status: t.String(),
	communityVerified: t.Boolean(),
	ownerVerified: t.Boolean(),
	ratingAvg: t.Number(),
	reviewCount: t.Number(),
	exploreScore: t.Number(),
	hiddenGemScore: t.Number(),
	createdAt: t.String(),
	updatedAt: t.String(),
});

export type PlaceDetailType = {
	id: string;
	slug: string;
	name: string;
	category: { id: string; name: string; slug: string; icon: string | null };
	description: string | null;
	address: string | null;
	latitude: number;
	longitude: number;
	phone: string | null;
	openingHours: unknown;
	coverMediaId: string | null;
	coverUrl: string | null;
	photos: { id: string; mediaId: string; url: string; sortOrder: number }[];
	status: string;
	communityVerified: boolean;
	ownerVerified: boolean;
	ratingAvg: number;
	reviewCount: number;
	exploreScore: number;
	hiddenGemScore: number;
	createdAt: string;
	updatedAt: string;
};

export const PaginatedPlacesResponse = t.Object({
	data: t.Array(PlaceListItem),
	meta: t.Object({
		page: t.Number(),
		limit: t.Number(),
		total: t.Number(),
		totalPages: t.Number(),
	}),
});

export const PlaceDetailResponse = t.Object({
	data: PlaceDetail,
});
