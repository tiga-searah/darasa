import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	getThemePreference,
	setColorSchemePreference,
	subscribeColorSchemeSync,
	type ThemeMode,
} from "~/lib/theme";
import { cn } from "~/lib/utils";

const THEME_OPTIONS: readonly {
	mode: ThemeMode;
	label: string;
	checkClassName: string;
	icon: typeof Sun;
}[] = [
	{
		mode: "light",
		label: "Light mode",
		checkClassName: "theme-check-light",
		icon: Sun,
	},
	{
		mode: "dark",
		label: "Dark mode",
		checkClassName: "theme-check-dark",
		icon: Moon,
	},
	{
		mode: "system",
		label: "System",
		checkClassName: "theme-check-system",
		icon: Monitor,
	},
];

interface ThemeMenuOptionsProps {
	onSelect?: (mode: ThemeMode) => void;
	className?: string;
}

/**
 * Tri-state theme menu list (Light mode, Dark mode, System (Light/Dark)) with
 * CSS-driven active checkmarks to avoid SSR hydration mismatch.
 */
export function ThemeMenuOptions({
	onSelect,
	className,
}: ThemeMenuOptionsProps) {
	const [activeMode, setActiveMode] = useState<ThemeMode | null>(null);

	useEffect(() => {
		setActiveMode(getThemePreference());
		return subscribeColorSchemeSync(setActiveMode);
	}, []);

	return (
		<div className={cn("flex flex-col gap-0.5", className)}>
			{THEME_OPTIONS.map(({ mode, label, checkClassName, icon: Icon }) => (
				<button
					key={mode}
					type="button"
					role="menuitemradio"
					aria-checked={activeMode === null ? undefined : activeMode === mode}
					onClick={() => {
						setColorSchemePreference(mode);
						onSelect?.(mode);
					}}
					className="flex min-h-[38px] w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-left text-sm font-medium text-popover-foreground transition-colors hover:bg-muted/80 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
				>
					<Icon
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
					<span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
						<span>{label}</span>
						{mode === "system" ? (
							<span className="text-muted-foreground font-normal">
								<span className="theme-sys-light">(Light)</span>
								<span className="theme-sys-dark">(Dark)</span>
							</span>
						) : null}
					</span>
					<span
						className={cn(
							checkClassName,
							"ml-auto shrink-0 items-center text-primary",
						)}
						aria-hidden="true"
					>
						<Check className="size-4 stroke-[2.25]" />
					</span>
				</button>
			))}
		</div>
	);
}

interface ThemeToggleProps {
	collapsed?: boolean;
	className?: string;
}

/**
 * Sidebar theme trigger displaying the currently rendered mode (Light mode / Dark mode)
 * and opening a floating menu to pick Light mode, Dark mode, or System.
 */
export function ThemeToggle({
	collapsed = false,
	className,
}: ThemeToggleProps) {
	const [open, setOpen] = useState(false);
	const [menuPos, setMenuPos] = useState<{ left: number; bottom: number }>({
		left: 88,
		bottom: 88,
	});
	const triggerRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const menuId = useId();

	const updatePosition = useCallback(() => {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (!rect) return;
		const menuWidth = 224;
		const maxLeft = Math.max(8, window.innerWidth - menuWidth - 8);
		const preferredLeft = collapsed ? rect.right + 10 : rect.right - 24;
		const left = Math.min(Math.max(8, preferredLeft), maxLeft);
		const bottom = Math.max(12, window.innerHeight - rect.bottom);
		setMenuPos({ left, bottom });
	}, [collapsed]);

	useEffect(() => {
		if (!open) return;
		updatePosition();

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (
				triggerRef.current?.contains(target) ||
				menuRef.current?.contains(target)
			) {
				return;
			}
			setOpen(false);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
				triggerRef.current?.focus();
			}
		};

		const handleReposition = () => updatePosition();

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		window.addEventListener("resize", handleReposition);
		window.addEventListener("scroll", handleReposition, true);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("resize", handleReposition);
			window.removeEventListener("scroll", handleReposition, true);
		};
	}, [open, updatePosition]);

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				aria-label="Pengaturan tema tampilan"
				title={collapsed ? "Tema tampilan" : undefined}
				onClick={() => {
					if (!open) updatePosition();
					setOpen((prev) => !prev);
				}}
				className={cn(
					"group relative flex min-h-[44px] w-full items-center gap-3 overflow-hidden rounded-[10px] pl-[18px] pr-3 py-2 text-sm font-semibold transition-[color,transform,background-color] duration-200 active:scale-[0.98]",
					open
						? "bg-secondary/80 text-secondary-foreground"
						: "text-foreground hover:bg-secondary/80 hover:text-secondary-foreground",
					className,
				)}
			>
				<span className="relative inline-flex shrink-0 items-center justify-center">
					<Sun
						className={cn(
							"theme-rendered-light size-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
							open
								? "text-secondary-foreground"
								: "text-muted-foreground group-hover:text-secondary-foreground",
						)}
						aria-hidden="true"
					/>
					<Moon
						className={cn(
							"theme-rendered-dark size-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
							open
								? "text-secondary-foreground"
								: "text-muted-foreground group-hover:text-secondary-foreground",
						)}
						aria-hidden="true"
					/>
				</span>
				<span
					aria-hidden={collapsed}
					className={cn(
						"flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 motion-reduce:transition-none",
						collapsed ? "max-w-0 opacity-0" : "max-w-[170px] opacity-100",
					)}
				>
					<span className="theme-rendered-light truncate">Light mode</span>
					<span className="theme-rendered-dark truncate">Dark mode</span>
				</span>
			</button>

			{open && typeof document !== "undefined"
				? createPortal(
						<div
							id={menuId}
							ref={menuRef}
							role="menu"
							aria-label="Pilih tema tampilan"
							style={{
								left: `${menuPos.left}px`,
								bottom: `${menuPos.bottom}px`,
							}}
							className="fixed z-50 w-56 rounded-[12px] border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
						>
							<ThemeMenuOptions onSelect={() => setOpen(false)} />
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
