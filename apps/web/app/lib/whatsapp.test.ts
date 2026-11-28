import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatWhatsappAfter62,
	formatWhatsappInput,
	getWhatsappAfter62TypingError,
	getWhatsappTypingError,
	normalizeIndonesianWhatsapp,
	toStoredWhatsappNumber,
	validateWhatsappNumber,
} from "./whatsapp";

describe("Indonesian WhatsApp input and validation", () => {
	it("strips non-digit characters and formats local and +62 numbers", () => {
		assert.equal(formatWhatsappInput("0812abc3456def7890"), "0812-3456-7890");
		assert.equal(formatWhatsappInput("+6281234567890"), "+62 812-3456-7890");
		assert.equal(formatWhatsappInput("6281234567890"), "62 812-3456-7890");
		assert.equal(formatWhatsappInput("08123456789012999"), "0812-3456-789012");
	});

	it("accepts valid 10-14 digit Indonesian mobile numbers", () => {
		assert.equal(validateWhatsappNumber("0812-0000-0101").valid, true);
		assert.equal(validateWhatsappNumber("0812345678").valid, true);
		assert.equal(validateWhatsappNumber("+62 812-3456-7890").valid, true);
		assert.equal(validateWhatsappNumber("6285712345678").valid, true);
		assert.equal(
			normalizeIndonesianWhatsapp("+62 812-3456-7890"),
			"081234567890",
		);
	});

	it("rejects short, non-Indonesian, invalid prefix, or repeated numbers", () => {
		assert.equal(validateWhatsappNumber("08123456").valid, false);
		assert.equal(validateWhatsappNumber("02112345678").valid, false);
		assert.equal(validateWhatsappNumber("08012345678").valid, false);
		assert.equal(validateWhatsappNumber("+14155552671").valid, false);
		assert.equal(validateWhatsappNumber("081111111111").valid, false);
		assert.equal(validateWhatsappNumber("0812-abcd-1234").valid, false);
	});

	it("flags invalid prefixes immediately while typing", () => {
		assert.equal(getWhatsappTypingError("08"), null);
		assert.equal(getWhatsappTypingError("+62"), null);
		assert.notEqual(getWhatsappTypingError("02"), null);
		assert.notEqual(getWhatsappTypingError("080"), null);
	});

	it("formats and validates numbers entered after a fixed +62 prefix", () => {
		assert.equal(formatWhatsappAfter62("81234567890"), "812-3456-7890");
		assert.equal(formatWhatsappAfter62("081234567890"), "812-3456-7890");
		assert.equal(formatWhatsappAfter62("+6281234567890"), "812-3456-7890");
		assert.equal(formatWhatsappAfter62("8123456789012"), "812-3456-789012");
		assert.equal(getWhatsappAfter62TypingError("81"), null);
		assert.notEqual(getWhatsappAfter62TypingError("7"), null);
		assert.notEqual(getWhatsappAfter62TypingError("80"), null);
		assert.equal(validateWhatsappNumber("+62 812-3456-789012").valid, true);
		assert.equal(toStoredWhatsappNumber("081234567890"), "+62 812-3456-7890");
		assert.equal(toStoredWhatsappNumber(""), "");
	});
});
