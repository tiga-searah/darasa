import { asc } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";

export const listCategories = () =>
	db
		.select({
			id: schema.categories.id,
			name: schema.categories.name,
			slug: schema.categories.slug,
			icon: schema.categories.icon,
			sortOrder: schema.categories.sortOrder,
		})
		.from(schema.categories)
		.orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
