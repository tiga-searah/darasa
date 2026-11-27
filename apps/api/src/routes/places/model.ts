import { t } from "elysia";

export const PlaceSort = t.Union([
	t.Literal("explore"),
	t.Literal("newest"),
	t.Literal("rating"),
	t.Literal("nearby"),
	t.Literal("reviews"),
	t.Literal("views"),
	t.Literal("az"),
	t.Literal("za"),
]);

export const PlaceVerified = t.Union([
	t.Literal("community"),
	t.Literal("owner"),
	t.Literal("any"),
	t.Literal("unverified"),
]);

export const PriceTierSchema = t.Union([
	t.Literal("under_25k"),
	t.Literal("25k_50k"),
	t.Literal("50k_100k"),
	t.Literal("over_100k"),
]);

export const PlaceListQuery = t.Object({
	q: t.Optional(t.String({ maxLength: 80 })),
	category: t.Optional(t.String()),
	district: t.Optional(t.String({ maxLength: 100 })),
	minRating: t.Optional(t.Numeric({ minimum: 0, maximum: 5 })),
	priceTier: t.Optional(PriceTierSchema),
	onlyHiddenGem: t.Optional(t.BooleanString()),
	onlyBookmarked: t.Optional(t.BooleanString()),
	sort: t.Optional(PlaceSort),
	lat: t.Optional(t.Numeric({ minimum: -90, maximum: 90 })),
	lng: t.Optional(t.Numeric({ minimum: -180, maximum: 180 })),
	radiusKm: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
	verified: t.Optional(PlaceVerified),
	page: t.Optional(t.Integer({ minimum: 1 })),
	limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
});

export type PlaceListQueryType = {
	q?: string;
	category?: string;
	district?: string;
	minRating?: number;
	priceTier?: "under_25k" | "25k_50k" | "50k_100k" | "over_100k";
	onlyHiddenGem?: boolean;
	onlyBookmarked?: boolean;
	sort?:
		| "explore"
		| "newest"
		| "rating"
		| "nearby"
		| "reviews"
		| "views"
		| "az"
		| "za";
	lat?: number;
	lng?: number;
	radiusKm?: number;
	verified?: "community" | "owner" | "any" | "unverified";
	page?: number;
	limit?: number;
};

export const HiddenGemsQuery = t.Object({
	category: t.Optional(t.String()),
	district: t.Optional(t.String({ maxLength: 100 })),
	verified: t.Optional(PlaceVerified),
	page: t.Optional(t.Integer({ minimum: 1 })),
	limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
});

export type HiddenGemsQueryType = {
	category?: string;
	district?: string;
	verified?: "community" | "owner" | "any" | "unverified";
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
	district: t.Nullable(t.String()),
	priceRange: t.Nullable(t.String()),
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
	views: t.Number(),
	bookmarked: t.Boolean(),
	distanceKm: t.Nullable(t.Number()),
	lastReviewAt: t.Nullable(t.String()),
});

export type PlaceListItemType = {
	id: string;
	slug: string;
	name: string;
	category: { id: string; name: string; slug: string; icon: string | null };
	address: string | null;
	district: string | null;
	priceRange: string | null;
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
	views: number;
	bookmarked: boolean;
	distanceKm: number | null;
	lastReviewAt: string | null;
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
	district: t.Nullable(t.String()),
	priceRange: t.Nullable(t.String()),
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
	views: t.Number(),
	bookmarked: t.Boolean(),
	createdByName: t.Nullable(t.String()),
	ownerId: t.Nullable(t.String()),
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
	district: string | null;
	priceRange: string | null;
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
	views: number;
	bookmarked: boolean;
	createdByName: string | null;
	ownerId: string | null;
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

const OpeningHoursSlot = t.Union([
	t.Object({ open: t.String(), close: t.String() }),
	t.Null(),
]);

export const OpeningHoursSchema = t.Partial(
	t.Object({
		mon: OpeningHoursSlot,
		tue: OpeningHoursSlot,
		wed: OpeningHoursSlot,
		thu: OpeningHoursSlot,
		fri: OpeningHoursSlot,
		sat: OpeningHoursSlot,
		sun: OpeningHoursSlot,
	}),
);

const OpeningHoursInput = t.Union([
	OpeningHoursSchema,
	t.String({ maxLength: 500 }),
]);

export const CreatePlaceBody = t.Object({
	name: t.String({ minLength: 2, maxLength: 160 }),
	categoryId: t.String({ format: "uuid" }),
	latitude: t.Number({ minimum: -90, maximum: 90 }),
	longitude: t.Number({ minimum: -180, maximum: 180 }),
	address: t.Optional(t.String({ maxLength: 500 })),
	district: t.Optional(t.String({ maxLength: 100 })),
	description: t.Optional(t.String({ maxLength: 5000 })),
	phone: t.Optional(t.String({ maxLength: 40 })),
	priceRange: t.Optional(t.String({ maxLength: 100 })),
	openingHours: t.Optional(OpeningHoursInput),
	photoMediaIds: t.Optional(
		t.Array(t.String({ format: "uuid" }), { maxItems: 5, uniqueItems: true }),
	),
});

export type CreatePlaceBodyType = {
	name: string;
	categoryId: string;
	latitude: number;
	longitude: number;
	address?: string;
	district?: string;
	description?: string;
	phone?: string;
	priceRange?: string;
	openingHours?:
		| {
				mon?: { open: string; close: string } | null;
				tue?: { open: string; close: string } | null;
				wed?: { open: string; close: string } | null;
				thu?: { open: string; close: string } | null;
				fri?: { open: string; close: string } | null;
				sat?: { open: string; close: string } | null;
				sun?: { open: string; close: string } | null;
		  }
		| string;
	photoMediaIds?: string[];
};

export const AddPlacePhotosBody = t.Object({
	photoMediaIds: t.Array(t.String({ format: "uuid" }), {
		minItems: 1,
		maxItems: 5,
		uniqueItems: true,
	}),
});

export const AddPlacePhotosResponse = t.Object({
	data: t.Array(PlacePhotoItem),
});

export const AdminUpdatePlaceBody = t.Object({
	name: t.Optional(t.String({ minLength: 2, maxLength: 160 })),
	categoryId: t.Optional(t.String({ format: "uuid" })),
	latitude: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
	longitude: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
	address: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
	district: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
	description: t.Optional(t.Nullable(t.String({ maxLength: 5000 }))),
	phone: t.Optional(t.Nullable(t.String({ maxLength: 40 }))),
	priceRange: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
	openingHours: t.Optional(t.Nullable(OpeningHoursInput)),
	coverMediaId: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
	status: t.Optional(
		t.Union([
			t.Literal("pending"),
			t.Literal("published"),
			t.Literal("rejected"),
			t.Literal("archived"),
		]),
	),
});

export type AdminUpdatePlaceBodyType = {
	name?: string;
	categoryId?: string;
	latitude?: number;
	longitude?: number;
	address?: string | null;
	district?: string | null;
	description?: string | null;
	phone?: string | null;
	priceRange?: string | null;
	openingHours?: CreatePlaceBodyType["openingHours"] | null;
	coverMediaId?: string | null;
	status?: "pending" | "published" | "rejected" | "archived";
};
