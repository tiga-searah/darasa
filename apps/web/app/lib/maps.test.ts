import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWithinBatangBounds, parseGoogleMapsCoordinates } from "./maps";
import { resolveGoogleMapsLink } from "./maps-server";

describe("Google Maps coordinate parsing", () => {
	it("prefers exact !3d...!4d... pin coordinates over @ viewport center", () => {
		const url =
			"https://www.google.com/maps/place/Warung+Batang/@-6.912000,109.735000,17z/data=!3m1!4b1!4m6!3m5!1s0x2e70:0x1!8m2!3d-6.907412!4d109.731845!16s";
		const { result } = parseGoogleMapsCoordinates(url);
		assert.ok(result);
		assert.equal(result.lat, "-6.907412");
		assert.equal(result.lng, "109.731845");
		assert.equal(result.inBatangBounds, true);
	});

	it("parses embed !2d...!3d..., URL-encoded commas, q=loc:, and DMS coordinates", () => {
		const encoded = parseGoogleMapsCoordinates(
			"https://www.google.com/maps/search/?api=1&query=-6.907812%2C109.730245",
		);
		assert.equal(encoded.result?.lat, "-6.907812");
		assert.equal(encoded.result?.lng, "109.730245");

		const locQuery = parseGoogleMapsCoordinates(
			"https://maps.google.com/?q=loc:-6.910000,109.732000",
		);
		assert.equal(locQuery.result?.lat, "-6.910000");
		assert.equal(locQuery.result?.lng, "109.732000");

		const embed = parseGoogleMapsCoordinates(
			"https://www.google.com/maps/embed?pb=!1m18!1m12!2d109.731845!3d-6.907412",
		);
		assert.equal(embed.result?.lat, "-6.907412");
		assert.equal(embed.result?.lng, "109.731845");

		const dms = parseGoogleMapsCoordinates(`6°54'28.1"S 109°43'48.7"E`);
		assert.ok(dms.result);
		assert.equal(dms.result.inBatangBounds, true);
	});

	it("preserves 6 decimal places for raw coordinate pairs", () => {
		const { result } = parseGoogleMapsCoordinates("-6.907812, 109.730245");
		assert.ok(result);
		assert.equal(result.lat, "-6.907812");
		assert.equal(result.lng, "109.730245");
		assert.equal(result.inBatangBounds, true);
	});

	it("parses ?q= and ?query= coordinates and flags out-of-Batang points", () => {
		const { result: inBatang } = parseGoogleMapsCoordinates(
			"https://www.google.com/maps?q=-6.956211,109.956411",
		);
		assert.ok(inBatang);
		assert.equal(inBatang.inBatangBounds, true);

		const { result: outside } = parseGoogleMapsCoordinates(
			"https://www.google.com/maps?q=-6.200000,106.816666",
		);
		assert.ok(outside);
		assert.equal(outside.inBatangBounds, false);
	});

	it("marks short goo.gl links and Google Maps share text for server resolution", () => {
		const parsed = parseGoogleMapsCoordinates(
			"Warung Soto Batang\nhttps://maps.app.goo.gl/abc123",
		);
		assert.equal(parsed.result, undefined);
		assert.equal(parsed.needsServerResolve, true);
		assert.equal(parsed.resolvedUrlCandidate, "https://maps.app.goo.gl/abc123");
	});

	it("validates Batang bounding box", () => {
		assert.equal(isWithinBatangBounds(-6.9078, 109.7302), true);
		assert.equal(isWithinBatangBounds(-6.2, 106.8166), false);
	});
});

describe("resolveGoogleMapsLink", () => {
	it("follows maps.app.goo.gl redirects to extract exact coordinates", async () => {
		const fakeFetch: typeof fetch = async () =>
			new Response(null, {
				status: 302,
				headers: {
					location:
						"https://www.google.com/maps/place/Warung+Batang/@-6.912000,109.735000,17z/data=!3m1!4b1!8m2!3d-6.907412!4d109.731845",
				},
			});

		const res = await resolveGoogleMapsLink(
			"https://maps.app.goo.gl/abc123",
			fakeFetch,
		);
		assert.equal(res.ok, true);
		assert.equal(res.result?.lat, "-6.907412");
		assert.equal(res.result?.lng, "109.731845");
	});

	it("extracts coordinates from HTML meta staticmap when final URL lacks coordinates", async () => {
		const fakeFetch: typeof fetch = async () =>
			new Response(
				`<html><head><meta property="og:image" content="https://maps.google.com/maps/api/staticmap?center=-6.908123%2C109.731456&amp;zoom=15" /></head></html>`,
				{
					status: 200,
					headers: { "content-type": "text/html" },
				},
			);

		const res = await resolveGoogleMapsLink(
			"https://maps.app.goo.gl/htmlonly",
			fakeFetch,
		);
		assert.equal(res.ok, true);
		assert.equal(res.result?.lat, "-6.908123");
		assert.equal(res.result?.lng, "109.731456");
	});

	it("rejects non-Google hosts to prevent SSRF", async () => {
		const res = await resolveGoogleMapsLink("http://127.0.0.1:8080/internal");
		assert.equal(res.ok, false);
		assert.ok(res.error);
	});
});
