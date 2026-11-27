import { describe, expect, test } from "bun:test";
import { parsePriceBounds } from "../src/lib/price";

describe("parsePriceBounds", () => {
	test("parses Indonesian Rupiah ranges and single numbers", () => {
		expect(parsePriceBounds("Rp 15.000 - Rp 30.000")).toEqual({
			min: 15000,
			max: 30000,
		});
		expect(parsePriceBounds("Rp 10.000 - 20.000")).toEqual({
			min: 10000,
			max: 20000,
		});
		expect(parsePriceBounds("Mulai Rp 120.000")).toEqual({
			min: 120000,
			max: 120000,
		});
		expect(parsePriceBounds("15k - 25k")).toEqual({ min: 15000, max: 25000 });
		expect(parsePriceBounds(null)).toEqual({ min: null, max: null });
		expect(parsePriceBounds("Gratis")).toEqual({ min: null, max: null });
	});
});
