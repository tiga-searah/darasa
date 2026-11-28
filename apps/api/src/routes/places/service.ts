import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import type { OpeningHours } from "../../database/schema/places";
import type { Storage } from "../../lib/ports";
import { type PriceTier, parsePriceBounds } from "../../lib/price";
import type { DbOrTx } from "../../lib/ranking";
import type { SessionUser } from "../../lib/session";
import {
	ApiError,
	conflict,
	forbidden,
	notFound,
	paginationMeta,
	toJakartaDayInt,
	UUID_RE,
} from "../../utils";
import {
	assertOwnedReadyMedia,
	resolveMediaUrl,
	resolveMediaUrlMap,
} from "../media/service";
import type {
	AdminUpdatePlaceBodyType,
	CreatePlaceBodyType,
	HiddenGemsQueryType,
	PlaceDetailType,
	PlaceListItemType,
	PlaceListQueryType,
} from "./model";

type VerifiedFilter = "community" | "owner" | "any" | "unverified";
type PlaceSortKey = NonNullable<PlaceListQueryType["sort"]>;

function haversineSql(lat: number, lng: number) {
	return sql<number>`(6371 * acos(least(1.0, greatest(-1.0, cos(radians(${lat})) * cos(radians(${schema.places.latitude})) * cos(radians(${schema.places.longitude}) - radians(${lng})) + sin(radians(${lat})) * sin(radians(${schema.places.latitude}))))))`;
}

function verifiedCondition(
	verified: VerifiedFilter | undefined,
): SQL | undefined {
	switch (verified) {
		case "community":
			return eq(schema.places.communityVerified, true);
		case "owner":
			return eq(schema.places.ownerVerified, true);
		case "any":
			return or(
				eq(schema.places.communityVerified, true),
				eq(schema.places.ownerVerified, true),
			);
		case "unverified":
			return and(
				eq(schema.places.communityVerified, false),
				eq(schema.places.ownerVerified, false),
			);
		default:
			return undefined;
	}
}

function priceTierCondition(tier: PriceTier): SQL | undefined {
	const bounds: Record<PriceTier, { minGt?: number; maxLte?: number }> = {
		under_25k: { maxLte: 25000 },
		"25k_50k": { minGt: 25000, maxLte: 50000 },
		"50k_100k": { minGt: 50000, maxLte: 100000 },
		over_100k: { minGt: 100000 },
	};
	const { minGt, maxLte } = bounds[tier];
	const parts: SQL[] = [isNotNull(schema.places.priceMin)];
	if (minGt !== undefined) {
		parts.push(
			isNotNull(schema.places.priceMax),
			gt(schema.places.priceMax, minGt),
		);
	}
	if (maxLte !== undefined) {
		parts.push(lte(schema.places.priceMin, maxLte));
	}
	return and(...parts);
}

function appendSharedPlaceFilters(
	conditions: SQL[],
	query: { category?: string; district?: string; verified?: VerifiedFilter },
): void {
	if (query.category) {
		conditions.push(
			UUID_RE.test(query.category)
				? eq(schema.places.categoryId, query.category)
				: eq(schema.categories.slug, query.category),
		);
	}
	if (query.district && query.district.trim().length > 0) {
		conditions.push(ilike(schema.places.district, query.district.trim()));
	}
	const vCond = verifiedCondition(query.verified);
	if (vCond) conditions.push(vCond);
}

function getPlaceSortOrder(sort: PlaceSortKey, distExpr: SQL<number | null>) {
	switch (sort) {
		case "newest":
			return [desc(schema.places.createdAt), asc(schema.places.id)];
		case "rating":
			return [
				desc(schema.places.ratingAvg),
				desc(schema.places.reviewCount),
				asc(schema.places.id),
			];
		case "nearby":
			return [
				asc(distExpr),
				desc(schema.places.exploreScore),
				asc(schema.places.id),
			];
		case "reviews":
			return [
				desc(schema.places.reviewCount),
				desc(schema.places.ratingAvg),
				asc(schema.places.id),
			];
		case "views":
			return [
				desc(schema.places.viewsTotal),
				desc(schema.places.exploreScore),
				asc(schema.places.id),
			];
		case "az":
			return [asc(schema.places.name), asc(schema.places.id)];
		case "za":
			return [desc(schema.places.name), asc(schema.places.id)];
		default:
			return [
				desc(schema.places.exploreScore),
				desc(schema.places.reviewCount),
				asc(schema.places.id),
			];
	}
}

async function fetchBookmarkedSet(
	viewer: SessionUser | null,
	placeIds: string[],
): Promise<Set<string>> {
	if (!viewer || placeIds.length === 0) return new Set();
	const rows = await db
		.select({ placeId: schema.bookmarks.placeId })
		.from(schema.bookmarks)
		.where(
			and(
				eq(schema.bookmarks.userId, viewer.id),
				inArray(schema.bookmarks.placeId, placeIds),
			),
		);
	return new Set(rows.map((r) => r.placeId));
}

async function hasApprovedClaim(
	tx: DbOrTx,
	placeId: string,
	userId: string,
): Promise<boolean> {
	const [claim] = await tx
		.select({ id: schema.businessClaims.id })
		.from(schema.businessClaims)
		.where(
			and(
				eq(schema.businessClaims.placeId, placeId),
				eq(schema.businessClaims.claimantId, userId),
				eq(schema.businessClaims.status, "approved"),
			),
		)
		.limit(1);
	return Boolean(claim);
}

function placeListColumns(distanceExpr: SQL<number | null>) {
	return {
		id: schema.places.id,
		slug: schema.places.slug,
		name: schema.places.name,
		address: schema.places.address,
		district: schema.places.district,
		priceRange: schema.places.priceRange,
		latitude: schema.places.latitude,
		longitude: schema.places.longitude,
		coverMediaId: schema.places.coverMediaId,
		status: schema.places.status,
		communityVerified: schema.places.communityVerified,
		ownerVerified: schema.places.ownerVerified,
		ratingAvg: schema.places.ratingAvg,
		reviewCount: schema.places.reviewCount,
		exploreScore: schema.places.exploreScore,
		hiddenGemScore: schema.places.hiddenGemScore,
		viewsTotal: schema.places.viewsTotal,
		lastReviewAt: schema.places.lastReviewAt,
		distanceKm: distanceExpr,
		catId: schema.categories.id,
		catName: schema.categories.name,
		catSlug: schema.categories.slug,
		catIcon: schema.categories.icon,
	};
}

type PlaceListRow = {
	id: string;
	slug: string;
	name: string;
	address: string | null;
	district: string | null;
	priceRange: string | null;
	latitude: number;
	longitude: number;
	coverMediaId: string | null;
	status: PlaceListItemType["status"];
	communityVerified: boolean;
	ownerVerified: boolean;
	ratingAvg: number;
	reviewCount: number;
	exploreScore: number;
	hiddenGemScore: number;
	viewsTotal: number;
	lastReviewAt: Date | null;
	distanceKm: number | null;
	catId: string;
	catName: string;
	catSlug: string;
	catIcon: string | null;
};

async function serializePlaceListRows(
	storage: Storage | undefined,
	viewer: SessionUser | null,
	rows: PlaceListRow[],
): Promise<PlaceListItemType[]> {
	const [coverUrls, bookmarkedIds] = await Promise.all([
		resolveMediaUrlMap(
			storage,
			rows.map((r) => r.coverMediaId),
		),
		fetchBookmarkedSet(
			viewer,
			rows.map((r) => r.id),
		),
	]);

	return rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		name: r.name,
		category: {
			id: r.catId,
			name: r.catName,
			slug: r.catSlug,
			icon: r.catIcon,
		},
		address: r.address,
		district: r.district,
		priceRange: r.priceRange,
		latitude: r.latitude,
		longitude: r.longitude,
		coverUrl: r.coverMediaId ? (coverUrls.get(r.coverMediaId) ?? null) : null,
		status: r.status,
		communityVerified: r.communityVerified,
		ownerVerified: r.ownerVerified,
		ratingAvg: r.ratingAvg,
		reviewCount: r.reviewCount,
		exploreScore: r.exploreScore,
		hiddenGemScore: r.hiddenGemScore,
		views: r.viewsTotal,
		bookmarked: bookmarkedIds.has(r.id),
		distanceKm: r.distanceKm ?? null,
		lastReviewAt: r.lastReviewAt ? r.lastReviewAt.toISOString() : null,
	}));
}

export async function listPlaces(
	storage: Storage | undefined,
	query: PlaceListQueryType,
	viewer: SessionUser | null = null,
) {
	const sort = query.sort ?? "explore";
	if (
		sort === "nearby" &&
		(query.lat === undefined || query.lng === undefined)
	) {
		throw new ApiError(
			"VALIDATION_ERROR",
			422,
			"lat and lng are required for nearby sort",
			{ "/lat": "required", "/lng": "required" },
		);
	}
	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const offset = (page - 1) * limit;

	if (query.onlyBookmarked && !viewer) {
		return {
			data: [],
			meta: { page, limit, total: 0, totalPages: 0 },
		};
	}

	const conditions: SQL[] = [eq(schema.places.status, "published")];

	if (query.q && query.q.trim().length > 0) {
		const pattern = `%${query.q.trim()}%`;
		const qCond = or(
			ilike(schema.places.name, pattern),
			ilike(schema.places.description, pattern),
			ilike(schema.places.address, pattern),
			ilike(schema.places.district, pattern),
		);
		if (qCond) conditions.push(qCond);
	}

	appendSharedPlaceFilters(conditions, query);

	if (query.minRating !== undefined) {
		conditions.push(gte(schema.places.ratingAvg, query.minRating));
	}
	if (query.priceTier) {
		const ptCond = priceTierCondition(query.priceTier);
		if (ptCond) conditions.push(ptCond);
	}
	if (query.onlyHiddenGem) {
		conditions.push(
			gte(schema.places.ratingAvg, 4.0),
			sql`${schema.places.reviewCount} > 0`,
		);
	}
	if (query.onlyBookmarked && viewer) {
		conditions.push(
			inArray(
				schema.places.id,
				db
					.select({ placeId: schema.bookmarks.placeId })
					.from(schema.bookmarks)
					.where(eq(schema.bookmarks.userId, viewer.id)),
			),
		);
	}

	const hasCoords = query.lat !== undefined && query.lng !== undefined;
	const distExpr = hasCoords
		? haversineSql(query.lat as number, query.lng as number)
		: sql<number | null>`NULL`;

	if (hasCoords) {
		const lat = query.lat as number;
		const lng = query.lng as number;
		const radiusKm = query.radiusKm ?? 5;
		const latDelta = radiusKm / 111;
		const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
		const lngDelta = radiusKm / (111 * cosLat);
		conditions.push(
			gte(schema.places.latitude, lat - latDelta),
			lte(schema.places.latitude, lat + latDelta),
			gte(schema.places.longitude, lng - lngDelta),
			lte(schema.places.longitude, lng + lngDelta),
			lte(distExpr, radiusKm),
		);
	}

	const whereClause = and(...conditions);
	const orderBy = getPlaceSortOrder(sort, distExpr);

	const [[{ total }], rows] = await Promise.all([
		db
			.select({ total: count() })
			.from(schema.places)
			.innerJoin(
				schema.categories,
				eq(schema.places.categoryId, schema.categories.id),
			)
			.where(whereClause),
		db
			.select(placeListColumns(distExpr))
			.from(schema.places)
			.innerJoin(
				schema.categories,
				eq(schema.places.categoryId, schema.categories.id),
			)
			.where(whereClause)
			.orderBy(...orderBy)
			.limit(limit)
			.offset(offset),
	]);

	const data = await serializePlaceListRows(storage, viewer, rows);
	return { data, meta: paginationMeta(page, limit, total) };
}

export async function listHiddenGems(
	storage: Storage | undefined,
	query: HiddenGemsQueryType,
	viewer: SessionUser | null = null,
) {
	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [
		eq(schema.places.status, "published"),
		sql`${schema.places.reviewCount} > 0`,
		gte(schema.places.ratingAvg, 4.0),
	];
	appendSharedPlaceFilters(conditions, query);

	const whereClause = and(...conditions);
	const nullDistance = sql<number | null>`NULL`;

	const [[{ total }], rows] = await Promise.all([
		db
			.select({ total: count() })
			.from(schema.places)
			.innerJoin(
				schema.categories,
				eq(schema.places.categoryId, schema.categories.id),
			)
			.where(whereClause),
		db
			.select(placeListColumns(nullDistance))
			.from(schema.places)
			.innerJoin(
				schema.categories,
				eq(schema.places.categoryId, schema.categories.id),
			)
			.where(whereClause)
			.orderBy(
				desc(schema.places.hiddenGemScore),
				desc(schema.places.reviewCount),
				asc(schema.places.id),
			)
			.limit(limit)
			.offset(offset),
	]);

	const data = await serializePlaceListRows(storage, viewer, rows);
	return { data, meta: paginationMeta(page, limit, total) };
}

export async function getPlaceDetail(
	storage: Storage | undefined,
	idOrSlug: string,
	viewer: SessionUser | null,
	opts?: { allowUnpublished?: boolean },
): Promise<PlaceDetailType> {
	const match = UUID_RE.test(idOrSlug)
		? eq(schema.places.id, idOrSlug)
		: eq(schema.places.slug, idOrSlug);

	const [row] = await db
		.select({
			id: schema.places.id,
			slug: schema.places.slug,
			name: schema.places.name,
			description: schema.places.description,
			address: schema.places.address,
			district: schema.places.district,
			priceRange: schema.places.priceRange,
			latitude: schema.places.latitude,
			longitude: schema.places.longitude,
			phone: schema.places.phone,
			openingHours: schema.places.openingHours,
			coverMediaId: schema.places.coverMediaId,
			legalityDocumentMediaId: schema.places.legalityDocumentMediaId,
			status: schema.places.status,
			communityVerified: schema.places.communityVerified,
			ownerVerified: schema.places.ownerVerified,
			ratingAvg: schema.places.ratingAvg,
			reviewCount: schema.places.reviewCount,
			exploreScore: schema.places.exploreScore,
			hiddenGemScore: schema.places.hiddenGemScore,
			viewsTotal: schema.places.viewsTotal,
			createdById: schema.places.createdById,
			createdByName: schema.users.name,
			createdAt: schema.places.createdAt,
			updatedAt: schema.places.updatedAt,
			catId: schema.categories.id,
			catName: schema.categories.name,
			catSlug: schema.categories.slug,
			catIcon: schema.categories.icon,
		})
		.from(schema.places)
		.innerJoin(
			schema.categories,
			eq(schema.places.categoryId, schema.categories.id),
		)
		.leftJoin(schema.users, eq(schema.places.createdById, schema.users.id))
		.where(match)
		.limit(1);

	if (!row) throw notFound("Place");

	const [approvedClaim] = await db
		.select({ claimantId: schema.businessClaims.claimantId })
		.from(schema.businessClaims)
		.where(
			and(
				eq(schema.businessClaims.placeId, row.id),
				eq(schema.businessClaims.status, "approved"),
			),
		)
		.limit(1);
	const ownerId =
		approvedClaim?.claimantId ?? (row.ownerVerified ? row.createdById : null);

	if (row.status !== "published" && !opts?.allowUnpublished) {
		const allowed =
			viewer?.role === "admin" || (viewer !== null && ownerId === viewer.id);
		if (!allowed) throw notFound("Place");
	}

	const canSeeLegalityDoc =
		row.legalityDocumentMediaId !== null &&
		(viewer?.role === "admin" ||
			(viewer !== null && viewer.id === row.createdById));

	const [photoRows, mediaUrls, bookmarkedIds] = await Promise.all([
		db
			.select({
				id: schema.placePhotos.id,
				mediaId: schema.placePhotos.mediaId,
				sortOrder: schema.placePhotos.sortOrder,
				key: schema.media.key,
			})
			.from(schema.placePhotos)
			.innerJoin(schema.media, eq(schema.placePhotos.mediaId, schema.media.id))
			.where(eq(schema.placePhotos.placeId, row.id))
			.orderBy(asc(schema.placePhotos.sortOrder)),
		resolveMediaUrlMap(storage, [
			row.coverMediaId,
			canSeeLegalityDoc ? row.legalityDocumentMediaId : null,
		]),
		fetchBookmarkedSet(viewer, [row.id]),
	]);

	const photos = await Promise.all(
		photoRows.map(async (p) => ({
			id: p.id,
			mediaId: p.mediaId,
			url: storage ? await resolveMediaUrl(storage, p.key) : p.key,
			sortOrder: p.sortOrder,
		})),
	);

	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		category: {
			id: row.catId,
			name: row.catName,
			slug: row.catSlug,
			icon: row.catIcon,
		},
		description: row.description,
		address: row.address,
		district: row.district,
		priceRange: row.priceRange,
		latitude: row.latitude,
		longitude: row.longitude,
		phone: row.phone,
		openingHours: row.openingHours,
		coverMediaId: row.coverMediaId,
		coverUrl: row.coverMediaId
			? (mediaUrls.get(row.coverMediaId) ?? null)
			: null,
		legalityDocumentMediaId: canSeeLegalityDoc
			? row.legalityDocumentMediaId
			: null,
		legalityDocumentUrl:
			canSeeLegalityDoc && row.legalityDocumentMediaId
				? (mediaUrls.get(row.legalityDocumentMediaId) ?? null)
				: null,
		photos,
		status: row.status,
		communityVerified: row.communityVerified,
		ownerVerified: row.ownerVerified,
		ratingAvg: row.ratingAvg,
		reviewCount: row.reviewCount,
		exploreScore: row.exploreScore,
		hiddenGemScore: row.hiddenGemScore,
		views: row.viewsTotal,
		bookmarked: bookmarkedIds.has(row.id),
		createdByName: row.createdByName ?? null,
		ownerId,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export async function recordPlaceView(placeId: string): Promise<void> {
	if (!UUID_RE.test(placeId)) throw notFound("Place");

	const [place] = await db
		.select({ id: schema.places.id })
		.from(schema.places)
		.where(
			and(eq(schema.places.id, placeId), eq(schema.places.status, "published")),
		)
		.limit(1);

	if (!place) throw notFound("Place");

	const day = toJakartaDayInt();
	await db.transaction(async (tx) => {
		await tx
			.update(schema.places)
			.set({ viewsTotal: sql`${schema.places.viewsTotal} + 1` })
			.where(eq(schema.places.id, placeId));

		await tx
			.insert(schema.placeStats)
			.values({ placeId, day, views: 1 })
			.onConflictDoUpdate({
				target: [schema.placeStats.placeId, schema.placeStats.day],
				set: { views: sql`${schema.placeStats.views} + 1` },
			});
	});
}

async function assertCategoryExists(
	tx: DbOrTx,
	categoryId: string,
): Promise<void> {
	const [cat] = await tx
		.select({ id: schema.categories.id })
		.from(schema.categories)
		.where(eq(schema.categories.id, categoryId))
		.limit(1);
	if (!cat) throw notFound("Category");
}

function buildPlaceSlug(name: string): string {
	const baseSlug =
		name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "place";
	return `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function createPlace(
	storage: Storage | undefined,
	user: SessionUser,
	body: CreatePlaceBodyType,
): Promise<PlaceDetailType> {
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const [{ total }] = await db
		.select({ total: count() })
		.from(schema.places)
		.where(
			and(
				eq(schema.places.createdById, user.id),
				gte(schema.places.createdAt, since),
			),
		);
	if (Number(total) >= 3) {
		throw new ApiError(
			"RATE_LIMITED",
			429,
			"Daily place submission limit reached",
		);
	}

	await assertCategoryExists(db, body.categoryId);

	const photoIds = body.photoMediaIds ?? [];
	const slug = buildPlaceSlug(body.name);

	const created = await db.transaction(async (tx) => {
		if (photoIds.length > 0) {
			await assertOwnedReadyMedia(tx, user.id, photoIds, "place_photo");
		}
		if (body.legalityDocumentMediaId) {
			await assertOwnedReadyMedia(
				tx,
				user.id,
				[body.legalityDocumentMediaId],
				"claim_document",
			);
		}
		const priceBounds = parsePriceBounds(body.priceRange);
		const [place] = await tx
			.insert(schema.places)
			.values({
				name: body.name,
				slug,
				categoryId: body.categoryId,
				latitude: body.latitude,
				longitude: body.longitude,
				address: body.address ?? null,
				district: body.district ?? null,
				description: body.description ?? null,
				phone: body.phone ?? null,
				priceRange: body.priceRange ?? null,
				priceMin: priceBounds.min,
				priceMax: priceBounds.max,
				openingHours: (body.openingHours as OpeningHours) ?? null,
				coverMediaId: photoIds[0] ?? null,
				legalityDocumentMediaId: body.legalityDocumentMediaId ?? null,
				status: "pending",
				createdById: user.id,
			})
			.returning({ id: schema.places.id });

		if (photoIds.length > 0) {
			await tx.insert(schema.placePhotos).values(
				photoIds.map((mediaId, idx) => ({
					placeId: place.id,
					mediaId,
					sortOrder: idx,
					uploadedById: user.id,
				})),
			);
		}
		return place;
	});

	return getPlaceDetail(storage, created.id, user, { allowUnpublished: true });
}

export async function addPlacePhotos(
	storage: Storage | undefined,
	user: SessionUser,
	placeId: string,
	photoMediaIds: string[],
): Promise<
	Array<{ id: string; mediaId: string; url: string; sortOrder: number }>
> {
	if (!UUID_RE.test(placeId)) {
		throw notFound("Place");
	}

	const inserted = await db.transaction(async (tx) => {
		const [place] = await tx
			.select()
			.from(schema.places)
			.where(eq(schema.places.id, placeId))
			.for("update");
		if (!place) {
			throw notFound("Place");
		}
		if (
			place.status !== "published" &&
			user.role !== "admin" &&
			!(await hasApprovedClaim(tx, placeId, user.id))
		) {
			throw notFound("Place");
		}

		await assertOwnedReadyMedia(tx, user.id, photoMediaIds, "place_photo");
		const [agg] = await tx
			.select({
				maxSort: sql<number>`coalesce(max(${schema.placePhotos.sortOrder}), -1)`,
			})
			.from(schema.placePhotos)
			.where(eq(schema.placePhotos.placeId, place.id));
		const baseSort = Number(agg?.maxSort ?? -1) + 1;

		const rows = await tx
			.insert(schema.placePhotos)
			.values(
				photoMediaIds.map((mediaId, idx) => ({
					placeId: place.id,
					mediaId,
					sortOrder: baseSort + idx,
					uploadedById: user.id,
				})),
			)
			.returning({
				id: schema.placePhotos.id,
				mediaId: schema.placePhotos.mediaId,
				sortOrder: schema.placePhotos.sortOrder,
			});

		if (place.coverMediaId === null) {
			await tx
				.update(schema.places)
				.set({ coverMediaId: photoMediaIds[0] })
				.where(
					and(
						eq(schema.places.id, place.id),
						isNull(schema.places.coverMediaId),
					),
				);
		}
		return rows;
	});

	const urls = await resolveMediaUrlMap(
		storage,
		inserted.map((r) => r.mediaId),
	);
	return inserted.map((r) => ({
		id: r.id,
		mediaId: r.mediaId,
		url: urls.get(r.mediaId) ?? "",
		sortOrder: r.sortOrder,
	}));
}

export async function deletePlacePhoto(
	user: SessionUser,
	placeId: string,
	photoId: string,
): Promise<void> {
	if (!UUID_RE.test(placeId) || !UUID_RE.test(photoId)) {
		throw notFound("Photo");
	}

	await db.transaction(async (tx) => {
		const [place] = await tx
			.select()
			.from(schema.places)
			.where(eq(schema.places.id, placeId))
			.for("update");
		if (!place) throw notFound("Photo");

		const [photo] = await tx
			.select()
			.from(schema.placePhotos)
			.where(
				and(
					eq(schema.placePhotos.id, photoId),
					eq(schema.placePhotos.placeId, placeId),
				),
			)
			.limit(1);
		if (!photo) throw notFound("Photo");

		const authorized =
			photo.uploadedById === user.id ||
			user.role === "admin" ||
			(await hasApprovedClaim(tx, placeId, user.id));
		if (!authorized) throw forbidden("delete this photo");

		await tx
			.delete(schema.placePhotos)
			.where(eq(schema.placePhotos.id, photo.id));

		if (place.coverMediaId === photo.mediaId) {
			const [next] = await tx
				.select({ mediaId: schema.placePhotos.mediaId })
				.from(schema.placePhotos)
				.where(eq(schema.placePhotos.placeId, place.id))
				.orderBy(asc(schema.placePhotos.sortOrder))
				.limit(1);

			await tx
				.update(schema.places)
				.set({ coverMediaId: next?.mediaId ?? null })
				.where(eq(schema.places.id, place.id));
		}
	});
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
	pending: ["published", "rejected"],
	published: ["archived"],
	archived: ["published"],
	rejected: [],
};

export async function adminUpdatePlace(
	storage: Storage | undefined,
	user: SessionUser,
	id: string,
	body: AdminUpdatePlaceBodyType,
): Promise<PlaceDetailType> {
	await db.transaction(async (tx) => {
		const [existing] = await tx
			.select()
			.from(schema.places)
			.where(eq(schema.places.id, id))
			.for("update");
		if (!existing) throw notFound("Place");

		if (body.status !== undefined && body.status !== existing.status) {
			const allowed = ALLOWED_STATUS_TRANSITIONS[existing.status] ?? [];
			if (!allowed.includes(body.status)) {
				throw conflict("Invalid status transition");
			}
		}

		if (body.categoryId !== undefined) {
			await assertCategoryExists(tx, body.categoryId);
		}

		if (body.coverMediaId !== undefined && body.coverMediaId !== null) {
			const [photo] = await tx
				.select({ id: schema.placePhotos.id })
				.from(schema.placePhotos)
				.where(
					and(
						eq(schema.placePhotos.placeId, id),
						eq(schema.placePhotos.mediaId, body.coverMediaId),
					),
				)
				.limit(1);
			if (!photo) {
				throw new ApiError(
					"VALIDATION_ERROR",
					422,
					"coverMediaId must belong to this place",
				);
			}
		}

		const updates: Partial<typeof schema.places.$inferInsert> = {
			updatedAt: new Date(),
		};
		if (body.name !== undefined) updates.name = body.name;
		if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
		if (body.latitude !== undefined) updates.latitude = body.latitude;
		if (body.longitude !== undefined) updates.longitude = body.longitude;
		if (body.address !== undefined) updates.address = body.address;
		if (body.district !== undefined) updates.district = body.district;
		if (body.description !== undefined) updates.description = body.description;
		if (body.phone !== undefined) updates.phone = body.phone;
		if (body.priceRange !== undefined) {
			const priceBounds = parsePriceBounds(body.priceRange);
			updates.priceRange = body.priceRange;
			updates.priceMin = priceBounds.min;
			updates.priceMax = priceBounds.max;
		}
		if (body.openingHours !== undefined) {
			updates.openingHours = body.openingHours as OpeningHours | null;
		}
		if (body.coverMediaId !== undefined) {
			updates.coverMediaId = body.coverMediaId;
		}
		if (body.status !== undefined) updates.status = body.status;

		await tx.update(schema.places).set(updates).where(eq(schema.places.id, id));
	});
	return getPlaceDetail(storage, id, user);
}

export async function adminArchivePlace(id: string): Promise<void> {
	const [updated] = await db
		.update(schema.places)
		.set({ status: "archived", updatedAt: new Date() })
		.where(eq(schema.places.id, id))
		.returning({ id: schema.places.id });
	if (!updated) throw notFound("Place");
}
