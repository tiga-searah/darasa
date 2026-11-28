import {
	BATANG_LAT_BOUNDS,
	BATANG_LNG_BOUNDS,
} from "~/components/contribute/add-place-validation";

export interface ParsedMapsResult {
	lat: string;
	lng: string;
	inBatangBounds: boolean;
	exactPin: boolean;
	message: string;
}

export interface ParseMapsOutput {
	result?: ParsedMapsResult;
	needsServerResolve?: boolean;
	resolvedUrlCandidate?: string;
	warning?: string;
}

export function isWithinBatangBounds(lat: number, lng: number): boolean {
	return (
		Number.isFinite(lat) &&
		Number.isFinite(lng) &&
		lat >= BATANG_LAT_BOUNDS.min &&
		lat <= BATANG_LAT_BOUNDS.max &&
		lng >= BATANG_LNG_BOUNDS.min &&
		lng <= BATANG_LNG_BOUNDS.max
	);
}

/**
 * Extracts the first http(s) URL from pasted text (handles Google Maps share text).
 */
export function extractGoogleMapsUrl(raw: string): string | null {
	const match = raw.match(/https?:\/\/[^\s"'<>]+/i);
	if (!match) return null;
	return match[0].replace(/[),.;]+$/, "");
}

export function isAllowedGoogleMapsHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	return (
		host === "goo.gl" ||
		host === "g.co" ||
		host.endsWith(".goo.gl") ||
		host === "google.com" ||
		host === "google.co.id" ||
		host.endsWith(".google.com") ||
		host.endsWith(".google.co.id")
	);
}

export function isShortGoogleMapsUrl(raw: string): boolean {
	const urlStr = extractGoogleMapsUrl(raw);
	if (!urlStr) return false;
	try {
		const host = new URL(urlStr).hostname.toLowerCase();
		return (
			host === "maps.app.goo.gl" ||
			host === "app.goo.gl" ||
			(host === "goo.gl" && /\/maps\b/i.test(urlStr)) ||
			host === "g.co"
		);
	} catch {
		return false;
	}
}

export function isGoogleMapsUrl(raw: string): boolean {
	const urlStr = extractGoogleMapsUrl(raw);
	if (!urlStr) return false;
	try {
		const url = new URL(urlStr);
		if (!isAllowedGoogleMapsHost(url.hostname)) return false;
		return (
			isShortGoogleMapsUrl(urlStr) ||
			url.hostname.toLowerCase().startsWith("maps.") ||
			url.pathname.toLowerCase().startsWith("/maps")
		);
	} catch {
		return false;
	}
}

function safeDecode(raw: string): string {
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

function parseDmsToken(
	deg: string,
	min: string,
	sec: string,
	hemi: string,
): number | null {
	const d = Number(deg);
	const m = Number(min);
	const s = Number(sec);
	if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(s)) {
		return null;
	}
	const decimal = d + m / 60 + s / 3600;
	const sign = /[SW]/i.test(hemi) ? -1 : 1;
	return sign * decimal;
}

function matchDmsPair(text: string): { lat: number; lng: number } | null {
	const dmsRe =
		/(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]\s*([NS])[\s,+]+(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]\s*([EW])/i;
	const m = text.match(dmsRe);
	if (!m) return null;
	const lat = parseDmsToken(m[1], m[2], m[3], m[4]);
	const lng = parseDmsToken(m[5], m[6], m[7], m[8]);
	if (lat === null || lng === null) return null;
	return { lat, lng };
}

export function buildParsedResult(
	parsedLat: number,
	parsedLng: number,
	exactPin: boolean,
): ParsedMapsResult | null {
	if (
		!Number.isFinite(parsedLat) ||
		!Number.isFinite(parsedLng) ||
		Math.abs(parsedLat) > 90 ||
		Math.abs(parsedLng) > 180
	) {
		return null;
	}

	const lat = parsedLat.toFixed(6);
	const lng = parsedLng.toFixed(6);
	const inBatangBounds = isWithinBatangBounds(parsedLat, parsedLng);

	if (!inBatangBounds) {
		return {
			lat,
			lng,
			inBatangBounds: false,
			exactPin,
			message:
				"Koordinat berada di luar wilayah Kabupaten Batang. Periksa kembali atau geser pin ke lokasi yang benar.",
		};
	}

	return {
		lat,
		lng,
		inBatangBounds: true,
		exactPin,
		message: exactPin
			? `Koordinat presisi berhasil diambil (${lat}, ${lng}).`
			: `Koordinat kamera Google Maps diambil (${lat}, ${lng}). Periksa dan geser pin jika titik belum pas di bangunan.`,
	};
}

/**
 * Extracts coordinates from a Google Maps URL or raw `lat, lng` / DMS string.
 * Prioritizes exact pin tokens (`!3d...!4d...`, `!2d...!3d...`, `?q=`/`?ll=`, DMS)
 * over viewport camera center (`@lat,lng`) so pins do not drift.
 */
export function parseGoogleMapsCoordinates(raw: string): ParseMapsOutput {
	const trimmed = raw.trim();
	if (!trimmed) return {};

	const decoded = safeDecode(trimmed);
	const candidates = decoded === trimmed ? [trimmed] : [trimmed, decoded];

	const patterns: Array<{ regex: RegExp; exactPin: boolean; swap?: boolean }> =
		[
			// Exact place pin coordinates inside Google Maps data payload (!3d<lat>!4d<lng>)
			{ regex: /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, exactPin: true },
			// Google Maps embed / pb coordinates (!2d<lng>!3d<lat>)
			{
				regex: /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/,
				exactPin: true,
				swap: true,
			},
			// Query/center parameters (including q=loc:lat,lng and URL-encoded commas)
			{
				regex:
					/[?&](?:q|ll|query|center|daddr|saddr)=(?:loc:)?(-?\d+(?:\.\d+)?)(?:\s*,\s*|\s*\+\s*)(-?\d+(?:\.\d+)?)/i,
				exactPin: true,
			},
			// /place/<lat>,<lng> or /search/<lat>,<lng>
			{
				regex:
					/\/(?:place|search)\/(-?\d+(?:\.\d+)?)(?:\s*,\s*|\s*\+\s*)(-?\d+(?:\.\d+)?)/i,
				exactPin: true,
			},
			// Raw "lat, lng" input
			{
				regex: /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/,
				exactPin: true,
			},
			// Viewport center fallback (only when no exact pin token exists in URL)
			{ regex: /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, exactPin: false },
		];

	for (const text of candidates) {
		for (const { regex, exactPin, swap } of patterns) {
			const match = text.match(regex);
			if (!match) continue;
			const first = Number(match[1]);
			const second = Number(match[2]);
			const result = buildParsedResult(
				swap ? second : first,
				swap ? first : second,
				exactPin,
			);
			if (result) return { result };
		}

		const dms = matchDmsPair(text);
		if (dms) {
			const result = buildParsedResult(dms.lat, dms.lng, true);
			if (result) return { result };
		}
	}

	const urlCandidate = extractGoogleMapsUrl(trimmed);
	if (urlCandidate && isGoogleMapsUrl(urlCandidate)) {
		return {
			needsServerResolve: true,
			resolvedUrlCandidate: urlCandidate,
			warning: isShortGoogleMapsUrl(urlCandidate)
				? "Mengambil koordinat dari tautan pendek Google Maps..."
				: "Mencari koordinat dari tautan Google Maps...",
		};
	}

	return {
		warning:
			"Format tautan atau koordinat belum dikenali. Tempel URL Google Maps lengkap, tautan maps.app.goo.gl, atau format -6.9078, 109.7302.",
	};
}
