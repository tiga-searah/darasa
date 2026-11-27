import { t } from "elysia";

export const BookmarkListQuery = t.Object({
	page: t.Optional(t.Integer({ minimum: 1 })),
	limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
});

export const BookmarkToggleResponse = t.Object({
	data: t.Object({
		bookmarked: t.Boolean(),
	}),
});
