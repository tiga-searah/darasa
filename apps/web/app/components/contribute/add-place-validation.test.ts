import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type AddPlaceDraft,
	areTimeDigitsValid,
	formatOpeningDigits,
	formatPriceRangeInput,
	handleOpeningHoursInput,
	validateAddPlaceDraft,
} from "./add-place-validation";

function makeValidDraft(): AddPlaceDraft {
	return {
		name: "Warung Soto Ayam Bu Karmini",
		category: "Makanan berat",
		district: "Batang Kota",
		address: "Jl. Jenderal Sudirman No. 45, Batang",
		lat: "-6.9078",
		lng: "109.7302",
		openingHours: "08.00 - 20.00",
		priceRange: "12.000 - 25.000",
		description:
			"Soto ayam kampung kuah bening dengan perkedel hangat dan sambal kemiri.",
		photoPreview: "data:image/png;base64,iVBORw0KGgo=",
	};
}

describe("validateAddPlaceDraft", () => {
	it("passes when all required fields are complete and valid", () => {
		const result = validateAddPlaceDraft(makeValidDraft());
		assert.equal(result.isValid, true);
		assert.deepEqual(result.errors, {});
		assert.equal(result.parsedLat, -6.9078);
		assert.equal(result.parsedLng, 109.7302);
		assert.equal(result.formattedOpeningHours, "08.00 - 20.00 WIB");
		assert.equal(result.formattedPriceRange, "Rp 12.000 - Rp 25.000");
	});

	it("supports Buka 24 Jam and equal min/max prices", () => {
		const result = validateAddPlaceDraft({
			...makeValidDraft(),
			openingHours: "Buka 24 Jam",
			priceRange: "15.000 - 15.000",
		});
		assert.equal(result.isValid, true);
		assert.equal(result.formattedOpeningHours, "Buka 24 Jam");
		assert.equal(result.formattedPriceRange, "Rp 15.000");
	});

	it("rejects incomplete, out-of-range, equal, or random opening hours", () => {
		for (const bad of [
			"",
			"08.00 - 2",
			"60.00 - 20.00",
			"25.00 - 20.00",
			"08.60 - 20.00",
			"08.00 - 08.00",
			"pagi",
		]) {
			const res = validateAddPlaceDraft({
				...makeValidDraft(),
				openingHours: bad,
			});
			assert.equal(res.isValid, false);
			assert.ok(res.errors.openingHours, `Expected error for "${bad}"`);
		}
	});

	it("rejects single-value, missing, too-small, inverted, or random prices", () => {
		for (const bad of [
			"",
			"12.000",
			"500 - 15.000",
			"30.000 - 15.000",
			"murah",
		]) {
			const res = validateAddPlaceDraft({
				...makeValidDraft(),
				priceRange: bad,
			});
			assert.equal(res.isValid, false);
			assert.ok(res.errors.priceRange, `Expected error for "${bad}"`);
		}
	});

	it("rejects gibberish names, addresses, descriptions, and missing photos", () => {
		const result = validateAddPlaceDraft({
			...makeValidDraft(),
			name: "12345",
			address: "1234567",
			description: "aaaaaaaaaaaaaaa",
			photoPreview: "",
		});
		assert.equal(result.isValid, false);
		assert.ok(result.errors.name);
		assert.ok(result.errors.address);
		assert.ok(result.errors.description);
		assert.ok(result.errors.photo);
	});
});

describe("combined numeric input formatters", () => {
	it("formats digits-only opening hours and blocks invalid clock digits immediately", () => {
		assert.equal(formatOpeningDigits("08002000"), "08.00 - 20.00");
		assert.equal(formatOpeningDigits("0800"), "08.00");
		assert.equal(formatOpeningDigits("08ab002"), "08.00 - 2");
		assert.equal(areTimeDigitsValid("6000"), false);
		assert.equal(areTimeDigitsValid("2500"), false);
		assert.equal(areTimeDigitsValid("0860"), false);
		assert.equal(areTimeDigitsValid("23590000"), true);

		const blockedSix = handleOpeningHoursInput("6", "");
		assert.equal(blockedSix.value, "");
		assert.ok(blockedSix.error);

		const blockedMin = handleOpeningHoursInput("086", "08");
		assert.equal(blockedMin.value, "08");
		assert.ok(blockedMin.error);

		const sameOpenClose = handleOpeningHoursInput(
			"08.00 - 08.00",
			"08.00 - 08.0",
		);
		assert.equal(sameOpenClose.value, "08.00 - 08.00");
		assert.ok(sameOpenClose.error);

		assert.deepEqual(handleOpeningHoursInput("Buka 24 Ja", "Buka 24 Jam"), {
			value: "",
		});
		assert.deepEqual(handleOpeningHoursInput("Buka 24 Jam0", "Buka 24 Jam"), {
			value: "0",
		});
	});

	it("formats combined Rupiah range input from digits and separators", () => {
		assert.equal(formatPriceRangeInput("12000", ""), "12.000");
		assert.equal(formatPriceRangeInput("12.000 ", "12.000"), "12.000 - ");
		assert.equal(
			formatPriceRangeInput("12.000 - 25000", "12.000 - "),
			"12.000 - 25.000",
		);
		assert.equal(formatPriceRangeInput("12.000 -", "12.000 - "), "12.000");
		assert.equal(
			formatPriceRangeInput("12000abc-25000xyz", ""),
			"12.000 - 25.000",
		);
	});
});
