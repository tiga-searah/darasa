import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { freshApp, json, resetDb } from "./helpers";

describe("GET /categories", () => {
	beforeEach(resetDb);

	test("returns categories ordered by sortOrder ascending", async () => {
		await db.insert(schema.categories).values([
			{ name: "Kafe", slug: "kafe", icon: "coffee", sortOrder: 2 },
			{ name: "Warung", slug: "warung", icon: "utensils", sortOrder: 1 },
		]);

		const res = await freshApp().handle(
			new Request("http://test/api/categories"),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.map((c: { slug: string }) => c.slug)).toEqual([
			"warung",
			"kafe",
		]);
	});
});
