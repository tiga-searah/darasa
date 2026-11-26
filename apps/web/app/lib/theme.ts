export const COLOR_SCHEME_STORAGE_KEY = "color-scheme";
export const THEME_COLOR_LIGHT = "#16865B";
export const THEME_COLOR_DARK = "#111513";

export type ColorSchemePreference = "light dark" | "light" | "dark";
export type ResolvedColorScheme = "light" | "dark";

/**
 * Tiny synchronous FOUC-prevention script placed immediately after <meta name="color-scheme">.
 * Applies any stored override before first paint without blocking or using type="module".
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${COLOR_SCHEME_STORAGE_KEY}";var v=localStorage.getItem(k);var cs=document.querySelector('meta[name="color-scheme"]');var tc=document.querySelector('meta[name="theme-color"]');var sysDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;if(v==="light"||v==="dark"){if(cs)cs.setAttribute("content",v);if(tc)tc.setAttribute("content",v==="dark"?"${THEME_COLOR_DARK}":"${THEME_COLOR_LIGHT}");}else{if(cs)cs.setAttribute("content","light dark");if(tc)tc.setAttribute("content",sysDark?"${THEME_COLOR_DARK}":"${THEME_COLOR_LIGHT}");}}catch(e){}})();`;

export function getSystemColorScheme(): ResolvedColorScheme {
	if (typeof window === "undefined" || !window.matchMedia) {
		return "light";
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function getStoredColorScheme(): ResolvedColorScheme | null {
	if (typeof window === "undefined") return null;
	try {
		const value = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
		if (value === "light" || value === "dark") {
			return value;
		}
		return null;
	} catch {
		return null;
	}
}

export function getRenderedColorScheme(): ResolvedColorScheme {
	if (typeof document === "undefined") return "light";
	const meta = document.querySelector<HTMLMetaElement>(
		'meta[name="color-scheme"]',
	);
	const content = meta?.getAttribute("content");
	if (content === "light" || content === "dark") {
		return content;
	}
	return getSystemColorScheme();
}

export function applyColorSchemeMeta(preference: ColorSchemePreference): void {
	if (typeof document === "undefined") return;
	const csMeta = document.querySelector<HTMLMetaElement>(
		'meta[name="color-scheme"]',
	);
	if (csMeta) {
		csMeta.setAttribute("content", preference);
	}

	const resolved: ResolvedColorScheme =
		preference === "light dark" ? getSystemColorScheme() : preference;
	const tcMeta = document.querySelector<HTMLMetaElement>(
		'meta[name="theme-color"]',
	);
	if (tcMeta) {
		tcMeta.setAttribute(
			"content",
			resolved === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT,
		);
	}
}

export function syncColorSchemeFromStorage(): void {
	const stored = getStoredColorScheme();
	applyColorSchemeMeta(stored ?? "light dark");
}

export function setColorSchemePreference(
	target: ResolvedColorScheme,
): ResolvedColorScheme {
	const system = getSystemColorScheme();

	if (target !== system) {
		try {
			window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, target);
		} catch {
			// Still apply theme to the document even if storage is blocked.
		}
		applyColorSchemeMeta(target);
	} else {
		try {
			window.localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
		} catch {
			// Ignore storage errors while reverting to system preference.
		}
		applyColorSchemeMeta("light dark");
	}

	return target;
}

/**
 * Two-state toggle backing onto a tri-state data model ("light dark" | "light" | "dark"):
 * switches to the opposite of the currently rendered scheme, storing an override only when
 * it diverges from the current system preference and clearing storage when returning to system.
 */
export function toggleColorScheme(): ResolvedColorScheme {
	const current = getRenderedColorScheme();
	const target: ResolvedColorScheme = current === "dark" ? "light" : "dark";
	return setColorSchemePreference(target);
}
