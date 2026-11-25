import { describe, expect, test } from "bun:test";
import { sniffMime } from "../src/utils";

const enc = (s: string) => new TextEncoder().encode(s);
const bytes = (...n: number[]) => new Uint8Array(n);

describe("sniffMime", () => {
	test("recognises the four allowed types", () => {
		expect(
			sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0)),
		).toBe("image/jpeg");
		expect(
			sniffMime(
				bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0),
			),
		).toBe("image/png");
		expect(
			sniffMime(
				new Uint8Array([...enc("RIFF"), 0, 0, 0, 0, ...enc("WEBPVP8 ")]),
			),
		).toBe("image/webp");
		expect(sniffMime(enc("%PDF-1.7 something"))).toBe("application/pdf");
	});

	test("rejects html, svg and short input", () => {
		expect(sniffMime(enc("<html><body>x"))).toBeNull();
		expect(sniffMime(enc("<svg xmlns="))).toBeNull();
		expect(sniffMime(new Uint8Array(0))).toBeNull();
		expect(sniffMime(bytes(0x89, 0x50, 0x4e))).toBeNull();
	});
});
