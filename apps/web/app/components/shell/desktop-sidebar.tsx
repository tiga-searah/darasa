import gsap from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
} from "~/components/ui/sidebar";
import { GITHUB_REPO_URL, type NavItem } from "~/data/nav-config";
import { cn } from "~/lib/utils";

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

interface DesktopSidebarProps {
	collapsed: boolean;
	onToggleCollapse: () => void;
	discoveryLinks: NavItem[];
	managementLinks: NavItem[];
}

export function DesktopSidebar({
	collapsed,
	onToggleCollapse,
	discoveryLinks,
	managementLinks,
}: DesktopSidebarProps) {
	const location = useLocation();
	const sidebarRef = useRef<HTMLElement>(null);
	const navContainerRef = useRef<HTMLElement>(null);
	const activeIndicatorRef = useRef<HTMLSpanElement>(null);
	const hasMountedSidebarRef = useRef(false);
	const hasPositionedPillRef = useRef(false);

	const updateIndicator = useCallback((instant = false) => {
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const nav = navContainerRef.current;
		const pill = activeIndicatorRef.current;
		if (!nav || !pill) return;

		const activeLink = nav.querySelector<HTMLElement>('[aria-current="page"]');
		if (!activeLink) {
			gsap.to(pill, { opacity: 0, duration: reduced ? 0 : 0.16 });
			return;
		}

		const navRect = nav.getBoundingClientRect();
		const linkRect = activeLink.getBoundingClientRect();
		const topOffset = linkRect.top - navRect.top + nav.scrollTop;

		if (reduced || instant || !hasPositionedPillRef.current) {
			gsap.set(pill, {
				y: topOffset,
				height: linkRect.height,
				opacity: 1,
			});
			hasPositionedPillRef.current = true;
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
	}, []);

	useEffect(() => {
		const _syncKey = `${location.pathname}:${collapsed}:${managementLinks.length}`;
		if (!_syncKey) return;
		const frame = window.requestAnimationFrame(() => updateIndicator());
		const settleTimer = window.setTimeout(() => updateIndicator(), 250);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(settleTimer);
		};
	}, [updateIndicator, location.pathname, collapsed, managementLinks.length]);

	useEffect(() => {
		const handleResize = () => updateIndicator(true);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [updateIndicator]);

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
			updateIndicator(true);
			return;
		}

		const ctx = gsap.context(() => {
			gsap.to(sidebar, {
				width: targetWidth,
				duration: 0.26,
				ease: "power3.out",
				onUpdate: () => updateIndicator(true),
				onComplete: () => updateIndicator(true),
			});
		}, sidebarRef);

		return () => {
			ctx.kill();
		};
	}, [collapsed, updateIndicator]);

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

	return (
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
						<img
							src="/images/darasa.webp"
							alt=""
							width={36}
							height={36}
							className="size-9 shrink-0 object-contain"
						/>
						<span className="overflow-hidden whitespace-nowrap text-base font-bold tracking-tight text-foreground">
							Darasa
						</span>
					</Link>

					<Button
						variant="outline"
						size="icon"
						onClick={onToggleCollapse}
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
									collapsed
										? "max-h-0 pb-0 opacity-0"
										: "max-h-6 pb-1 opacity-100",
								)}
							>
								Pengelolaan
							</p>
							{renderNavItems(managementLinks)}
						</SidebarGroup>
					) : null}
				</nav>
			</SidebarContent>

			<SidebarFooter className="bg-sidebar p-3">
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
						{collapsed ? "© 2026" : "© 2026 Team Lorem Ipsum"}
					</p>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
