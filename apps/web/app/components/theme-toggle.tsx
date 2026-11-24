import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
	COLOR_SCHEME_STORAGE_KEY,
	syncColorSchemeFromStorage,
	toggleColorScheme,
} from "~/lib/theme";
import { cn } from "~/lib/utils";

interface ThemeToggleProps {
	className?: string;
	compact?: boolean;
}

/**
 * Two-state color-scheme toggle rendered with both theme branches in HTML and toggled
 * via CSS so SSR and pre-hydration paint match without flash or hydration mismatch.
 */
export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key === null || event.key === COLOR_SCHEME_STORAGE_KEY) {
				syncColorSchemeFromStorage();
			}
		};

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleMediaChange = () => {
			// Only update theme-color meta when following system; never delete a stored override.
			syncColorSchemeFromStorage();
		};

		window.addEventListener("storage", handleStorage);
		mediaQuery.addEventListener("change", handleMediaChange);
		return () => {
			window.removeEventListener("storage", handleStorage);
			mediaQuery.removeEventListener("change", handleMediaChange);
		};
	}, []);

	return (
		<Button
			type="button"
			variant="outline"
			onClick={() => {
				toggleColorScheme();
			}}
			className={cn("min-h-[44px] gap-2", compact ? "px-3" : "px-3", className)}
		>
			<span className="theme-when-light items-center gap-2">
				<Moon className="size-4" aria-hidden="true" />
				{!compact ? (
					<span className="hidden sm:inline" aria-hidden="true">
						Mode Gelap
					</span>
				) : null}
				<span className="sr-only">Aktifkan mode gelap</span>
			</span>
			<span className="theme-when-dark items-center gap-2">
				<Sun className="size-4" aria-hidden="true" />
				{!compact ? (
					<span className="hidden sm:inline" aria-hidden="true">
						Mode Terang
					</span>
				) : null}
				<span className="sr-only">Aktifkan mode terang</span>
			</span>
		</Button>
	);
}
