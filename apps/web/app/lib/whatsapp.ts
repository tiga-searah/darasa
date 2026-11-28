const MAX_LOCAL_DIGITS = 14;
const MAX_INTL_SUFFIX_DIGITS = 13;

function groupDigits(digits: string, firstGroupSize: number): string {
	if (digits.length <= firstGroupSize) return digits;
	const head = digits.slice(0, firstGroupSize);
	const rest = digits.slice(firstGroupSize);
	if (rest.length <= 4) return `${head}-${rest}`;
	return `${head}-${rest.slice(0, 4)}-${rest.slice(4)}`;
}

/**
 * Sanitizes and formats an Indonesian WhatsApp input string so only digits
 * (and an optional leading `+`) are kept.
 */
export function formatWhatsappInput(raw: string): string {
	const trimmed = raw.trimStart();
	const hasPlus = trimmed.startsWith("+");
	const digits = raw.replace(/\D/g, "");

	if (!digits) return hasPlus ? "+" : "";

	if (hasPlus && digits.startsWith("62")) {
		const rest = digits.slice(2, 2 + MAX_INTL_SUFFIX_DIGITS);
		return rest ? `+62 ${groupDigits(rest, 3)}` : "+62";
	}

	if (hasPlus) {
		return `+${digits.slice(0, 14)}`;
	}

	if (digits.startsWith("628")) {
		const rest = digits.slice(2, 2 + MAX_INTL_SUFFIX_DIGITS);
		return `62 ${groupDigits(rest, 3)}`;
	}

	return groupDigits(digits.slice(0, MAX_LOCAL_DIGITS), 4);
}

/**
 * Formats the portion after a fixed `+62` prefix. Leading `0` or `62` from
 * pasted local/international numbers is stripped automatically.
 */
export function formatWhatsappAfter62(raw: string): string {
	let digits = raw.replace(/\D/g, "");
	if (digits.startsWith("628")) {
		digits = digits.slice(2);
	} else if (digits.startsWith("0")) {
		digits = digits.slice(1);
	}
	return groupDigits(digits.slice(0, MAX_INTL_SUFFIX_DIGITS), 3);
}

/**
 * Formats a `+62` suffix into the stored `+62 8xx-...` representation, or `""` when empty.
 */
export function toStoredWhatsappNumber(suffix: string): string {
	const formatted = formatWhatsappAfter62(suffix);
	return formatted ? `+62 ${formatted}` : "";
}

/**
 * Returns an inline prefix error for input typed after a fixed `+62` prefix.
 */
export function getWhatsappAfter62TypingError(
	formattedSuffix: string,
): string | null {
	const digits = formattedSuffix.replace(/\D/g, "");
	if (!digits) return null;
	if (!digits.startsWith("8")) {
		return "Setelah +62 harus diawali angka 8 (contoh: 812-3456-7890).";
	}
	if (digits.length >= 2 && !/^8[1-9]/.test(digits)) {
		return "Digit setelah +62 8 harus 1–9 (contoh: 812-3456-7890).";
	}
	return null;
}

/**
 * Normalizes an Indonesian WhatsApp number to local `08...` digits, or returns
 * null if the characters/prefix are not valid.
 */
export function normalizeIndonesianWhatsapp(raw: string): string | null {
	const stripped = raw.trim().replace(/[\s-]/g, "");
	if (!stripped) return null;
	if (!/^\+?\d+$/.test(stripped)) return null;

	let digits = stripped.startsWith("+") ? stripped.slice(1) : stripped;
	if (stripped.startsWith("+") && !digits.startsWith("62")) {
		return null;
	}
	if (digits.startsWith("62")) {
		digits = `0${digits.slice(2)}`;
	}
	return digits;
}

/**
 * Returns an inline prefix error while typing when the prefix already violates
 * Indonesian mobile WhatsApp rules (`08[1-9]...` or `+628[1-9]...`).
 */
export function getWhatsappTypingError(formatted: string): string | null {
	if (!formatted) return null;
	const stripped = formatted.replace(/[\s-]/g, "");
	if (stripped === "+" || stripped === "+6" || stripped === "+62") return null;
	if (stripped === "0" || stripped === "6" || stripped === "62") return null;

	const normalized = normalizeIndonesianWhatsapp(formatted);
	if (!normalized) {
		return "Nomor WhatsApp Indonesia harus diawali 08 atau +628.";
	}
	if (normalized.length >= 2 && !normalized.startsWith("08")) {
		return "Nomor WhatsApp Indonesia harus diawali 08 atau +628.";
	}
	if (normalized.length >= 3 && !/^08[1-9]/.test(normalized)) {
		return "Digit setelah 08 harus 1–9 (contoh: 0812-3456-7890).";
	}
	return null;
}

export function validateWhatsappNumber(raw: string): {
	valid: boolean;
	normalized?: string;
	error?: string;
} {
	const normalized = normalizeIndonesianWhatsapp(raw);
	if (!normalized) {
		return {
			valid: false,
			error:
				"Masukkan nomor WhatsApp Indonesia yang valid (contoh: 0812-3456-7890 atau +62 812-3456-7890).",
		};
	}

	if (!/^08[1-9]\d{7,11}$/.test(normalized)) {
		return {
			valid: false,
			error:
				"Nomor WhatsApp harus diawali 081–089 atau +628 dengan panjang 10–14 digit.",
		};
	}

	if (/^08(\d)\1{7,11}$/.test(normalized)) {
		return {
			valid: false,
			error: "Masukkan nomor WhatsApp aktif yang benar, bukan angka berulang.",
		};
	}

	return { valid: true, normalized };
}
