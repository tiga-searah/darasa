import gsap from "gsap";
import {
	Award,
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
	Menu,
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
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
	const [mobileOpen, setMobileOpen] = useState(false);
	const [globalQuery, setGlobalQuery] = useState("");
	const [globalSearchFocused, setGlobalSearchFocused] = useState(false);

	const sidebarRef = useRef<HTMLElement>(null);
	const navContainerRef = useRef<HTMLElement>(null);
	const activeIndicatorRef = useRef<HTMLSpanElement>(null);
	const brandTextRef = useRef<HTMLDivElement>(null);
	const mainContentRef = useRef<HTMLDivElement>(null);
	const profilePopoverRef = useRef<HTMLDivElement>(null);
	const globalSearchBoxRef = useRef<HTMLDivElement>(null);
	const hasMountedSidebarRef = useRef(false);
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
			{ to: "/", label: "Home", icon: Home },
			{ to: "/explore", label: "Jelajah", icon: Compass },
			{ to: "/hidden-gem", label: "Hidden Gems", icon: Gem },
			{ to: "/submit-place", label: "Contribute", icon: PlusCircle },
			{
				to: "/bookmarks",
				label: "Bookmark",
				icon: Bookmark,
				badge:
					bookmarkedPlaceIds.length > 0
						? String(bookmarkedPlaceIds.length)
						: undefined,
			},
		],
		[bookmarkedPlaceIds.length],
	);

	const managementLinks = useMemo<NavItem[]>(
		() => [
			{ to: "/claim", label: "Klaim Usaha", icon: Award },
			{ to: "/owner", label: "Dasbor Pemilik", icon: LayoutDashboard },
			{
				to: "/admin",
				label: "Verifikasi Admin",
				icon: ShieldAlert,
				badge:
					adminAttentionCount > 0 ? String(adminAttentionCount) : undefined,
			},
		],
		[adminAttentionCount],
	);

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

	// Vertical active indicator glide between sidebar discovery items
	const updateActiveIndicator = useCallback(() => {
		const nav = navContainerRef.current;
		const indicator = activeIndicatorRef.current;
		if (!nav || !indicator) return;

		const activeLink = nav.querySelector<HTMLElement>('[aria-current="page"]');
		if (!activeLink) {
			gsap.to(indicator, { opacity: 0, duration: 0.15 });
			return;
		}

		const navRect = nav.getBoundingClientRect();
		const linkRect = activeLink.getBoundingClientRect();
		const topOffset = linkRect.top - navRect.top + nav.scrollTop;
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (reduced) {
			indicator.style.transform = `translateY(${topOffset}px)`;
			indicator.style.height = `${linkRect.height}px`;
			indicator.style.opacity = "1";
			return;
		}

		gsap.to(indicator, {
			y: topOffset,
			height: linkRect.height,
			opacity: 1,
			duration: 0.24,
			ease: "power3.out",
		});
	}, []);

	useEffect(() => {
		const _syncKey = `${location.pathname}:${collapsed}`;
		if (!_syncKey) return;
		const timer = window.setTimeout(updateActiveIndicator, 60);
		return () => window.clearTimeout(timer);
	}, [updateActiveIndicator, location.pathname, collapsed]);

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
			return;
		}

		const ctx = gsap.context(() => {
			gsap.to(sidebar, {
				width: targetWidth,
				duration: 0.22,
				ease: "power3.out",
			});

			if (!collapsed && brandTextRef.current) {
				gsap.fromTo(
					brandTextRef.current,
					{ opacity: 0, y: -4 },
					{
						opacity: 1,
						y: 0,
						duration: 0.18,
						delay: 0.04,
						ease: "power2.out",
						clearProps: "transform",
					},
				);
			}
		}, sidebarRef);

		return () => {
			ctx.kill();
		};
	}, [collapsed]);

	// Subtle page entrance & mobile sheet/popover auto-close on route change
	useEffect(() => {
		const _path = location.pathname;
		setMobileOpen(false);
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

	const renderNavItems = (items: NavItem[], isMobile = false) => (
		<SidebarMenu>
			{items.map((item) => {
				const Icon = item.icon;
				return (
					<SidebarMenuItem key={item.to}>
						<NavLink
							to={item.to}
							end={item.to === "/"}
							aria-label={!isMobile && collapsed ? item.label : undefined}
							title={!isMobile && collapsed ? item.label : undefined}
							className={({ isActive }) =>
								cn(
									"group relative flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors duration-150",
									isActive
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-secondary hover:text-secondary-foreground",
									!isMobile && collapsed ? "justify-center px-0" : "",
								)
							}
						>
							{({ isActive }) => (
								<>
									<Icon
										className={cn(
											"size-5 shrink-0",
											isActive
												? "text-primary-foreground"
												: "text-muted-foreground group-hover:text-secondary-foreground",
										)}
										aria-hidden="true"
									/>
									{(!collapsed || isMobile) && (
										<span className="flex flex-1 items-center justify-between gap-2 truncate">
											<span>{item.label}</span>
											{item.badge ? (
												<Badge
													variant={isActive ? "secondary" : "outline"}
													className="tabular-nums"
												>
													{item.badge}
												</Badge>
											) : null}
										</span>
									)}
								</>
							)}
						</NavLink>
					</SidebarMenuItem>
				);
			})}
		</SidebarMenu>
	);

	const renderSidebarNavigation = (isMobile = false) => (
		<nav
			ref={isMobile ? undefined : navContainerRef}
			aria-label={isMobile ? "Menu seluler" : "Menu utama"}
			className="relative flex flex-col gap-2 pt-2"
		>
			{!isMobile ? (
				<span
					ref={activeIndicatorRef}
					aria-hidden="true"
					className="pointer-events-none absolute -left-2 top-0 w-1 rounded-full bg-primary opacity-0"
				/>
			) : null}

			<SidebarGroup>{renderNavItems(discoveryLinks, isMobile)}</SidebarGroup>
		</nav>
	);

	// GitHub logo stacked ABOVE copyright at the very bottom of sidebar
	const renderSidebarCopyrightFooter = (isIconOnly = false) => (
		<div className="flex flex-col items-center gap-2 text-center">
			<a
				href={GITHUB_REPO_URL}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Repositori GitHub Darasa oleh Team Lorem Ipsum"
				title="GitHub Darasa"
				className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
			>
				<GitHubMark className="size-5" />
			</a>
			<p className="text-[11px] font-medium leading-tight text-muted-foreground">
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
				<SidebarHeader className="pb-3 border-b border-sidebar-border">
					<div
						className={cn(
							"flex items-center gap-2",
							collapsed ? "flex-col justify-center" : "justify-between",
						)}
					>
						<Link
							to="/"
							aria-label="Darasa Beranda"
							className="flex items-center gap-2.5 rounded-[8px] p-1 hover:bg-background"
						>
							{/* TODO: Replace temporary Darasa mark with final brand logo SVG */}
							<span
								aria-hidden="true"
								className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-primary text-base font-bold text-primary-foreground"
							>
								D
							</span>
							{!collapsed ? (
								<div ref={brandTextRef} className="leading-tight">
									<span className="block text-base font-bold tracking-tight text-foreground">
										Darasa
									</span>
									<span className="block text-xs text-muted-foreground">
										Kuliner Batang
									</span>
								</div>
							) : null}
						</Link>

						<Button
							variant="outline"
							size="icon"
							onClick={() => setCollapsed((prev) => !prev)}
							aria-expanded={!collapsed}
							aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
							title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
						>
							{collapsed ? (
								<ChevronRight className="size-5" aria-hidden="true" />
							) : (
								<ChevronLeft className="size-5" aria-hidden="true" />
							)}
						</Button>
					</div>
				</SidebarHeader>

				<SidebarContent>{renderSidebarNavigation(false)}</SidebarContent>

				<SidebarFooter className="bg-sidebar">
					{renderSidebarCopyrightFooter(collapsed)}
				</SidebarFooter>
			</Sidebar>

			{/* Main Column + Mobile Sheet */}
			<div className="flex min-w-0 flex-1 flex-col bg-card">
				<header className="sticky top-0 z-30 border-b border-border bg-card">
					<div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 md:px-8 xl:px-10">
						<div className="flex items-center gap-2.5 shrink-0">
							<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
								<SheetTrigger asChild>
									<Button
										variant="outline"
										aria-label="Buka menu navigasi"
										aria-expanded={mobileOpen}
										className="lg:hidden min-h-[44px] px-3"
									>
										<Menu className="size-5" aria-hidden="true" />
										<span className="hidden sm:inline">Menu</span>
									</Button>
								</SheetTrigger>
								<SheetContent aria-label="Menu navigasi Darasa">
									<SheetHeader>
										<SheetTitle className="flex items-center gap-2.5">
											<span
												aria-hidden="true"
												className="flex size-8 items-center justify-center rounded-[8px] bg-primary text-sm font-bold text-primary-foreground"
											>
												D
											</span>
											Darasa
										</SheetTitle>
										<SheetDescription>
											Direktori Kuliner Kabupaten Batang
										</SheetDescription>
									</SheetHeader>

									<div className="flex-1 overflow-y-auto px-3 py-4">
										{renderSidebarNavigation(true)}
									</div>

									<div className="border-t border-border p-4">
										{renderSidebarCopyrightFooter(false)}
									</div>
								</SheetContent>
							</Sheet>

							<Link
								to="/"
								className="flex items-center gap-2 lg:hidden"
								aria-label="Darasa Beranda"
							>
								<span
									aria-hidden="true"
									className="flex size-8 items-center justify-center rounded-[6px] bg-primary text-sm font-bold text-primary-foreground"
								>
									D
								</span>
								<span className="hidden sm:inline text-base font-bold text-foreground">
									Darasa
								</span>
							</Link>

							<p className="hidden lg:block truncate text-sm font-medium text-muted-foreground">
								Direktori Kuliner Kabupaten Batang
							</p>
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

								<div className="space-y-1">
									<p className="px-1 pb-1 text-xs font-semibold text-muted-foreground">
										Pengelolaan &amp; Kurasi
									</p>
									{managementLinks.map((item) => {
										const Icon = item.icon;
										const active = location.pathname === item.to;
										return (
											<Link
												key={item.to}
												to={item.to}
												onClick={closeProfilePopover}
												className={cn(
													"flex min-h-[40px] items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-sm font-medium transition-colors",
													active
														? "bg-primary-soft text-primary-hover"
														: "text-foreground hover:bg-muted",
												)}
											>
												<span className="flex items-center gap-2.5">
													<Icon
														className="size-4 text-muted-foreground"
														aria-hidden="true"
													/>
													<span>{item.label}</span>
												</span>
												{item.badge ? (
													<Badge variant="yellow" className="tabular-nums">
														{item.badge}
													</Badge>
												) : null}
											</Link>
										);
									})}
								</div>

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

				<main id="main-content" tabIndex={-1} className="flex-1 bg-card">
					<div
						ref={mainContentRef}
						className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10 xl:py-7"
					>
						{children}
					</div>
				</main>

				{toast ? (
					<div
						aria-live="polite"
						className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-[12px] border border-border bg-card px-4 py-3 text-sm shadow-lg"
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

				<footer className="border-t border-border bg-background/50">
					<div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8 xl:px-10">
						<p>
							<strong className="font-semibold text-foreground">Darasa</strong>{" "}
							&middot; Direktori Kuliner Kabupaten Batang
						</p>
						<div className="flex flex-wrap items-center gap-4">
							<Link to="/" className="hover:text-primary hover:underline">
								Home
							</Link>
							<Link
								to="/explore"
								className="hover:text-primary hover:underline"
							>
								Jelajah
							</Link>
							<Link
								to="/hidden-gem"
								className="hover:text-primary hover:underline"
							>
								Hidden Gems
							</Link>
							<Link
								to="/submit-place"
								className="hover:text-primary hover:underline"
							>
								Contribute
							</Link>
							<Link
								to="/bookmarks"
								className="hover:text-primary hover:underline"
							>
								Bookmark
							</Link>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}
