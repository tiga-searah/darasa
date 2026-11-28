import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router";
import type { NavItem } from "~/data/nav-config";
import { cn } from "~/lib/utils";

export function MobileBottomNav({ items }: { items: NavItem[] }) {
	const location = useLocation();
	const listRef = useRef<HTMLUListElement>(null);
	const indicatorRef = useRef<HTMLSpanElement>(null);
	const hasPositionedRef = useRef(false);

	const updateIndicator = useCallback((instant = false) => {
		const mobileList = listRef.current;
		const mobilePill = indicatorRef.current;
		if (!mobileList || !mobilePill) return;

		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const activeTab = mobileList.querySelector<HTMLElement>(
			'[aria-current="page"]',
		);

		if (!activeTab) {
			gsap.to(mobilePill, { opacity: 0, duration: reduced ? 0 : 0.16 });
			return;
		}

		const listRect = mobileList.getBoundingClientRect();
		const tabRect = activeTab.getBoundingClientRect();
		const barWidth = Math.min(36, Math.max(24, tabRect.width * 0.48));
		const leftOffset =
			tabRect.left - listRect.left + (tabRect.width - barWidth) / 2;

		if (reduced || instant || !hasPositionedRef.current) {
			gsap.set(mobilePill, {
				x: leftOffset,
				width: barWidth,
				opacity: 1,
			});
			hasPositionedRef.current = true;
		} else {
			gsap.to(mobilePill, {
				x: leftOffset,
				width: barWidth,
				opacity: 1,
				duration: 0.28,
				ease: "power3.out",
				overwrite: "auto",
			});
		}
	}, []);

	useEffect(() => {
		const _syncKey = `${location.pathname}:${items.length}`;
		if (!_syncKey) return;
		const frame = window.requestAnimationFrame(() => updateIndicator());
		const settleTimer = window.setTimeout(() => updateIndicator(), 250);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(settleTimer);
		};
	}, [updateIndicator, location.pathname, items.length]);

	useEffect(() => {
		const handleResize = () => updateIndicator(true);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [updateIndicator]);

	return (
		<nav
			aria-label="Navigasi seluler"
			className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
		>
			<div className="relative mx-auto max-w-lg">
				<span
					ref={indicatorRef}
					aria-hidden="true"
					className="pointer-events-none absolute left-0 top-0 h-0.5 rounded-full bg-primary opacity-0"
				/>
				<ul
					ref={listRef}
					className="flex h-16 items-stretch justify-around px-1"
				>
					{items.map((item) => {
						const Icon = item.icon;
						const tabLabel = item.mobileLabel ?? item.label;
						return (
							<li key={item.to} className="flex min-w-0 flex-1">
								<NavLink
									to={item.to}
									end={item.to === "/"}
									aria-label={item.label}
									className={({ isActive }) =>
										cn(
											"relative flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] px-1 py-1.5 text-[10px] sm:text-[11px] font-semibold transition-colors duration-200 active:scale-[0.96]",
											isActive
												? "text-primary"
												: "text-muted-foreground hover:text-foreground",
										)
									}
								>
									{({ isActive }) => (
										<>
											<span
												className={cn(
													"relative inline-flex h-7 w-11 items-center justify-center rounded-full transition-[background-color,transform] duration-200",
													isActive
														? "scale-105 bg-primary-soft text-primary"
														: "",
												)}
											>
												<Icon className="size-5 shrink-0" aria-hidden="true" />
												{item.badge ? (
													<span className="absolute -top-0.5 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground tabular-nums">
														{item.badge}
													</span>
												) : null}
											</span>
											<span className="max-w-full truncate leading-none">
												{tabLabel}
											</span>
										</>
									)}
								</NavLink>
							</li>
						);
					})}
				</ul>
			</div>
		</nav>
	);
}
