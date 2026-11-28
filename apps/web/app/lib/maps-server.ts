import {
	buildParsedResult,
	isAllowedGoogleMapsHost,
	type ParsedMapsResult,
	parseGoogleMapsCoordinates,
} from "~/lib/maps";

const MAX_REDIRECT_HOPS = 6;
const RESOLVE_TIMEOUT_MS = 8000;
const MAX_HTML_SCAN_BYTES = 262_144;

export interface ResolveMapsLinkResponse {
	ok: boolean;
	result?: ParsedMapsResult;
	resolvedUrl?: string;
	error?: string;
}

function validateGoogleMapsUrl(rawUrl: string): URL | null {
	try {
		const parsed = new URL(rawUrl);
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			return null;
		}
		if (!isAllowedGoogleMapsHost(parsed.hostname)) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

function extractCoordinatesFromHtml(html: string): ParsedMapsResult | null {
	const patterns: Array<{ regex: RegExp; exactPin: boolean; swap?: boolean }> =
		[
			// Google Maps OG staticmap meta tag
			{
				regex: /staticmap\?[^"'<>]*center=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i,
				exactPin: true,
			},
			// Embedded !3d...!4d... payload in page state
			{
				regex: /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
				exactPin: true,
			},
			{
				regex: /!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/,
				exactPin: true,
				swap: true,
			},
			// Fallback @lat,lng in canonical/redirect links inside HTML
			{
				regex: /@(-?\d+\.\d+),(-?\d+\.\d+)/,
				exactPin: false,
			},
		];

	for (const { regex, exactPin, swap } of patterns) {
		const match = html.match(regex);
		if (!match) continue;
		const a = Number(match[1]);
		const b = Number(match[2]);
		const built = buildParsedResult(swap ? b : a, swap ? a : b, exactPin);
		if (built) return built;
	}

	// Check meta refresh or canonical link pointing to google.com/maps/...
	const urlMatch = html.match(
		/https:\/\/(?:www\.)?google\.com(?:\.id)?\/maps\/[^"'<>\s]+/i,
	);
	if (urlMatch) {
		const parsed = parseGoogleMapsCoordinates(urlMatch[0]);
		if (parsed.result) return parsed.result;
	}

	return null;
}

function extractSearchQueryFromMapsUrl(urlStr: string): string | null {
	try {
		const url = new URL(urlStr);
		const qParam =
			url.searchParams.get("q") ||
			url.searchParams.get("query") ||
			url.searchParams.get("destination");
		if (qParam && qParam.trim().length >= 3) {
			return qParam.trim();
		}
		const placeMatch = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/i);
		if (placeMatch?.[1]) {
			const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, " "))
				.replace(/[,]+/g, " ")
				.trim();
			if (decoded.length >= 3 && !/^-?\d/.test(decoded)) {
				return decoded;
			}
		}
		return null;
	} catch {
		return null;
	}
}

async function geocodePlaceQuery(
	query: string,
	fetchImpl: typeof fetch,
): Promise<ParsedMapsResult | null> {
	try {
		const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
		searchUrl.searchParams.set("format", "jsonv2");
		searchUrl.searchParams.set("countrycodes", "id");
		searchUrl.searchParams.set("limit", "1");
		searchUrl.searchParams.set("q", query);

		const res = await fetchImpl(searchUrl.toString(), {
			headers: {
				Accept: "application/json",
				"User-Agent": "Darasa/1.0 (+https://darasa.local)",
			},
			signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
		});
		if (!res.ok) return null;
		const items = (await res.json()) as Array<{ lat?: string; lon?: string }>;
		const first = items[0];
		if (!first?.lat || !first?.lon) return null;
		return buildParsedResult(Number(first.lat), Number(first.lon), false);
	} catch {
		return null;
	}
}

/**
 * Resolves a Google Maps short link (e.g. `maps.app.goo.gl`) or query link on the server
 * by safely following Google-owned redirects and extracting coordinates.
 */
export async function resolveGoogleMapsLink(
	rawUrl: string,
	fetchImpl: typeof fetch = fetch,
): Promise<ResolveMapsLinkResponse> {
	const initial = validateGoogleMapsUrl(rawUrl.trim());
	if (!initial) {
		return {
			ok: false,
			error:
				"Tautan harus berupa URL Google Maps yang valid (google.com/maps atau maps.app.goo.gl).",
		};
	}

	const directParsed = parseGoogleMapsCoordinates(initial.toString());
	if (directParsed.result?.exactPin) {
		return {
			ok: true,
			result: directParsed.result,
			resolvedUrl: initial.toString(),
		};
	}

	let currentUrl = initial.toString();
	let bestResult: ParsedMapsResult | undefined = directParsed.result;
	let finalHtml = "";

	try {
		for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
			const res = await fetchImpl(currentUrl, {
				method: "GET",
				redirect: "manual",
				headers: {
					Accept: "text/html,application/xhtml+xml",
					"User-Agent":
						"Mozilla/5.0 (compatible; DarasaBot/1.0; +https://darasa.local)",
				},
				signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
			});

			const location = res.headers.get("location");
			if (res.status >= 300 && res.status < 400 && location) {
				const nextUrlObj = validateGoogleMapsUrl(
					new URL(location, currentUrl).toString(),
				);
				if (!nextUrlObj) {
					break;
				}
				currentUrl = nextUrlObj.toString();
				const hopParsed = parseGoogleMapsCoordinates(currentUrl);
				if (hopParsed.result) {
					bestResult = hopParsed.result;
					if (hopParsed.result.exactPin) {
						return {
							ok: true,
							result: hopParsed.result,
							resolvedUrl: currentUrl,
						};
					}
				}
				continue;
			}

			if (res.url && validateGoogleMapsUrl(res.url)) {
				currentUrl = res.url;
				const finalUrlParsed = parseGoogleMapsCoordinates(currentUrl);
				if (finalUrlParsed.result) {
					bestResult = finalUrlParsed.result;
					if (finalUrlParsed.result.exactPin) {
						return {
							ok: true,
							result: finalUrlParsed.result,
							resolvedUrl: currentUrl,
						};
					}
				}
			}

			if (res.ok) {
				const contentType = res.headers.get("content-type") ?? "";
				if (contentType.includes("text/html") || contentType === "") {
					const text = await res.text();
					finalHtml = text.slice(0, MAX_HTML_SCAN_BYTES);
				}
			}
			break;
		}
	} catch {
		if (bestResult) {
			return { ok: true, result: bestResult, resolvedUrl: currentUrl };
		}
		return {
			ok: false,
			error:
				"Gagal menghubungi tautan Google Maps. Periksa koneksi atau salin koordinat langsung dari peta.",
		};
	}

	if (finalHtml) {
		const htmlResult = extractCoordinatesFromHtml(finalHtml);
		if (htmlResult) {
			return { ok: true, result: htmlResult, resolvedUrl: currentUrl };
		}
	}

	if (bestResult) {
		return { ok: true, result: bestResult, resolvedUrl: currentUrl };
	}

	const queryName = extractSearchQueryFromMapsUrl(currentUrl);
	if (queryName) {
		const geocoded = await geocodePlaceQuery(queryName, fetchImpl);
		if (geocoded) {
			return {
				ok: true,
				result: {
					...geocoded,
					message: `Lokasi diperkirakan dari "${queryName}" (${geocoded.lat}, ${geocoded.lng}). Geser pin tepat ke bangunan usaha.`,
				},
				resolvedUrl: currentUrl,
			};
		}
	}

	return {
		ok: false,
		resolvedUrl: currentUrl,
		error:
			"Koordinat belum ditemukan dari tautan tersebut. Buka tautan di Google Maps lalu salin koordinatnya (contoh: -6.9078, 109.7302).",
	};
}
