import gsap from "gsap";
import {
	Bookmark,
	Compass,
	Gem,
	Home,
	LayoutDashboard,
	MoreHorizontal,
	PlusCircle,
	ShieldAlert,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { DesktopSidebar } from "~/components/shell/desktop-sidebar";
import { GlobalSearch } from "~/components/shell/global-search";
import { MobileBottomNav } from "~/components/shell/mobile-bottom-nav";
import { MobileMoreSheet } from "~/components/shell/mobile-more-sheet";
import { ProfilePopover } from "~/components/shell/profile-popover";
import { ToastBanner } from "~/components/shell/toast-banner";
import { useDarasa } from "~/context/darasa-store";
import type { NavItem } from "~/data/nav-config";
import { subscribeColorSchemeSync } from "~/lib/theme";
import { cn } from "~/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
	const {
		currentUser,
		switchDemoAccount,
		logout,
		claims,
		anomalies,
		places,
		bookmarkedPlaceIds,
		setExploreFilters,
		toast,
		dismissToast,
	} = useDarasa();
	const location = useLocation();
	const [collapsed, setCollapsed] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);

	const headerRef = useRef<HTMLElement>(null);
	const mainContentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let rafId = 0;
		const updateHeaderOnScroll = () => {
			rafId = 0;
			const header = headerRef.current;
			if (!header) return;
			const progress = Math.min(1, Math.max(0, window.scrollY / 96));
			const pct = (progress * 90).toFixed(1);
			header.style.backgroundColor =
				progress <= 0
					? "transparent"
					: `color-mix(in srgb, var(--card) ${pct}%, transparent)`;
			header.style.borderBottomColor =
				progress <= 0
					? "transparent"
					: `color-mix(in srgb, var(--border) ${pct}%, transparent)`;
		};

		const handleScroll = () => {
			if (!rafId) {
				rafId = window.requestAnimationFrame(updateHeaderOnScroll);
			}
		};

		updateHeaderOnScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
			if (rafId) window.cancelAnimationFrame(rafId);
		};
	}, []);

	useEffect(() => subscribeColorSchemeSync(), []);

	useEffect(() => {
		const _path = location.pathname;
		setMoreOpen(false);
		const el = mainContentRef.current;
		if (!_path || !el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				el,
				{ opacity: 0, y: 6 },
				{ opacity: 1, y: 0, duration: 0.2, ease: "power2.out" },
			);
		}, mainContentRef);

		return () => ctx.revert();
	}, [location.pathname]);

	const pendingClaimCount = claims.filter((c) => c.status === "pending").length;
	const openAnomalyCount = anomalies.filter(
		(a) => a.resolution === "open",
	).length;
	const pendingPlaceCount = places.filter((p) => p.isPendingModeration).length;
	const adminAttentionCount =
		pendingClaimCount + openAnomalyCount + pendingPlaceCount;

	const discoveryLinks = useMemo<NavItem[]>(
		() => [
			{ to: "/", label: "Beranda", icon: Home },
			{ to: "/explore", label: "Jelajah", icon: Compass },
			{
				to: "/hidden-gem",
				label: "Hidden Gems",
				mobileLabel: "Hidden Gem",
				icon: Gem,
			},
			{ to: "/contribute", label: "Kontribusi", icon: PlusCircle },
			{
				to: "/bookmarks",
				label: "Disimpan",
				icon: Bookmark,
				badge:
					bookmarkedPlaceIds.length > 0
						? String(bookmarkedPlaceIds.length)
						: undefined,
			},
		],
		[bookmarkedPlaceIds.length],
	);

	const managementLinks = useMemo<NavItem[]>(() => {
		const items: NavItem[] = [];
		if (currentUser.role === "owner") {
			items.push({
				to: "/owner",
				label: "Usahamu",
				icon: LayoutDashboard,
			});
		}
		if (currentUser.role === "admin") {
			items.push({
				to: "/admin",
				label: "Verifikasi Admin",
				mobileLabel: "Admin",
				icon: ShieldAlert,
				badge:
					adminAttentionCount > 0 ? String(adminAttentionCount) : undefined,
			});
		}
		return items;
	}, [currentUser.role, adminAttentionCount]);

	const navItems = useMemo(
		() => [...discoveryLinks, ...managementLinks],
		[discoveryLinks, managementLinks],
	);

	const mobileNavItems = useMemo<NavItem[]>(
		() => [
			{ to: "/", label: "Beranda", icon: Home },
			{ to: "/explore", label: "Jelajah", icon: Compass },
			{
				to: "/hidden-gem",
				label: "Hidden Gems",
				mobileLabel: "Hidden Gems",
				icon: Gem,
			},
			{ to: "/contribute", label: "Kontribusi", icon: PlusCircle },
			{
				to: "/more",
				label: "Lainnya",
				icon: MoreHorizontal,
				badge:
					currentUser.role === "admin" && adminAttentionCount > 0
						? String(adminAttentionCount)
						: undefined,
			},
		],
		[currentUser.role, adminAttentionCount],
	);

	return (
		<div className="flex min-h-dvh bg-card text-foreground">
			<DesktopSidebar
				collapsed={collapsed}
				onToggleCollapse={() => setCollapsed((prev) => !prev)}
				items={navItems}
			/>

			<div className="flex min-w-0 flex-1 flex-col bg-card">
				<header
					ref={headerRef}
					className="sticky top-0 z-30 border-b border-transparent bg-transparent"
				>
					<div className="flex h-16 w-full items-center justify-between gap-3 px-4 md:px-8 xl:px-10">
						<div className="flex items-center gap-2.5 shrink-0">
							<Link
								to="/"
								className={cn(
									"flex items-center gap-2.5 rounded-[8px] p-1 transition-colors hover:bg-background",
									!collapsed && "lg:hidden",
								)}
								aria-label="Darasa Beranda"
							>
								<img
									src="/images/darasa.webp"
									alt=""
									width={32}
									height={32}
									className="size-8 shrink-0 object-contain"
								/>
								<span
									className={cn(
										"text-base font-bold tracking-tight text-foreground",
										collapsed ? "block" : "hidden sm:block",
									)}
								>
									Darasa
								</span>
							</Link>
						</div>

						<div className="flex flex-1 items-center justify-end gap-2.5 min-w-0">
							<GlobalSearch
								places={places}
								onApplyExploreKeyword={(keyword) =>
									setExploreFilters({ keyword })
								}
							/>

							<ProfilePopover
								currentUser={currentUser}
								onSwitchDemoAccount={switchDemoAccount}
								onLogout={logout}
							/>
						</div>
					</div>
				</header>

				<main
					id="main-content"
					tabIndex={-1}
					className="-mt-16 flex-1 overflow-x-clip bg-card pt-16"
				>
					<div
						ref={mainContentRef}
						className="mx-auto max-w-[1440px] px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-6 xl:px-10 xl:py-7"
					>
						{children}
					</div>
				</main>

				<MobileBottomNav
					items={mobileNavItems}
					moreOpen={moreOpen}
					onOpenMore={() => setMoreOpen(true)}
				/>

				<MobileMoreSheet
					open={moreOpen}
					onOpenChange={setMoreOpen}
					currentUser={currentUser}
					bookmarkCount={bookmarkedPlaceIds.length}
					adminAttentionCount={adminAttentionCount}
				/>

				<ToastBanner toast={toast} onDismiss={dismissToast} />
			</div>
		</div>
	);
}
