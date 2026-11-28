import { db } from "./index";
import { schema } from "./schema";

const DEFAULT_CATEGORIES = [
	{ name: "Makanan berat", slug: "makanan-berat", sortOrder: 1 },
	{ name: "Minuman", slug: "minuman", sortOrder: 2 },
	{ name: "Street food", slug: "street-food", sortOrder: 3 },
	{ name: "Dessert", slug: "dessert", sortOrder: 4 },
];

export async function seedCategories() {
	await db
		.insert(schema.categories)
		.values(DEFAULT_CATEGORIES)
		.onConflictDoNothing({ target: schema.categories.slug });
}

if (import.meta.main) {
	await seedCategories();
	process.exit(0);
}
