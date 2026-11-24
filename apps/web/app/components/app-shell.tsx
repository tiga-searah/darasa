import gsap from "gsap";
import {
	Award,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Compass,
	Gem,
	Info,
	LayoutDashboard,
	LogIn,
	LogOut,
	MapPin,
	Menu,
	PlusCircle,
	ShieldAlert,
	Store,
	UserCheck,
	X,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ThemeToggle } from "~/components/theme-toggle";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
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
	SidebarGroupTrigger,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useDarasa } from "~/context/darasa-store";
import { BATANG_DISTRICTS, DEMO_ACCOUNTS } from "~/data/batang-places";
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

/**
 * Smooth GSAP slide-down / slide-up collapsible section for Shadcn Sidebar.
 * Animates height, opacity, and vertical offset smoothly on click while honoring reduced motion.
 */
function SmoothCollapsibleSection({
	open,
	collapsed,
	children,
}: {
	open: boolean;
	collapsed: boolean;
	children: ReactNode;
}) {
	const panelRef = useRef<HTMLDivElement>(null);
	const isFirstRender = useRef(true);

	useEffect(() => {
		const el = panelRef.current;
		if (!el) return;

		// In collapsed icon-rail mode, keep items accessible without height-0 clipping
		if (collapsed) {
			gsap.killTweensOf(el);
			el.style.height = "auto";
			el.style.opacity = "1";
			el.style.overflow = "visible";
			el.style.transform = "none";
			return;
		}

		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (isFirstRender.current) {
			isFirstRender.current = false;
			el.style.height = open ? "auto" : "0px";
			el.style.opacity = open ? "1" : "0";
			el.style.overflow = open ? "visible" : "hidden";
			return;
		}

		if (reduced) {
			el.style.height = open ? "auto" : "0px";
			el.style.opacity = open ? "1" : "0";
			el.style.overflow = open ? "visible" : "hidden";
			return;
		}

		gsap.killTweensOf(el);

		if (open) {
			el.style.overflow = "hidden";
			const targetHeight = el.scrollHeight;
			gsap.fromTo(
				el,
				{ height: 0, opacity: 0, y: -8 },
				{
					height: targetHeight,
					opacity: 1,
					y: 0,
					duration: 0.28,
					ease: "power3.out",
					onComplete: () => {
						el.style.height = "auto";
						el.style.overflow = "visible";
						el.style.transform = "";
					},
				},
			);
		} else {
			el.style.overflow = "hidden";
			gsap.fromTo(
				el,
				{ height: el.scrollHeight, opacity: 1, y: 0 },
				{
					height: 0,
					opacity: 0,
					y: -8,
					duration: 0.22,
					ease: "power2.inOut",
					onComplete: () => {
						el.style.transform = "";
					},
				},
			);
		}
	}, [open, collapsed]);

	return (
		<div
			ref={panelRef}
			aria-hidden={!collapsed && !open}
			className={cn(!collapsed && !open ? "pointer-events-none" : "")}
		>
			{children}
		</div>
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
		toast,
		dismissToast,
	} = useDarasa();
	const location = useLocation();
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	// Smooth collapsible sidebar group states (turun / naik on click)
	const [openGroups, setOpenGroups] = useState({
		discovery: true,
		workspace: true,
		districts: false,
	});

	const sidebarRef = useRef<HTMLElement>(null);
	const navContainerRef = useRef<HTMLElement>(null);
	const activeIndicatorRef = useRef<HTMLSpanElement>(null);
	const brandTextRef = useRef<HTMLDivElement>(null);
	const mainContentRef = useRef<HTMLDivElement>(null);
	const hasMountedSidebarRef = useRef(false);
	const roleSelectId = useId();

	const pendingClaimCount = claims.filter((c) => c.status === "pending").length;
	const openAnomalyCount = anomalies.filter(
		(a) => a.resolution === "open",
	).length;
	const pendingPlaceCount = places.filter((p) => p.isPendingModeration).length;
	const adminAttentionCount =
		pendingClaimCount + openAnomalyCount + pendingPlaceCount;

	const discoveryLinks = useMemo<NavItem[]>(
		() => [
			{ to: "/", label: "Jelajah Kuliner", icon: Compass },
			{ to: "/hidden-gem", label: "Hidden Gem", icon: Gem },
			{ to: "/submit-place", label: "Tambah Tempat", icon: PlusCircle },
		],
		[],
	);

	const workspaceLinks = useMemo<NavItem[]>(
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

	// Smooth vertical active indicator glide (naik / turun) between clicked sidebar items
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
			duration: 0.26,
			ease: "power3.out",
		});
	}, []);

	useEffect(() => {
		const _syncKey = `${location.pathname}:${collapsed}:${openGroups.discovery}:${openGroups.workspace}:${openGroups.districts}`;
		if (!_syncKey) return;
		const timer = window.setTimeout(updateActiveIndicator, 60);
		return () => window.clearTimeout(timer);
	}, [updateActiveIndicator, location.pathname, openGroups, collapsed]);

	// Smooth GSAP desktop sidebar width collapse/expand
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
		const targetWidth = collapsed ? 80 : 268;

		if (reduced) {
			sidebar.style.width = `${targetWidth}px`;
			return;
		}

		const ctx = gsap.context(() => {
			gsap.to(sidebar, {
				width: targetWidth,
				duration: 0.24,
				ease: "power3.out",
			});

			if (!collapsed && brandTextRef.current) {
				gsap.fromTo(
					brandTextRef.current,
					{ opacity: 0, y: -4 },
					{
						opacity: 1,
						y: 0,
						duration: 0.2,
						delay: 0.05,
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

	// Gentle page entrance & mobile sheet auto-close on route change
	useEffect(() => {
		const _path = location.pathname;
		setMobileOpen(false);

		const el = mainContentRef.current;
		if (!_path || !el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				el,
				{ opacity: 0, y: 8 },
				{ opacity: 1, y: 0, duration: 0.22, ease: "power2.out" },
			);
		}, mainContentRef);

		return () => ctx.revert();
	}, [location.pathname]);

	const toggleGroup = (key: keyof typeof openGroups) => {
		setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
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
							className={({ isActive }) =>
								cn(
									"group relative flex min-h-[44px] items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors duration-150",
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
											"size-5 shrink-0 transition-transform duration-150 group-hover:scale-105",
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
													variant="yellow"
													className={cn(
														"px-2 py-0.5 tabular-nums",
														isActive
															? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
															: "",
													)}
												>
													{item.badge}
												</Badge>
											) : null}
										</span>
									)}
									{!isMobile && collapsed && item.badge ? (
										<span className="visually-hidden">
											{item.badge} perlu ditinjau
										</span>
									) : null}
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
			className="relative flex flex-col gap-3"
		>
			{/* Smooth vertical glide indicator (desktop expanded) */}
			{!isMobile ? (
				<span
					ref={activeIndicatorRef}
					aria-hidden="true"
					className="pointer-events-none absolute -left-2 top-0 w-1 rounded-full bg-primary opacity-0"
				/>
			) : null}

			<Collapsible
				open={openGroups.discovery}
				onOpenChange={() => toggleGroup("discovery")}
			>
				<SidebarGroup>
					<CollapsibleTrigger asChild>
						<SidebarGroupTrigger
							open={openGroups.discovery}
							collapsed={!isMobile && collapsed}
						>
							Penemuan Kuliner
						</SidebarGroupTrigger>
					</CollapsibleTrigger>
					<SmoothCollapsibleSection
						open={openGroups.discovery}
						collapsed={!isMobile && collapsed}
					>
						{renderNavItems(discoveryLinks, isMobile)}
					</SmoothCollapsibleSection>
				</SidebarGroup>
			</Collapsible>

			<Separator />

			<Collapsible
				open={openGroups.workspace}
				onOpenChange={() => toggleGroup("workspace")}
			>
				<SidebarGroup>
					<CollapsibleTrigger asChild>
						<SidebarGroupTrigger
							open={openGroups.workspace}
							collapsed={!isMobile && collapsed}
						>
							Pengelolaan &amp; Kurasi
						</SidebarGroupTrigger>
					</CollapsibleTrigger>
					<SmoothCollapsibleSection
						open={openGroups.workspace}
						collapsed={!isMobile && collapsed}
					>
						{renderNavItems(workspaceLinks, isMobile)}
					</SmoothCollapsibleSection>
				</SidebarGroup>
			</Collapsible>

			{/* Collapsible Quick Batang Districts Accordion (demonstrates smooth turun/naik submenu) */}
			{(!collapsed || isMobile) && (
				<>
					<Separator />
					<Collapsible
						open={openGroups.districts}
						onOpenChange={() => toggleGroup("districts")}
					>
						<SidebarGroup>
							<CollapsibleTrigger asChild>
								<button
									type="button"
									aria-expanded={openGroups.districts}
									className="flex min-h-[38px] w-full items-center justify-between rounded-[8px] px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
								>
									<span className="flex items-center gap-1.5">
										<MapPin
											className="size-3.5 text-primary"
											aria-hidden="true"
										/>
										Kawasan Populer Batang
									</span>
									<ChevronDown
										className={cn(
											"size-4 shrink-0 transition-transform duration-200",
											openGroups.districts ? "rotate-180 text-primary" : "",
										)}
										aria-hidden="true"
									/>
								</button>
							</CollapsibleTrigger>
							<SmoothCollapsibleSection
								open={openGroups.districts}
								collapsed={false}
							>
								<ul className="mt-1 space-y-1 pl-3 border-l border-border ml-3">
									{BATANG_DISTRICTS.map((district) => (
										<li key={district}>
											<Link
												to={`/?district=${encodeURIComponent(district)}`}
												className="flex min-h-[36px] items-center rounded-[6px] px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
											>
												{district}
											</Link>
										</li>
									))}
								</ul>
							</SmoothCollapsibleSection>
						</SidebarGroup>
					</Collapsible>
				</>
			)}
		</nav>
	);

	return (
		<div className="flex min-h-dvh bg-background text-foreground">
			{/* Desktop Shadcn Sidebar (>= 1024px) */}
			<Sidebar
				ref={sidebarRef}
				aria-label="Navigasi utama Darasa"
				className="hidden lg:flex w-[268px] shrink-0 flex-col justify-between sticky top-0 h-dvh overflow-x-hidden"
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

				<SidebarFooter className="space-y-3 bg-sidebar">
					{!collapsed ? (
						<>
							<div className="flex items-center gap-2.5">
								<span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-secondary text-sm font-bold text-secondary-foreground">
									{currentUser.name.slice(0, 1).toUpperCase()}
								</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-foreground">
										{currentUser.name}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										{ROLE_LABELS[currentUser.role] ?? currentUser.role}
									</p>
								</div>
							</div>

							<div className="space-y-1.5">
								<Label
									htmlFor={roleSelectId}
									className="text-xs text-muted-foreground"
								>
									Ganti peran prototipe
								</Label>
								<Select
									value={currentUser.id}
									onValueChange={(val) => switchDemoAccount(val)}
								>
									<SelectTrigger
										id={roleSelectId}
										className="min-h-[40px] bg-background text-xs"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{DEMO_ACCOUNTS.map((acc) => (
											<SelectItem key={acc.id} value={acc.id}>
												{ROLE_LABELS[acc.role]}: {acc.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{currentUser.role === "visitor" ? (
								<Button asChild className="w-full" size="default">
									<Link to="/login">
										<LogIn className="size-4" aria-hidden="true" />
										Masuk Akun
									</Link>
								</Button>
							) : (
								<Button variant="outline" onClick={logout} className="w-full">
									<LogOut className="size-4" aria-hidden="true" />
									Keluar
								</Button>
							)}
						</>
					) : (
						<div className="flex flex-col items-center gap-2">
							{currentUser.role === "visitor" ? (
								<Button asChild size="icon" aria-label="Masuk Akun">
									<Link to="/login">
										<LogIn className="size-5" aria-hidden="true" />
									</Link>
								</Button>
							) : (
								<Button
									variant="outline"
									size="icon"
									onClick={logout}
									aria-label="Keluar dari akun"
								>
									<LogOut className="size-5" aria-hidden="true" />
								</Button>
							)}
						</div>
					)}
				</SidebarFooter>
			</Sidebar>

			{/* Main Column + Mobile Shadcn Sheet */}
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xs">
					<div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-8 xl:px-12">
						<div className="flex items-center gap-3">
							<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
								<SheetTrigger asChild>
									<Button
										variant="outline"
										aria-label="Buka menu navigasi"
										aria-expanded={mobileOpen}
										className="lg:hidden"
									>
										<Menu className="size-5" aria-hidden="true" />
										<span>Menu</span>
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

									<div className="border-t border-border p-4 space-y-3">
										<div className="flex items-center gap-2.5">
											<UserCheck
												className="size-5 text-primary"
												aria-hidden="true"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold">
													{currentUser.name}
												</p>
												<p className="text-xs text-muted-foreground">
													{ROLE_LABELS[currentUser.role]}
												</p>
											</div>
										</div>

										<Select
											value={currentUser.id}
											onValueChange={(val) => switchDemoAccount(val)}
										>
											<SelectTrigger
												aria-label="Ganti peran prototipe"
												className="bg-background"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{DEMO_ACCOUNTS.map((acc) => (
													<SelectItem key={acc.id} value={acc.id}>
														{ROLE_LABELS[acc.role]}: {acc.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>

										{currentUser.role === "visitor" ? (
											<Button asChild className="w-full">
												<Link to="/login">
													<LogIn className="size-4" aria-hidden="true" />
													Masuk Akun
												</Link>
											</Button>
										) : (
											<Button
												variant="outline"
												onClick={logout}
												className="w-full"
											>
												<LogOut className="size-4" aria-hidden="true" />
												Keluar
											</Button>
										)}
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
								<span className="text-base font-bold text-foreground">
									Darasa
								</span>
							</Link>

							<div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
								<Store className="size-4 text-primary" aria-hidden="true" />
								<span>
									Direktori Kuliner Kabupaten Batang &amp; Koridor KITB
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2.5">
							<ThemeToggle />

							<Button
								asChild
								variant="secondary"
								size="sm"
								className="hidden md:inline-flex"
							>
								<Link to="/submit-place">
									<PlusCircle className="size-4" aria-hidden="true" />
									Tambah Tempat
								</Link>
							</Button>

							<Button
								asChild
								variant="outline"
								size="sm"
								className="hidden sm:inline-flex border-accent-yellow/60 bg-accent text-accent-foreground hover:bg-yellow-soft"
							>
								<Link to="/hidden-gem">
									<Gem className="size-4" aria-hidden="true" />
									Mode Hidden Gem
								</Link>
							</Button>

							{currentUser.role === "visitor" ? (
								<Button asChild variant="outline" size="sm">
									<Link to="/login">
										<LogIn className="size-4" aria-hidden="true" />
										Masuk
									</Link>
								</Button>
							) : (
								<Badge
									variant="default"
									className="min-h-[38px] px-3 text-xs font-semibold"
								>
									{currentUser.name} ({ROLE_LABELS[currentUser.role]})
								</Badge>
							)}
						</div>
					</div>
				</header>

				<main id="main-content" tabIndex={-1} className="flex-1">
					<div
						ref={mainContentRef}
						className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 xl:px-12 xl:py-8"
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

				<footer className="border-t border-border bg-card">
					<div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:px-8 xl:px-12">
						<p>
							<strong className="font-semibold text-foreground">Darasa</strong>{" "}
							· Platform Kurasi Kuliner Komunitas Kabupaten Batang (Prototipe
							2026)
						</p>
						<div className="flex flex-wrap items-center gap-4">
							<Link to="/" className="hover:text-primary hover:underline">
								Jelajah
							</Link>
							<Link
								to="/hidden-gem"
								className="hover:text-primary hover:underline"
							>
								Hidden Gem
							</Link>
							<Link
								to="/submit-place"
								className="hover:text-primary hover:underline"
							>
								Tambah Tempat
							</Link>
							<Link to="/claim" className="hover:text-primary hover:underline">
								Klaim Profil Usaha
							</Link>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}
