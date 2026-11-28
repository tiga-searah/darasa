import { t } from "elysia";

export const ContributionActionSchema = t.Union([
	t.Literal("add_place"),
	t.Literal("write_review"),
	t.Literal("add_photo"),
	t.Literal("update_info"),
]);

export const ContributorLevelSchema = t.Object({
	level: t.Number(),
	title: t.String(),
	xp: t.Number(),
	currentLevelMinXp: t.Number(),
	nextLevelXp: t.Nullable(t.Number()),
	nextLevelTitle: t.Nullable(t.String()),
	progressPercent: t.Number(),
	xpToNext: t.Number(),
});

export const ContributionCountsSchema = t.Object({
	places: t.Number(),
	reviews: t.Number(),
	photos: t.Number(),
	edits: t.Number(),
});

export const ContributionTimelineItemSchema = t.Object({
	id: t.String(),
	action: ContributionActionSchema,
	xpDelta: t.Number(),
	summary: t.String(),
	placeId: t.Nullable(t.String()),
	placeSlug: t.Nullable(t.String()),
	placeName: t.Nullable(t.String()),
	createdAt: t.Date(),
});

export const ContributionsResponse = t.Object({
	data: t.Object({
		xpTotal: t.Number(),
		level: ContributorLevelSchema,
		counts: ContributionCountsSchema,
		timeline: t.Array(ContributionTimelineItemSchema),
	}),
});
