import { beforeEach, describe, expect, spyOn, test } from "bun:test";
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

	test("validation failure returns VALIDATION_ERROR with fields", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/echo", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ n: "not-a-number" }),
			}),
		);
		expect(res.status).toBe(422);
		const body = await json(res);
		expect(body.error.code).toBe("VALIDATION_ERROR");
		expect(body.error.fields["/n"]).toContain("must be number");
	});

	test("ApiError thrown in a handler maps to its status", async () => {
		const res = await freshApp().handle(new Request("http://test/api/boom"));
		expect(res.status).toBe(409);
		expect(await json(res)).toEqual({
			error: { code: "CONFLICT", message: "Already reviewed" },
		});
	});

	test("malformed JSON body returns 400 without logging", async () => {
		const logged = spyOn(console, "error").mockImplementation(() => {});
		try {
			const res = await freshApp().handle(
				new Request("http://test/api/echo", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{",
				}),
			);
			expect(res.status).toBe(400);
			expect(await json(res)).toEqual({
				error: { code: "VALIDATION_ERROR", message: "Malformed request body" },
			});
			expect(logged).not.toHaveBeenCalled();
		} finally {
			logged.mockRestore();
		}
	});

	test("unsupported content type returns 415 VALIDATION_ERROR", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/echo", {
				method: "POST",
				headers: { "content-type": "text/plain" },
				body: "hello",
			}),
		);
		expect(res.status).toBe(415);
		expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
	});
});
