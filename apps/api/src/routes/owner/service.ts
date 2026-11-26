import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import type { Storage } from "../../lib/ports";
import type { SessionUser } from "../../lib/session";
import { ApiError, forbidden, notFound } from "../../utils";
import { resolveMediaUrl } from "../media/service";
import { getPlaceDetail } from "../places/service";
import type { UpdateOwnerPlaceInput } from "./model";

const IDENTITY_FIELDS = [
	"name",
	"categoryId",
	"latitude",
	"longitude",
	"status",
] as const;

export async function assertPlaceOwnerOrAdmin(
	user: SessionUser,
	placeId: string,
): Promise<void> {
	const [place] = await db
		.select({ id: schema.places.id })
		.from(schema.places)
		.where(eq(schema.places.id, placeId))
		.limit(1);
	if (!place) throw notFound("Place");

	if (user.role === "admin") return;

	const [claim] = await db
		.select({ id: schema.businessClaims.id })
		.from(schema.businessClaims)
		.where(
			and(
				eq(schema.businessClaims.placeId, placeId),
				eq(schema.businessClaims.claimantId, user.id),
				eq(schema.businessClaims.status, "approved"),
			),
		)
		.limit(1);
	if (!claim) throw forbidden("manage this place");
}

export async function listOwnerPlaces(storage: Storage, user: SessionUser) {
	const rows = await db
		.select({
			id: schema.places.id,
			slug: schema.places.slug,
			name: schema.places.name,
			categoryId: schema.places.categoryId,
			address: schema.places.address,
			phone: schema.places.phone,
			status: schema.places.status,
			ownerVerified: schema.places.ownerVerified,
			coverKey: schema.media.key,
			ratingAvg: schema.places.ratingAvg,
			reviewCount: schema.places.reviewCount,
			createdAt: schema.places.createdAt,
			updatedAt: schema.places.updatedAt,
		})
		.from(schema.businessClaims)
		.innerJoin(
			schema.places,
			eq(schema.businessClaims.placeId, schema.places.id),
		)
		.leftJoin(schema.media, eq(schema.places.coverMediaId, schema.media.id))
		.where(
			and(
				eq(schema.businessClaims.claimantId, user.id),
				eq(schema.businessClaims.status, "approved"),
			),
		)
		.orderBy(asc(schema.places.name));

	return rows.map(({ coverKey, ...rest }) => ({
		...rest,
		coverUrl: coverKey ? resolveMediaUrl(storage, coverKey) : null,
	}));
}

export async function getOwnerPlace(
	storage: Storage,
	user: SessionUser,
	placeId: string,
) {
	await assertPlaceOwnerOrAdmin(user, placeId);
	return getPlaceDetail(storage, placeId, user, { allowUnpublished: true });
}

export async function updateOwnerPlace(
	storage: Storage,
	user: SessionUser,
	placeId: string,
	body: UpdateOwnerPlaceInput,
) {
	await assertPlaceOwnerOrAdmin(user, placeId);

	const rejectedFields: Record<string, string> = {};
	for (const field of IDENTITY_FIELDS) {
		if (body[field] !== undefined) {
			rejectedFields[field] = "Requires administrator approval";
		}
	}
	if (Object.keys(rejectedFields).length > 0) {
		throw new ApiError(
			"FORBIDDEN",
			403,
			"Identity fields require administrator approval",
			rejectedFields,
		);
	}

	if (body.coverMediaId !== undefined && body.coverMediaId !== null) {
		const [photo] = await db
			.select({ id: schema.placePhotos.id })
			.from(schema.placePhotos)
			.where(
				and(
					eq(schema.placePhotos.placeId, placeId),
					eq(schema.placePhotos.mediaId, body.coverMediaId),
				),
			)
			.limit(1);
		if (!photo) {
			throw new ApiError(
				"VALIDATION_ERROR",
				422,
				"Cover photo must belong to this place",
				{ coverMediaId: "Photo not found for this place" },
			);
		}
	}

	const patch: Partial<typeof schema.places.$inferInsert> = {
		updatedAt: new Date(),
	};
	if (body.address !== undefined) patch.address = body.address;
	if (body.description !== undefined) patch.description = body.description;
	if (body.phone !== undefined) patch.phone = body.phone;
	if (body.openingHours !== undefined) patch.openingHours = body.openingHours;
	if (body.coverMediaId !== undefined) patch.coverMediaId = body.coverMediaId;

	await db
		.update(schema.places)
		.set(patch)
		.where(eq(schema.places.id, placeId));

	return getPlaceDetail(storage, placeId, user, { allowUnpublished: true });
}

function jakartaCutoffDay(days: number): number {
	const cutoff = new Date(Date.now() - (days - 1) * 86_400_000);
	const formatted = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Jakarta",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(cutoff);
	return Number(formatted.replace(/-/g, ""));
}

export async function getOwnerPlaceStats(
	user: SessionUser,
	placeId: string,
	days: 7 | 30 | 90 = 30,
) {
	await assertPlaceOwnerOrAdmin(user, placeId);

	const cutoffDay = jakartaCutoffDay(days);
	const daily = await db
		.select({
			day: schema.placeStats.day,
			views: schema.placeStats.views,
		})
		.from(schema.placeStats)
		.where(
			and(
				eq(schema.placeStats.placeId, placeId),
				gte(schema.placeStats.day, cutoffDay),
			),
		)
		.orderBy(asc(schema.placeStats.day));

	const totalViews = daily.reduce((sum, row) => sum + row.views, 0);

	const [unanswered] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.reviews)
		.leftJoin(
			schema.ownerReplies,
			eq(schema.reviews.id, schema.ownerReplies.reviewId),
		)
		.where(
			and(
				eq(schema.reviews.placeId, placeId),
				eq(schema.reviews.status, "published"),
				isNull(schema.ownerReplies.id),
			),
		);

	return {
		days,
		totalViews,
		unansweredReviews: unanswered?.count ?? 0,
		daily,
	};
}
