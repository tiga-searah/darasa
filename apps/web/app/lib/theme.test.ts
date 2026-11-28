import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
	COLOR_SCHEME_STORAGE_KEY,
	cycleColorScheme,
	getRenderedColorScheme,
	getThemePreference,
	setColorSchemePreference,
	syncColorSchemeFromStorage,
	THEME_COLOR_DARK,
	THEME_COLOR_LIGHT,
} from "./theme";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

function setupThemeDom(options?: {
	systemDark?: boolean;
	stored?: string | null;
}) {
	const storage = new Map<string, string>();
	if (options?.stored) {
		storage.set(COLOR_SCHEME_STORAGE_KEY, options.stored);
	}

	const csMeta = {
		content: options?.stored ?? "light dark",
		getAttribute(name: string) {
			return name === "content" ? this.content : null;
		},
		setAttribute(name: string, value: string) {
			if (name === "content") this.content = value;
		},
	};

	const tcMeta = {
		content: THEME_COLOR_LIGHT,
		getAttribute(name: string) {
			return name === "content" ? this.content : null;
		},
		setAttribute(name: string, value: string) {
			if (name === "content") this.content = value;
		},
	};

	let systemDark = options?.systemDark ?? false;
	const dispatched: string[] = [];

	Object.defineProperty(globalThis, "document", {
		configurable: true,
		writable: true,
		value: {
			querySelector(selector: string) {
				if (selector === 'meta[name="color-scheme"]') return csMeta;
				if (selector === 'meta[name="theme-color"]') return tcMeta;
				return null;
			},
		},
	});

	Object.defineProperty(globalThis, "window", {
		configurable: true,
		writable: true,
		value: {
			localStorage: {
				getItem: (key: string) => storage.get(key) ?? null,
				setItem: (key: string, value: string) => storage.set(key, value),
				removeItem: (key: string) => storage.delete(key),
			},
			matchMedia: () => ({
				matches: systemDark,
				addEventListener: () => {},
				removeEventListener: () => {},
			}),
			dispatchEvent: (event: Event) => {
				dispatched.push(event.type);
				return true;
			},
		},
	});

	return {
		storage,
		csMeta,
		tcMeta,
		dispatched,
		setSystemDark(value: boolean) {
			systemDark = value;
		},
	};
}

afterEach(() => {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		writable: true,
		value: originalWindow,
	});
	Object.defineProperty(globalThis, "document", {
		configurable: true,
		writable: true,
		value: originalDocument,
	});
});

describe("tri-state theme helper (light, dark, system)", () => {
	it("persists explicit light even when OS is already light", () => {
		const env = setupThemeDom({ systemDark: false });

		setColorSchemePreference("light");
		assert.equal(env.storage.get(COLOR_SCHEME_STORAGE_KEY), "light");
		assert.equal(env.csMeta.content, "light");
		assert.equal(env.tcMeta.content, THEME_COLOR_LIGHT);
		assert.equal(getThemePreference(), "light");

		env.setSystemDark(true);
		syncColorSchemeFromStorage();
		assert.equal(env.csMeta.content, "light");
		assert.equal(getRenderedColorScheme(), "light");
	});

	it("persists explicit dark and reverts cleanly to system", () => {
		const env = setupThemeDom({ systemDark: false });

		setColorSchemePreference("dark");
		assert.equal(env.storage.get(COLOR_SCHEME_STORAGE_KEY), "dark");
		assert.equal(env.csMeta.content, "dark");
		assert.equal(env.tcMeta.content, THEME_COLOR_DARK);
		assert.equal(getThemePreference(), "dark");

		setColorSchemePreference("system");
		assert.equal(env.storage.has(COLOR_SCHEME_STORAGE_KEY), false);
		assert.equal(env.csMeta.content, "light dark");
		assert.equal(env.tcMeta.content, THEME_COLOR_LIGHT);
		assert.equal(getThemePreference(), "system");

		env.setSystemDark(true);
		syncColorSchemeFromStorage();
		assert.equal(env.csMeta.content, "light dark");
		assert.equal(env.tcMeta.content, THEME_COLOR_DARK);
		assert.equal(getRenderedColorScheme(), "dark");
	});

	it("cycles light -> dark -> system -> light", () => {
		setupThemeDom({ systemDark: false });

		assert.equal(getThemePreference(), "system");
		assert.equal(cycleColorScheme(), "light");
		assert.equal(cycleColorScheme(), "dark");
		assert.equal(cycleColorScheme(), "system");
		assert.equal(cycleColorScheme(), "light");
	});
});
