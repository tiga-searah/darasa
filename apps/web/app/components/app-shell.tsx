import gsap from "gsap";
import {
	Bookmark,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Compass,
	Gem,
	Home,
	Info,
	LayoutDashboard,
	LogIn,
	LogOut,
	MapPin,
	Moon,
	PlusCircle,
	Search,
	ShieldAlert,
	Star,
	Sun,
	UserPlus,
	X,
} from "lucide-react";
import {
	type FormEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useDarasa } from "~/context/darasa-store";
import { DEMO_ACCOUNTS } from "~/data/batang-places";
import {
	COLOR_SCHEME_STORAGE_KEY,
	setColorSchemePreference,
	syncColorSchemeFromStorage,
} from "~/lib/theme";
import { cn } from "~/lib/utils";

interface NavItem {
	to: string;
	label: string;
	mobileLabel?: string;
	icon: typeof Compass;
	badge?: string;
}

const ROLE_LABELS: Record<string, string> = {
	visitor: "Pengunjung",
	user: "Warga Terdaftar",
	owner: "Pemilik Usaha",
	admin: "Administrator",
};

const SHORT_ROLE_LABELS: Record<string, string> = {
	visitor: "Tamu",
	user: "Warga",
	owner: "Pemilik",
	admin: "Admin",
};

const GITHUB_REPO_URL = "https://github.com/tiga-searah/darasa";

function GitHubMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			className={className}
		>
			<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
		</svg>
	);
}

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
	const navigate = useNavigate();
	const [collapsed, setCollapsed] = useState(false);
	const [globalQuery, setGlobalQuery] = useState("");
	const [globalSearchFocused, setGlobalSearchFocused] = useState(false);

	const headerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		let rafId = 0;
		const updateHeaderOnScroll = () => {
			rafId = 0;
			const header = headerRef.current;
			if (!header) return;
			const progress = Math.min(1, Math.max(0, window.scrollY / 96));
			const pct = (progress * 100).toFixed(1);
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

	const sidebarRef = useRef<HTMLElement>(null);
	const navContainerRef = useRef<HTMLElement>(null);
	const activeIndicatorRef = useRef<HTMLSpanElement>(null);
	const mobileTabListRef = useRef<HTMLUListElement>(null);
	const mobileIndicatorRef = useRef<HTMLSpanElement>(null);
	const brandTextRef = useRef<HTMLDivElement>(null);
	const mainContentRef = useRef<HTMLDivElement>(null);
	const profilePopoverRef = useRef<HTMLDivElement>(null);
	const globalSearchBoxRef = useRef<HTMLDivElement>(null);
	const hasMountedSidebarRef = useRef(false);
	const hasPositionedDesktopPillRef = useRef(false);
	const hasPositionedMobilePillRef = useRef(false);
	const profilePopoverId = useId();
	const globalSearchInputId = useId();

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

	const globalSearchMatches = useMemo(() => {
		const q = globalQuery.trim().toLowerCase();
		if (!q) return [];
		return places
			.filter((place) => {
				const haystack =
					`${place.name} ${place.category} ${place.district} ${place.address}`.toLowerCase();
				return haystack.includes(q);
			})
			.slice(0, 5);
	}, [places, globalQuery]);

	const closeProfilePopover = useCallback(() => {
		try {
			profilePopoverRef.current?.hidePopover?.();
		} catch {
			// Ignore if popover is already closed or unsupported
		}
	}, []);

	// Sync color-scheme changes across tabs and OS preferences
	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key === null || event.key === COLOR_SCHEME_STORAGE_KEY) {
				syncColorSchemeFromStorage();
			}
		};
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleMediaChange = () => {
			syncColorSchemeFromStorage();
		};
		window.addEventListener("storage", handleStorage);
		mediaQuery.addEventListener("change", handleMediaChange);
		return () => {
			window.removeEventListener("storage", handleStorage);
			mediaQuery.removeEventListener("change", handleMediaChange);
		};
	}, []);

	// Close global search dropdown on outside pointer click
	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			if (!globalSearchBoxRef.current?.contains(event.target as Node)) {
				setGlobalSearchFocused(false);
			}
		};
		document.addEventListener("mousedown", handlePointerDown);
		return () => document.removeEventListener("mousedown", handlePointerDown);
	}, []);

	// Smoothly glide active pill across sidebar items & mobile bottom tab bar
	const updateActiveIndicators = useCallback((instant = false) => {
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		const nav = navContainerRef.current;
		const pill = activeIndicatorRef.current;
		if (nav && pill) {
			const activeLink = nav.querySelector<HTMLElement>(
				'[aria-current="page"]',
			);
			if (!activeLink) {
				gsap.to(pill, { opacity: 0, duration: reduced ? 0 : 0.16 });
			} else {
				const navRect = nav.getBoundingClientRect();
				const linkRect = activeLink.getBoundingClientRect();
				const topOffset = linkRect.top - navRect.top + nav.scrollTop;

				if (reduced || instant || !hasPositionedDesktopPillRef.current) {
					gsap.set(pill, {
						y: topOffset,
						height: linkRect.height,
						opacity: 1,
					});
					hasPositionedDesktopPillRef.current = true;
				} else {
					gsap.to(pill, {
						y: topOffset,
						height: linkRect.height,
						opacity: 1,
						duration: 0.28,
						ease: "power3.out",
						overwrite: "auto",
					});
				}
			}
		}

		const mobileList = mobileTabListRef.current;
		const mobilePill = mobileIndicatorRef.current;
		if (mobileList && mobilePill) {
			const activeTab = mobileList.querySelector<HTMLElement>(
				'[aria-current="page"]',
			);
			if (!activeTab) {
				gsap.to(mobilePill, { opacity: 0, duration: reduced ? 0 : 0.16 });
			} else {
				const listRect = mobileList.getBoundingClientRect();
				const tabRect = activeTab.getBoundingClientRect();
				const barWidth = Math.min(36, Math.max(24, tabRect.width * 0.48));
				const leftOffset =
					tabRect.left - listRect.left + (tabRect.width - barWidth) / 2;

				if (reduced || instant || !hasPositionedMobilePillRef.current) {
					gsap.set(mobilePill, {
						x: leftOffset,
						width: barWidth,
						opacity: 1,
					});
					hasPositionedMobilePillRef.current = true;
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
			}
		}
	}, []);

	useEffect(() => {
		const _syncKey = `${location.pathname}:${collapsed}:${managementLinks.length}`;
		if (!_syncKey) return;
		const frame = window.requestAnimationFrame(() => updateActiveIndicators());
		const settleTimer = window.setTimeout(() => updateActiveIndicators(), 250);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(settleTimer);
		};
	}, [
		updateActiveIndicators,
		location.pathname,
		collapsed,
		managementLinks.length,
	]);

	useEffect(() => {
		const handleResize = () => updateActiveIndicators(true);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [updateActiveIndicators]);

	// Desktop sidebar width collapse/expand
	useEffect(() => {
		const sidebar = sidebarRef.current;
		if (!sidebar) return;
		if (!hasMountedSidebarRef.current) {
			hasMountedSidebarRef.current = true;
			return;
		}

		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const targetWidth = collapsed ? 80 : 256;

		if (reduced) {
			sidebar.style.width = `${targetWidth}px`;
			updateActiveIndicators(true);
			return;
		}

		const ctx = gsap.context(() => {
			gsap.to(sidebar, {
				width: targetWidth,
				duration: 0.26,
				ease: "power3.out",
				onUpdate: () => updateActiveIndicators(true),
				onComplete: () => updateActiveIndicators(true),
			});
		}, sidebarRef);

		return () => {
			ctx.kill();
		};
	}, [collapsed, updateActiveIndicators]);

	// Subtle page entrance & popover auto-close on route change
	useEffect(() => {
		const _path = location.pathname;
		setGlobalSearchFocused(false);
		closeProfilePopover();

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
	}, [location.pathname, closeProfilePopover]);

	const handleGlobalSearchSubmit = (e: FormEvent) => {
		e.preventDefault();
		setExploreFilters({ keyword: globalQuery.trim() });
		setGlobalSearchFocused(false);
		if (location.pathname !== "/explore") {
			navigate("/explore");
		}
	};

	const renderNavItems = (items: NavItem[]) => (
		<SidebarMenu>
			{items.map((item) => {
				const Icon = item.icon;
				return (
					<SidebarMenuItem key={item.to}>
						<NavLink
							to={item.to}
							end={item.to === "/"}
							aria-label={collapsed ? item.label : undefined}
							title={collapsed ? item.label : undefined}
							className={({ isActive }) =>
								cn(
									"group relative z-10 flex min-h-[44px] items-center gap-3 overflow-hidden rounded-[10px] pl-[18px] pr-3 py-2 text-sm font-semibold transition-[color,transform,background-color] duration-200 active:scale-[0.98]",
									isActive
										? "text-primary-foreground"
										: "text-foreground hover:bg-secondary/80 hover:text-secondary-foreground",
								)
							}
						>
							{({ isActive }) => (
								<>
									<span className="relative inline-flex shrink-0 items-center justify-center">
										<Icon
											className={cn(
												"size-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
												isActive
													? "text-primary-foreground"
													: "text-muted-foreground group-hover:text-secondary-foreground",
											)}
											aria-hidden="true"
										/>
										{collapsed && item.badge ? (
											<span
												className={cn(
													"absolute -right-2 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-4 tabular-nums",
													isActive
														? "bg-card text-primary"
														: "bg-primary text-primary-foreground",
												)}
											>
												{item.badge}
											</span>
										) : null}
									</span>
									<span
										aria-hidden={collapsed}
										className={cn(
											"flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 motion-reduce:transition-none",
											collapsed
												? "max-w-0 opacity-0"
												: "max-w-[170px] opacity-100",
										)}
									>
										<span className="truncate">{item.label}</span>
										{item.badge ? (
											<Badge
												variant={isActive ? "secondary" : "outline"}
												className="shrink-0 tabular-nums"
											>
												{item.badge}
											</Badge>
										) : null}
									</span>
								</>
							)}
						</NavLink>
					</SidebarMenuItem>
				);
			})}
		</SidebarMenu>
	);

	const renderSidebarNavigation = () => (
		<nav
			ref={navContainerRef}
			aria-label="Menu utama"
			className="relative flex flex-col gap-2"
		>
			<span
				ref={activeIndicatorRef}
				aria-hidden="true"
				className="pointer-events-none absolute left-0 right-0 top-0 z-0 rounded-[10px] bg-primary opacity-0 shadow-xs"
			/>

			<SidebarGroup>{renderNavItems(discoveryLinks)}</SidebarGroup>

			{managementLinks.length > 0 ? (
				<SidebarGroup className="border-t border-sidebar-border pt-3">
					<p
						aria-hidden={collapsed}
						className={cn(
							"overflow-hidden whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-[max-height,opacity,padding] duration-200 motion-reduce:transition-none",
							collapsed ? "max-h-0 pb-0 opacity-0" : "max-h-6 pb-1 opacity-100",
						)}
					>
						Pengelolaan
					</p>
					{renderNavItems(managementLinks)}
				</SidebarGroup>
			) : null}
		</nav>
	);

	const mobileTabItems = [...discoveryLinks, ...managementLinks];

	// GitHub logo stacked ABOVE copyright at the very bottom of sidebar
	const renderSidebarCopyrightFooter = (isIconOnly = false) => (
		<div className="flex flex-col items-center gap-2 text-center">
			<a
				href={GITHUB_REPO_URL}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Repositori GitHub Darasa oleh Team Lorem Ipsum"
				title="GitHub Darasa"
				className="inline-flex size-9 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
			>
				<GitHubMark className="size-5" />
			</a>
			<p className="whitespace-nowrap text-[11px] font-medium leading-tight text-muted-foreground">
				{isIconOnly ? "© 2026" : "© 2026 Team Lorem Ipsum"}
			</p>
		</div>
	);

	const showGlobalDropdown =
		globalSearchFocused && globalQuery.trim().length > 0;

	return (
		<div className="flex min-h-dvh bg-card text-foreground">
			{/* Desktop Sidebar (>= 1024px) */}
			<Sidebar
				ref={sidebarRef}
				aria-label="Navigasi utama Darasa"
				className="hidden lg:flex w-[256px] shrink-0 flex-col justify-between sticky top-0 h-dvh overflow-x-hidden"
			>
				<SidebarHeader
					className={cn(
						"h-16 justify-center border-b border-sidebar-border py-0 transition-[padding] duration-200",
						collapsed ? "px-2" : "px-4",
					)}
				>
					<div
						className={cn(
							"flex items-center",
							collapsed ? "justify-center" : "justify-between gap-2",
						)}
					>
						<Link
							to="/"
							aria-label="Darasa Beranda"
							aria-hidden={collapsed}
							tabIndex={collapsed ? -1 : undefined}
							className={cn(
								"flex min-w-0 items-center gap-2.5 rounded-[8px] p-1 transition-colors hover:bg-background",
								collapsed && "hidden",
							)}
						>
							{/* TODO: Replace temporary Darasa mark with final brand logo SVG */}
							<span
								aria-hidden="true"
								className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-primary text-base font-bold text-primary-foreground"
							>
								D
							</span>
							<div
								ref={brandTextRef}
								className="overflow-hidden whitespace-nowrap leading-tight"
							>
								<span className="block text-base font-bold tracking-tight text-foreground">
									Darasa
								</span>
								<span className="block text-xs text-muted-foreground">
									Kuliner Batang
								</span>
							</div>
						</Link>

						<Button
							variant="outline"
							size="icon"
							onClick={() => setCollapsed((prev) => !prev)}
							aria-expanded={!collapsed}
							aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
							title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
							className={cn(
								"shrink-0 transition-[width,height] duration-200",
								collapsed ? "size-8 rounded-[7px]" : "size-9",
							)}
						>
							{collapsed ? (
								<ChevronRight className="size-4" aria-hidden="true" />
							) : (
								<ChevronLeft className="size-5" aria-hidden="true" />
							)}
						</Button>
					</div>
				</SidebarHeader>

				<SidebarContent className="py-3">
					{renderSidebarNavigation()}
				</SidebarContent>

				<SidebarFooter className="bg-sidebar p-3">
					{renderSidebarCopyrightFooter(collapsed)}
				</SidebarFooter>
			</Sidebar>

			{/* Main Column + Mobile Bottom Tab Bar */}
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
								<span
									aria-hidden="true"
									className="flex size-8 items-center justify-center rounded-[8px] bg-primary text-sm font-bold text-primary-foreground"
								>
									D
								</span>
								<div
									className={cn(
										"leading-tight",
										collapsed ? "block" : "hidden sm:block",
									)}
								>
									<span className="block text-base font-bold tracking-tight text-foreground">
										Darasa
									</span>
									{collapsed ? (
										<span className="hidden lg:block text-[11px] text-muted-foreground">
											Kuliner Batang
										</span>
									) : null}
								</div>
							</Link>
						</div>

						{/* Navbar Right: Global Search + Profile (with Dark/Light Mode Settings) */}
						<div className="flex flex-1 items-center justify-end gap-2.5 min-w-0">
							<div
								ref={globalSearchBoxRef}
								className="relative flex-1 max-w-xs sm:max-w-sm"
							>
								<search>
									<form
										onSubmit={handleGlobalSearchSubmit}
										className="relative flex items-center"
									>
										<Label htmlFor={globalSearchInputId} className="sr-only">
											Pencarian global kuliner Batang
										</Label>
										<Input
											id={globalSearchInputId}
											type="search"
											value={globalQuery}
											onFocus={() => setGlobalSearchFocused(true)}
											onChange={(e) => {
												setGlobalQuery(e.target.value);
												setGlobalSearchFocused(true);
											}}
											onKeyDown={(e) => {
												if (e.key === "Escape") {
													setGlobalSearchFocused(false);
												}
											}}
											placeholder="Cari warung, menu, atau kawasan..."
											className="h-10 rounded-full border-border bg-background pl-4 pr-10 text-sm"
										/>
										<button
											type="submit"
											aria-label="Cari kuliner secara global"
											title="Cari"
											className="absolute right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										>
											<Search className="size-4" aria-hidden="true" />
										</button>
									</form>
								</search>

								{showGlobalDropdown ? (
									<section
										aria-label="Hasil pencarian global cepat"
										className="absolute right-0 top-full z-50 mt-2 w-full min-w-[260px] rounded-[12px] border border-border bg-popover p-2 text-popover-foreground shadow-lg"
									>
										{globalSearchMatches.length === 0 ? (
											<p className="px-3 py-2 text-xs text-muted-foreground">
												Tidak ada tempat cocok untuk &ldquo;{globalQuery.trim()}
												&rdquo;.
											</p>
										) : (
											<ul className="space-y-1">
												{globalSearchMatches.map((place) => (
													<li key={place.id}>
														<Link
															to={`/places/${place.slug}`}
															onClick={() => setGlobalSearchFocused(false)}
															className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-muted"
														>
															<div className="min-w-0">
																<p className="truncate text-xs font-semibold text-foreground">
																	{place.name}
																</p>
																<p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
																	<MapPin
																		className="size-3 shrink-0 text-primary"
																		aria-hidden="true"
																	/>
																	<span>{place.district}</span>
																	<span>·</span>
																	<span>{place.category}</span>
																</p>
															</div>
															<span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-foreground tabular-nums">
																<Star
																	className="size-3 fill-accent-yellow text-accent-yellow"
																	aria-hidden="true"
																/>
																{place.reviewCount > 0
																	? place.averageRating.toFixed(1)
																	: "Baru"}
															</span>
														</Link>
													</li>
												))}
											</ul>
										)}
										<div className="mt-1.5 border-t border-border pt-1.5">
											<button
												type="button"
												onClick={() => {
													setExploreFilters({ keyword: globalQuery.trim() });
													setGlobalSearchFocused(false);
													navigate("/explore");
												}}
												className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft"
											>
												<span>Lihat semua hasil di Jelajah &rarr;</span>
											</button>
										</div>
									</section>
								) : null}
							</div>

							<button
								type="button"
								popoverTarget={profilePopoverId}
								popoverTargetAction="toggle"
								aria-controls={profilePopoverId}
								aria-label={`Menu profil ${currentUser.name}`}
								title={`${currentUser.name} (${ROLE_LABELS[currentUser.role] ?? currentUser.role})`}
								className={cn(
									"relative inline-flex size-10 sm:size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
									currentUser.role === "visitor"
										? "border-border hover:border-primary"
										: "border-primary hover:border-primary-hover",
								)}
							>
								<img
									src="/images/avatar-profile.svg"
									alt={`Foto profil ${currentUser.name}`}
									width={44}
									height={44}
									className="size-full rounded-full object-cover"
								/>
							</button>

							<div
								id={profilePopoverId}
								ref={profilePopoverRef}
								popover="auto"
								className="darasa-profile-popover p-4 gap-3"
							>
								<div className="flex items-center gap-3">
									<img
										src="/images/avatar-profile.svg"
										alt=""
										width={40}
										height={40}
										className="size-10 shrink-0 rounded-full border border-border object-cover"
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold text-foreground">
											{currentUser.name}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{ROLE_LABELS[currentUser.role] ?? currentUser.role}
										</p>
									</div>
								</div>

								{currentUser.role === "visitor" ? (
									<div className="grid grid-cols-2 gap-2">
										<Button asChild size="sm" className="w-full">
											<Link to="/login" onClick={closeProfilePopover}>
												<LogIn className="size-4" aria-hidden="true" />
												Masuk
											</Link>
										</Button>
										<Button
											asChild
											variant="outline"
											size="sm"
											className="w-full"
										>
											<Link to="/register" onClick={closeProfilePopover}>
												<UserPlus className="size-4" aria-hidden="true" />
												Daftar
											</Link>
										</Button>
									</div>
								) : (
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											logout();
											closeProfilePopover();
										}}
										className="w-full justify-start"
									>
										<LogOut className="size-4" aria-hidden="true" />
										Keluar Akun
									</Button>
								)}

								<Separator />

								{/* Settings: Dark Mode / Light Mode */}
								<fieldset className="space-y-2 border-0 p-0 m-0">
									<legend className="px-1 text-xs font-semibold text-muted-foreground">
										Settings · Tema Tampilan
									</legend>
									<div className="grid grid-cols-2 gap-1.5">
										<button
											type="button"
											onClick={() => setColorSchemePreference("light")}
											className="darasa-theme-btn-light flex min-h-[38px] items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition-colors"
										>
											<Sun className="size-3.5" aria-hidden="true" />
											<span>Light Mode</span>
										</button>
										<button
											type="button"
											onClick={() => setColorSchemePreference("dark")}
											className="darasa-theme-btn-dark flex min-h-[38px] items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition-colors"
										>
											<Moon className="size-3.5" aria-hidden="true" />
											<span>Dark Mode</span>
										</button>
									</div>
								</fieldset>

								<Separator />

								<fieldset className="space-y-2 border-0 p-0 m-0">
									<legend className="px-1 text-xs font-semibold text-muted-foreground">
										Peran Prototipe
									</legend>
									<div className="grid grid-cols-2 gap-1.5">
										{DEMO_ACCOUNTS.map((acc) => {
											const isSelected = currentUser.id === acc.id;
											return (
												<button
													key={acc.id}
													type="button"
													aria-pressed={isSelected}
													onClick={() => {
														switchDemoAccount(acc.id);
														closeProfilePopover();
													}}
													className={cn(
														"flex min-h-[36px] items-center justify-between gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-medium transition-colors",
														isSelected
															? "border-primary bg-primary-soft text-primary-hover"
															: "border-border bg-background text-foreground hover:bg-muted",
													)}
												>
													<span className="truncate">
														{SHORT_ROLE_LABELS[acc.role] ?? acc.role}
													</span>
													{isSelected ? (
														<Check
															className="size-3.5 shrink-0"
															aria-hidden="true"
														/>
													) : null}
												</button>
											);
										})}
									</div>
								</fieldset>
							</div>
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

				{/* Mobile Bottom Tab Bar (< 1024px) */}
				<nav
					aria-label="Navigasi seluler"
					className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
				>
					<div className="relative mx-auto max-w-lg">
						<span
							ref={mobileIndicatorRef}
							aria-hidden="true"
							className="pointer-events-none absolute left-0 top-0 h-0.5 rounded-full bg-primary opacity-0"
						/>
						<ul
							ref={mobileTabListRef}
							className="flex h-16 items-stretch justify-around px-1"
						>
							{mobileTabItems.map((item) => {
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
														<Icon
															className="size-5 shrink-0"
															aria-hidden="true"
														/>
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

				{toast ? (
					<div
						aria-live="polite"
						className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-[12px] border border-border bg-card px-4 py-3 text-sm shadow-lg sm:left-auto sm:right-5 lg:bottom-5"
					>
						<div className="pointer-events-auto flex w-full items-center gap-2.5">
							{toast.tone === "success" ? (
								<CheckCircle2
									className="size-4 shrink-0 text-primary"
									aria-hidden="true"
								/>
							) : (
								<Info
									className="size-4 shrink-0 text-primary"
									aria-hidden="true"
								/>
							)}
							<p role="status" className="flex-1 font-medium text-foreground">
								{toast.message}
							</p>
							<button
								type="button"
								onClick={dismissToast}
								aria-label="Tutup notifikasi"
								className="inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-background hover:text-foreground"
							>
								<X className="size-4" aria-hidden="true" />
							</button>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
