import { BATANG_DISTRICTS, PLACE_CATEGORIES } from "~/data/batang-places";
import type { BatangDistrict, PlaceCategory } from "~/lib/types";

export interface AddPlaceDraft {
	name: string;
	category: PlaceCategory;
	district: BatangDistrict;
	address: string;
	lat: string;
	lng: string;
	openingHours: string;
	priceRange: string;
	description: string;
	photoPreview: string;
	legalityDocumentName: string;
	legalityDocumentUrl: string;
}

export type AddPlaceErrorField =
	| "name"
	| "category"
	| "district"
	| "address"
	| "lat"
	| "lng"
	| "openingHours"
	| "priceRange"
	| "description"
	| "photo"
	| "legalityDocument";

export type AddPlaceErrors = Partial<Record<AddPlaceErrorField, string>>;

export interface AddPlaceValidationResult {
	errors: AddPlaceErrors;
	isValid: boolean;
	parsedLat: number;
	parsedLng: number;
	formattedOpeningHours: string;
	formattedPriceRange: string;
}

export const BATANG_LAT_BOUNDS = { min: -7.5, max: -6.5 } as const;
export const BATANG_LNG_BOUNDS = { min: 109.4, max: 110.3 } as const;
export const MIN_PLACE_PRICE_IDR = 1_000;
export const MAX_PLACE_PRICE_IDR = 10_000_000;

export function sanitizeDigits(raw: string): string {
	return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function formatIdrDigits(rawDigits: string): string {
	const digits = sanitizeDigits(rawDigits);
	if (!digits) return "";
	return Number(digits).toLocaleString("id-ID");
}

/**
 * Validates whether a single digit at index `pos` (0..7) of "HHMMHHMM"
 * keeps the 24-hour clock time valid (HH: 00-23, MM: 00-59).
 */
export function isValidTimeDigitAt(
	prevDigits: string,
	pos: number,
	digit: string,
): boolean {
	if (!/^\d$/.test(digit) || pos < 0 || pos > 7) return false;
	const num = Number(digit);
	const slot = pos % 4;
	if (slot === 0) return num <= 2;
	if (slot === 1) {
		const hourTens = Number(prevDigits[pos - 1] ?? "0");
		return hourTens === 2 ? num <= 3 : true;
	}
	if (slot === 2) return num <= 5;
	return true;
}

export function areTimeDigitsValid(digits: string): boolean {
	if (digits.length > 8) return false;
	for (let i = 0; i < digits.length; i++) {
		if (!isValidTimeDigitAt(digits, i, digits[i])) return false;
	}
	return true;
}

/**
 * Formats up to 8 digits into "HH.MM - HH.MM" as the user types numbers only.
 */
export function formatOpeningDigits(raw: string): string {
	const digits = raw.replace(/\D/g, "").slice(0, 8);
	if (digits.length === 0) return "";
	if (digits.length <= 2) return digits;
	if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
	if (digits.length <= 6) {
		return `${digits.slice(0, 2)}.${digits.slice(2, 4)} - ${digits.slice(4)}`;
	}
	return `${digits.slice(0, 2)}.${digits.slice(2, 4)} - ${digits.slice(4, 6)}.${digits.slice(6)}`;
}

/**
 * Handles controlled editing of the single combined opening-hours field
 * while rejecting out-of-range clock digits (e.g. 60.00 or 25.00) immediately.
 */
export function handleOpeningHoursInput(
	nextRaw: string,
	prevValue: string,
): { value: string; error?: string } {
	if (prevValue === "Buka 24 Jam") {
		if (nextRaw.length < prevValue.length) return { value: "" };
		const addedDigits = nextRaw.replace("Buka 24 Jam", "").replace(/\D/g, "");
		if (!addedDigits) return { value: "" };
		if (!areTimeDigitsValid(addedDigits.slice(0, 8))) {
			return {
				value: prevValue,
				error: "Jam tidak valid: gunakan format 24 jam (00.00 - 23.59).",
			};
		}
		return { value: formatOpeningDigits(addedDigits) };
	}

	const prevDigits = prevValue.replace(/\D/g, "").slice(0, 8);
	const nextDigits = nextRaw.replace(/\D/g, "").slice(0, 8);

	if (nextDigits.length <= prevDigits.length) {
		if (!areTimeDigitsValid(nextDigits)) {
			return {
				value: prevValue,
				error: "Jam tidak valid: gunakan format 24 jam (00.00 - 23.59).",
			};
		}
		return { value: formatOpeningDigits(nextDigits) };
	}

	if (!areTimeDigitsValid(nextDigits)) {
		return {
			value: prevValue,
			error: "Jam tidak valid: gunakan format 24 jam (00.00 - 23.59).",
		};
	}

	const formatted = formatOpeningDigits(nextDigits);
	if (nextDigits.length === 8) {
		const check = parseOpeningHoursValue(formatted);
		if (check.error) {
			return { value: formatted, error: check.error };
		}
	}

	return { value: formatted };
}

/**
 * Formats a combined Rupiah price range input ("12.000 - 25.000") using only
 * digits and a separator ("-", space, or "/").
 */
export function formatPriceRangeInput(
	nextRaw: string,
	prevValue: string,
): string {
	const normalized = nextRaw.replace(/[–—/]/g, "-");

	if (normalized.includes("-")) {
		const [leftRaw, ...rest] = normalized.split("-");
		const rightRaw = rest.join("");
		const leftDigits = sanitizeDigits(leftRaw).slice(0, 8);
		const rightDigits = sanitizeDigits(rightRaw).slice(0, 8);

		if (!leftDigits) return "";
		if (
			prevValue.endsWith(" - ") &&
			normalized.endsWith(" -") &&
			!rightDigits
		) {
			return formatIdrDigits(leftDigits);
		}
		return `${formatIdrDigits(leftDigits)} - ${formatIdrDigits(rightDigits)}`;
	}

	const leftDigits = sanitizeDigits(normalized).slice(0, 8);
	if (!leftDigits) return "";

	if (!prevValue.includes("-") && /\s$/.test(normalized)) {
		return `${formatIdrDigits(leftDigits)} - `;
	}

	return formatIdrDigits(leftDigits);
}

/**
 * Converts a stored openingHours string (e.g. "06.00 - 15.00 WIB") into the editable form value.
 */
export function toEditableOpeningHours(stored: string): string {
	const trimmed = stored.trim();
	if (!trimmed) return "";
	if (trimmed === "Buka 24 Jam") return "Buka 24 Jam";
	return trimmed.replace(/\s*WIB$/i, "").trim();
}

/**
 * Converts a stored priceRange string (e.g. "Rp 12.000 - Rp 25.000") into the editable form value.
 */
export function toEditablePriceRange(stored: string): string {
	const trimmed = stored.trim();
	if (!trimmed) return "";
	const formatted = formatPriceRangeInput(trimmed, "");
	if (formatted && !formatted.includes("-")) {
		return `${formatted} - ${formatted}`;
	}
	return formatted;
}

const OPENING_HOURS_RE = /^(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})$/;

export function parseOpeningHoursValue(raw: string): {
	formatted: string;
	error?: string;
} {
	const trimmed = raw
		.trim()
		.replace(/\s*WIB$/i, "")
		.trim();
	if (!trimmed) {
		return {
			formatted: "",
			error:
				"Jam buka wajib diisi dengan 8 angka (contoh: 08002000) atau Buka 24 Jam.",
		};
	}
	if (trimmed === "Buka 24 Jam") {
		return { formatted: "Buka 24 Jam" };
	}

	const match = trimmed.match(OPENING_HOURS_RE);
	if (!match) {
		return {
			formatted: "",
			error: "Lengkapi jam buka dan jam tutup (contoh: 08.00 - 20.00).",
		};
	}

	const openH = Number(match[1]);
	const openM = Number(match[2]);
	const closeH = Number(match[3]);
	const closeM = Number(match[4]);

	if (openH > 23 || openM > 59 || closeH > 23 || closeM > 59) {
		return {
			formatted: "",
			error: "Format jam tidak valid (jam 00-23, menit 00-59).",
		};
	}

	if (openH === closeH && openM === closeM) {
		return {
			formatted: "",
			error:
				"Jam buka dan jam tutup tidak boleh sama (pilih Buka 24 Jam jika nonstop).",
		};
	}

	return {
		formatted: `${match[1]}.${match[2]} - ${match[3]}.${match[4]} WIB`,
	};
}

export function parsePriceRangeValue(raw: string): {
	formatted: string;
	error?: string;
} {
	const trimmed = raw.trim();
	if (!trimmed) {
		return {
			formatted: "",
			error:
				"Kisaran harga wajib diisi dengan angka Rupiah (contoh: 12.000 - 25.000).",
		};
	}

	const parts = trimmed.split("-");
	if (parts.length !== 2) {
		return {
			formatted: "",
			error:
				"Masukkan rentang harga termurah dan termahal (contoh: 12.000 - 25.000).",
		};
	}

	const minDigits = sanitizeDigits(parts[0]);
	const maxDigits = sanitizeDigits(parts[1]);
	if (!minDigits || !maxDigits) {
		return {
			formatted: "",
			error:
				"Lengkapi harga termurah dan termahal dalam angka (contoh: 12.000 - 25.000).",
		};
	}

	const minVal = Number(minDigits);
	const maxVal = Number(maxDigits);

	if (minVal < MIN_PLACE_PRICE_IDR) {
		return {
			formatted: "",
			error: `Harga termurah minimal Rp ${MIN_PLACE_PRICE_IDR.toLocaleString("id-ID")}.`,
		};
	}
	if (maxVal > MAX_PLACE_PRICE_IDR) {
		return {
			formatted: "",
			error: `Harga termahal maksimal Rp ${MAX_PLACE_PRICE_IDR.toLocaleString("id-ID")}.`,
		};
	}
	if (maxVal < minVal) {
		return {
			formatted: "",
			error: "Harga termahal harus sama atau lebih besar dari harga termurah.",
		};
	}

	const minFormatted = `Rp ${minVal.toLocaleString("id-ID")}`;
	const maxFormatted = `Rp ${maxVal.toLocaleString("id-ID")}`;
	return {
		formatted:
			minVal === maxVal ? minFormatted : `${minFormatted} - ${maxFormatted}`,
	};
}

function validatePlaceTextFields(
	draft: AddPlaceDraft,
	errors: AddPlaceErrors,
): void {
	const cleanName = draft.name.trim().replace(/\s+/g, " ");
	const nameLetterCount = (cleanName.match(/\p{L}/gu) ?? []).length;
	if (cleanName.length < 3 || cleanName.length > 120 || nameLetterCount < 2) {
		errors.name =
			"Nama tempat kuliner wajib diisi dengan huruf yang jelas (min. 3 karakter).";
	}

	if (!PLACE_CATEGORIES.includes(draft.category)) {
		errors.category = "Kategori tempat kuliner wajib dipilih.";
	}
	if (!BATANG_DISTRICTS.includes(draft.district)) {
		errors.district = "Kawasan Batang wajib dipilih.";
	}

	const cleanAddress = draft.address.trim().replace(/\s+/g, " ");
	const addressLetterCount = (cleanAddress.match(/\p{L}/gu) ?? []).length;
	if (
		cleanAddress.length < 6 ||
		cleanAddress.length > 250 ||
		addressLetterCount < 3
	) {
		errors.address =
			"Alamat atau patokan lokasi wajib diisi jelas (min. 6 karakter).";
	}

	const cleanDesc = draft.description.trim().replace(/\s+/g, " ");
	const descWords = cleanDesc ? cleanDesc.split(" ").filter(Boolean) : [];
	const descLetters = (cleanDesc.match(/\p{L}/gu) ?? []).length;
	const uniqueDescChars = new Set(cleanDesc.replace(/\s+/g, "").toLowerCase())
		.size;
	if (
		cleanDesc.length < 15 ||
		descWords.length < 3 ||
		descLetters < 10 ||
		uniqueDescChars < 5
	) {
		errors.description =
			"Deskripsi singkat wajib informatif (min. 15 karakter dan 3 kata).";
	}
}

function validatePlaceCoordinates(
	draft: AddPlaceDraft,
	errors: AddPlaceErrors,
): { parsedLat: number; parsedLng: number } {
	const latStr = draft.lat.trim();
	const lngStr = draft.lng.trim();
	const parsedLat = latStr ? Number(latStr) : Number.NaN;
	const parsedLng = lngStr ? Number(lngStr) : Number.NaN;

	if (
		!Number.isFinite(parsedLat) ||
		parsedLat < BATANG_LAT_BOUNDS.min ||
		parsedLat > BATANG_LAT_BOUNDS.max
	) {
		errors.lat = `Latitude wajib berada di wilayah Batang (${BATANG_LAT_BOUNDS.min} s.d. ${BATANG_LAT_BOUNDS.max}).`;
	}
	if (
		!Number.isFinite(parsedLng) ||
		parsedLng < BATANG_LNG_BOUNDS.min ||
		parsedLng > BATANG_LNG_BOUNDS.max
	) {
		errors.lng = `Longitude wajib berada di wilayah Batang (${BATANG_LNG_BOUNDS.min} s.d. ${BATANG_LNG_BOUNDS.max}).`;
	}

	return { parsedLat, parsedLng };
}

function validatePlaceAttachments(
	draft: AddPlaceDraft,
	errors: AddPlaceErrors,
): void {
	const photo = draft.photoPreview.trim();
	const hasValidPhoto =
		photo.startsWith("data:image/") || photo.startsWith("/images/");
	if (!hasValidPhoto) {
		errors.photo = "Foto tempat kuliner wajib diunggah.";
	}

	const legalityUrl = draft.legalityDocumentUrl.trim();
	if (
		legalityUrl &&
		!legalityUrl.startsWith("data:application/pdf") &&
		!legalityUrl.startsWith("data:image/")
	) {
		errors.legalityDocument =
			"Format surat legalitas tidak valid. Unggah PDF, JPG, PNG, atau WebP.";
	}
}

export function validateAddPlaceDraft(
	draft: AddPlaceDraft,
): AddPlaceValidationResult {
	const errors: AddPlaceErrors = {};

	validatePlaceTextFields(draft, errors);
	const { parsedLat, parsedLng } = validatePlaceCoordinates(draft, errors);

	const hoursCheck = parseOpeningHoursValue(draft.openingHours);
	if (hoursCheck.error) {
		errors.openingHours = hoursCheck.error;
	}

	const priceCheck = parsePriceRangeValue(draft.priceRange);
	if (priceCheck.error) {
		errors.priceRange = priceCheck.error;
	}

	validatePlaceAttachments(draft, errors);

	return {
		errors,
		isValid: Object.keys(errors).length === 0,
		parsedLat,
		parsedLng,
		formattedOpeningHours: hoursCheck.formatted,
		formattedPriceRange: priceCheck.formatted,
	};
}
