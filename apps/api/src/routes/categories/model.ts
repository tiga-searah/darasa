import { t } from "elysia";

export const CategoryItem = t.Object({
	id: t.String(),
	name: t.String(),
	slug: t.String(),
	icon: t.Nullable(t.String()),
	sortOrder: t.Integer(),
});

export const CategoryListResponse = t.Object({
	data: t.Array(CategoryItem),
});
