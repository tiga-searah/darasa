import { desc, eq } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import { getContributorLevel } from "../../lib/xp";

export async function getMyContributions(userId: string) {
	const [userRow] = await db
		.select({ xpTotal: schema.users.xpTotal })
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.limit(1);

	const xpTotal = userRow?.xpTotal ?? 0;

	const events = await db
		.select({
			id: schema.xpEvents.id,
			action: schema.xpEvents.action,
			xpDelta: schema.xpEvents.xpDelta,
			summary: schema.xpEvents.summary,
			placeId: schema.xpEvents.placeId,
			placeSlug: schema.places.slug,
			placeName: schema.places.name,
			createdAt: schema.xpEvents.createdAt,
		})
		.from(schema.xpEvents)
		.leftJoin(schema.places, eq(schema.xpEvents.placeId, schema.places.id))
		.where(eq(schema.xpEvents.userId, userId))
		.orderBy(desc(schema.xpEvents.createdAt));

	const counts = { places: 0, reviews: 0, photos: 0, edits: 0 };
	for (const row of events) {
		switch (row.action) {
			case "add_place":
				counts.places += 1;
				break;
			case "write_review":
				counts.reviews += 1;
				break;
			case "add_photo":
				counts.photos += 1;
				break;
			case "update_info":
				counts.edits += 1;
				break;
		}
	}

	return {
		xpTotal,
		level: getContributorLevel(xpTotal),
		counts,
		timeline: events,
	};
}
