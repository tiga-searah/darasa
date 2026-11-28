import { and, eq } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import type { Storage } from "../../lib/ports";
import type { SessionUser } from "../../lib/session";
import { notFound } from "../../utils";
import { listPlaces } from "../places/service";

export async function listBookmarks(
	storage: Storage | undefined,
	query: { q?: string; page?: number; limit?: number },
	user: SessionUser,
) {
	return listPlaces(
		storage,
		{ q: query.q, page: query.page, limit: query.limit, onlyBookmarked: true },
		user,
	);
}

export async function addBookmark(placeId: string, user: SessionUser) {
	const place = await db.query.places.findFirst({
		where: { id: placeId, status: "published" },
	});
	if (!place) throw notFound("Place");

	await db
		.insert(schema.bookmarks)
		.values({ userId: user.id, placeId })
		.onConflictDoNothing();

	return { bookmarked: true };
}

export async function removeBookmark(placeId: string, user: SessionUser) {
	const place = await db.query.places.findFirst({
		where: { id: placeId },
	});
	if (!place) throw notFound("Place");

	await db
		.delete(schema.bookmarks)
		.where(
			and(
				eq(schema.bookmarks.userId, user.id),
				eq(schema.bookmarks.placeId, placeId),
			),
		);

	return { bookmarked: false };
}
