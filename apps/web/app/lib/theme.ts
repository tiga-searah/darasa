export const COLOR_SCHEME_STORAGE_KEY = "color-scheme";
export const THEME_COLOR_LIGHT = "#16865B";
export const THEME_COLOR_DARK = "#111513";

export type ColorSchemePreference = "light dark" | "light" | "dark";
export type ResolvedColorScheme = "light" | "dark";
export type ThemeMode = "light" | "dark" | "system";

export const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];
export const THEME_CHANGE_EVENT = "darasa:theme-change";

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

export function getThemePreference(): ThemeMode {
	if (typeof document !== "undefined") {
		const content = document
			.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
			?.getAttribute("content");
		if (content === "light" || content === "dark") {
			return content;
		}
		if (content === "light dark") {
			return "system";
		}
	}
	return getStoredColorScheme() ?? "system";
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

	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
	}
}

export function syncColorSchemeFromStorage(): void {
	const stored = getStoredColorScheme();
	applyColorSchemeMeta(stored ?? "light dark");
}

export function setColorSchemePreference(target: ThemeMode): ThemeMode {
	if (target === "light" || target === "dark") {
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
 * Cycles through explicit light, explicit dark, and system preference.
 */
export function cycleColorScheme(): ThemeMode {
	const current = getThemePreference();
	const currentIndex = THEME_MODES.indexOf(current);
	const next = THEME_MODES[(currentIndex + 1) % THEME_MODES.length];
	return setColorSchemePreference(next);
}

/**
 * Subscribes to cross-tab storage, OS color-scheme changes, and in-tab theme updates.
 */
export function subscribeColorSchemeSync(
	onThemeChange?: (mode: ThemeMode) => void,
): () => void {
	if (typeof window === "undefined") {
		return () => {};
	}

	const notify = () => {
		onThemeChange?.(getThemePreference());
	};

	const handleStorage = (event: StorageEvent) => {
		if (event.key === null || event.key === COLOR_SCHEME_STORAGE_KEY) {
			syncColorSchemeFromStorage();
			notify();
		}
	};

	const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
	const handleMediaChange = () => {
		syncColorSchemeFromStorage();
		notify();
	};

	const handleThemeChange = () => {
		notify();
	};

	window.addEventListener("storage", handleStorage);
	window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
	mediaQuery?.addEventListener("change", handleMediaChange);

	return () => {
		window.removeEventListener("storage", handleStorage);
		window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
		mediaQuery?.removeEventListener("change", handleMediaChange);
	};
}
