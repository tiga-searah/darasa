import { beforeEach, describe, expect, test } from "bun:test";
import { freshApp, json, resetDb } from "./helpers";

describe("app shell", () => {
	beforeEach(resetDb);

	test("health returns data envelope", async () => {
		const res = await freshApp().handle(new Request("http://test/api/health"));
		expect(res.status).toBe(200);
		expect(await json(res)).toEqual({ data: { ok: true } });
	});

	test("unknown route returns NOT_FOUND envelope", async () => {
		const res = await freshApp().handle(new Request("http://test/api/nope"));
		expect(res.status).toBe(404);
		expect(await json(res)).toEqual({
			error: { code: "NOT_FOUND", message: "Route not found" },
		});
	});
});
