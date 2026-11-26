import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import type { Storage } from "../../lib/ports";
import type { SessionUser } from "../../lib/session";
import { ApiError, notFound } from "../../utils";
import { assertOwnedReadyMedia, resolveMediaUrl } from "../media/service";
import type {
	CreatePlaceBodyType,
	HiddenGemsQueryType,
	PlaceDetailType,
	PlaceListItemType,
	PlaceListQueryType,
} from "./model";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function haversineSql(lat: number, lng: number) {
	return sql<number>`(6371 * acos(least(1.0, greatest(-1.0, cos(radians(${lat})) * cos(radians(${schema.places.latitude})) * cos(radians(${schema.places.longitude}) - radians(${lng})) + sin(radians(${lat})) * sin(radians(${schema.places.latitude}))))))`;
}

function jakartaDayInt(): number {
	const formatted = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Jakarta",
	}).format(new Date());
	return Number(formatted.replace(/-/g, ""));
}

async function resolveCoverUrls(
	storage: Storage | undefined,
	mediaIds: (string | null)[],
): Promise<Map<string, string>> {
	const ids = [...new Set(mediaIds.filter((id): id is string => id !== null))];
	const map = new Map<string, string>();
	if (ids.length === 0 || !storage) return map;

	const rows = await db
		.select({ id: schema.media.id, key: schema.media.key })
		.from(schema.media)
		.where(inArray(schema.media.id, ids));

	await Promise.all(
		rows.map(async (row) => {
			map.set(row.id, await resolveMediaUrl(storage, row.key));
		}),
	);
	return map;
}

export async function listPlaces(
	storage: Storage | undefined,
	query: PlaceListQueryType,
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

	const conditions: SQL[] = [eq(schema.places.status, "published")];

	if (query.q && query.q.trim().length > 0) {
		const pattern = `%${query.q.trim()}%`;
		const qCond = or(
			ilike(schema.places.name, pattern),
			ilike(schema.places.description, pattern),
		);
		if (qCond) conditions.push(qCond);
	}

	if (query.category) {
		if (UUID_RE.test(query.category)) {
			conditions.push(eq(schema.places.categoryId, query.category));
		} else {
			conditions.push(eq(schema.categories.slug, query.category));
		}
	}

	if (query.verified === "community") {
		conditions.push(eq(schema.places.communityVerified, true));
	} else if (query.verified === "owner") {
		conditions.push(eq(schema.places.ownerVerified, true));
	} else if (query.verified === "any") {
		const vCond = or(
			eq(schema.places.communityVerified, true),
			eq(schema.places.ownerVerified, true),
		);
		if (vCond) conditions.push(vCond);
	}
	const hasCoords = query.lat !== undefined && query.lng !== undefined;
	const distExpr = hasCoords
		? haversineSql(query.lat as number, query.lng as number)
		: sql<number | null>`NULL`;

	if (hasCoords) {
		const lat = query.lat as number;
		const lng = query.lng as number;
		const radiusKm = query.radiusKm ?? 5;
		if (radiusKm !== undefined) {
			const latDelta = radiusKm / 111;
			const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
			const lngDelta = radiusKm / (111 * cosLat);
			conditions.push(gte(schema.places.latitude, lat - latDelta));
			conditions.push(lte(schema.places.latitude, lat + latDelta));
			conditions.push(gte(schema.places.longitude, lng - lngDelta));
			conditions.push(lte(schema.places.longitude, lng + lngDelta));
			conditions.push(lte(distExpr, radiusKm));
		}
	}

	const whereClause = and(...conditions);

	const [{ total }] = await db
		.select({ total: count() })
		.from(schema.places)
		.innerJoin(
			schema.categories,
			eq(schema.places.categoryId, schema.categories.id),
		)
		.where(whereClause);

	const orderBy =
		sort === "newest"
			? [desc(schema.places.createdAt), asc(schema.places.id)]
			: sort === "rating"
				? [
						desc(schema.places.ratingAvg),
						desc(schema.places.reviewCount),
						asc(schema.places.id),
					]
				: sort === "nearby"
					? [
							asc(distExpr),
							desc(schema.places.exploreScore),
							asc(schema.places.id),
						]
					: [
							desc(schema.places.exploreScore),
							desc(schema.places.reviewCount),
							asc(schema.places.id),
						];

	const rows = await db
		.select({
			id: schema.places.id,
			slug: schema.places.slug,
			name: schema.places.name,
			address: schema.places.address,
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
			distanceKm: distExpr,
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
		.where(whereClause)
		.orderBy(...orderBy)
		.limit(limit)
		.offset(offset);

	const coverUrls = await resolveCoverUrls(
		storage,
		rows.map((r) => r.coverMediaId),
	);

	const data: PlaceListItemType[] = rows.map((r) => ({
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
		distanceKm: r.distanceKm ?? null,
	}));

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		},
	};
}

export async function listHiddenGems(
	storage: Storage | undefined,
	query: HiddenGemsQueryType,
) {
	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [
		eq(schema.places.status, "published"),
		sql`${schema.places.reviewCount} > 0`,
		gte(schema.places.ratingAvg, 4.0),
	];

	if (query.category) {
		if (UUID_RE.test(query.category)) {
			conditions.push(eq(schema.places.categoryId, query.category));
		} else {
			conditions.push(eq(schema.categories.slug, query.category));
		}
	}

	const whereClause = and(...conditions);

	const [{ total }] = await db
		.select({ total: count() })
		.from(schema.places)
		.innerJoin(
			schema.categories,
			eq(schema.places.categoryId, schema.categories.id),
		)
		.where(whereClause);

	const rows = await db
		.select({
			id: schema.places.id,
			slug: schema.places.slug,
			name: schema.places.name,
			address: schema.places.address,
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
		.where(whereClause)
		.orderBy(
			desc(schema.places.hiddenGemScore),
			desc(schema.places.reviewCount),
			asc(schema.places.id),
		)
		.limit(limit)
		.offset(offset);

	const coverUrls = await resolveCoverUrls(
		storage,
		rows.map((r) => r.coverMediaId),
	);

	const data: PlaceListItemType[] = rows.map((r) => ({
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
		distanceKm: null,
	}));

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		},
	};
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
			latitude: schema.places.latitude,
			longitude: schema.places.longitude,
			phone: schema.places.phone,
			openingHours: schema.places.openingHours,
			coverMediaId: schema.places.coverMediaId,
			status: schema.places.status,
			communityVerified: schema.places.communityVerified,
			ownerVerified: schema.places.ownerVerified,
			ratingAvg: schema.places.ratingAvg,
			reviewCount: schema.places.reviewCount,
			exploreScore: schema.places.exploreScore,
			hiddenGemScore: schema.places.hiddenGemScore,
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
		.where(match)
		.limit(1);

	if (!row) throw notFound("Place");

	if (row.status !== "published" && !opts?.allowUnpublished) {
		let allowed = viewer?.role === "admin";
		if (!allowed && viewer) {
			const [claim] = await db
				.select({ id: schema.businessClaims.id })
				.from(schema.businessClaims)
				.where(
					and(
						eq(schema.businessClaims.placeId, row.id),
						eq(schema.businessClaims.claimantId, viewer.id),
						eq(schema.businessClaims.status, "approved"),
					),
				)
				.limit(1);
			allowed = Boolean(claim);
		}
		if (!allowed) throw notFound("Place");
	}

	const photoRows = await db
		.select({
			id: schema.placePhotos.id,
			mediaId: schema.placePhotos.mediaId,
			sortOrder: schema.placePhotos.sortOrder,
			key: schema.media.key,
		})
		.from(schema.placePhotos)
		.innerJoin(schema.media, eq(schema.placePhotos.mediaId, schema.media.id))
		.where(eq(schema.placePhotos.placeId, row.id))
		.orderBy(asc(schema.placePhotos.sortOrder));

	const coverUrls = await resolveCoverUrls(storage, [row.coverMediaId]);
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
		latitude: row.latitude,
		longitude: row.longitude,
		phone: row.phone,
		openingHours: row.openingHours,
		coverMediaId: row.coverMediaId,
		coverUrl: row.coverMediaId
			? (coverUrls.get(row.coverMediaId) ?? null)
			: null,
		photos,
		status: row.status,
		communityVerified: row.communityVerified,
		ownerVerified: row.ownerVerified,
		ratingAvg: row.ratingAvg,
		reviewCount: row.reviewCount,
		exploreScore: row.exploreScore,
		hiddenGemScore: row.hiddenGemScore,
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

	const day = jakartaDayInt();
	await db
		.insert(schema.placeStats)
		.values({ placeId, day, views: 1 })
		.onConflictDoUpdate({
			target: [schema.placeStats.placeId, schema.placeStats.day],
			set: { views: sql`${schema.placeStats.views} + 1` },
		});
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

	const [cat] = await db
		.select({ id: schema.categories.id })
		.from(schema.categories)
		.where(eq(schema.categories.id, body.categoryId))
		.limit(1);
	if (!cat) throw notFound("Category");

	const photoIds = body.photoMediaIds ?? [];
	const baseSlug =
		body.name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "place";
	const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;

	const created = await db.transaction(async (tx) => {
		if (photoIds.length > 0) {
			await assertOwnedReadyMedia(tx, user.id, photoIds, "place_photo");
		}
		const [place] = await tx
			.insert(schema.places)
			.values({
				name: body.name,
				slug,
				categoryId: body.categoryId,
				latitude: body.latitude,
				longitude: body.longitude,
				address: body.address ?? null,
				description: body.description ?? null,
				phone: body.phone ?? null,
				openingHours: body.openingHours ?? null,
				coverMediaId: photoIds[0] ?? null,
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
