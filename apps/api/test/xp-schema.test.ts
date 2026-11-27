import { describe, expect, test } from "bun:test";
import { getTableName } from "drizzle-orm";
import { relations } from "../src/database/relations";
import { schema } from "../src/database/schema";
import { contributionAction } from "../src/database/schema/enums";

describe("xp schema", () => {
	test("defines contributionAction enum values", () => {
		expect(contributionAction.enumValues).toEqual([
			"add_place",
			"write_review",
			"add_photo",
			"update_info",
		]);
	});

	test("adds xpTotal column to users", () => {
		expect(schema.users.xpTotal).toBeDefined();
		expect(schema.users.xpTotal.name).toBe("xp_total");
		expect(schema.users.xpTotal.notNull).toBe(true);
		expect(schema.users.xpTotal.default).toBe(0);
	});

	test("defines xpEvents table in schema and relations", () => {
		expect(schema.xpEvents).toBeDefined();
		expect(getTableName(schema.xpEvents)).toBe("xp_events");
		expect(schema.xpEvents.userId.notNull).toBe(true);
		expect(schema.xpEvents.placeId.notNull).toBe(false);
		expect(schema.xpEvents.action.notNull).toBe(true);
		expect(schema.xpEvents.xpDelta.notNull).toBe(true);
		expect(schema.xpEvents.summary.notNull).toBe(true);
		expect(schema.xpEvents.createdAt.notNull).toBe(true);
		expect(relations).toBeDefined();
	});
});
