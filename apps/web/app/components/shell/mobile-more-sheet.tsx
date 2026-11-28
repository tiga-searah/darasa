import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bookmark, LayoutDashboard, ShieldAlert, X } from "lucide-react";
import { NavLink } from "react-router";
import { GitHubMark } from "~/components/shell/github-mark";
import { ThemeMenuOptions } from "~/components/theme-toggle";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { GITHUB_REPO_URL } from "~/data/nav-config";
import type { UserAccount } from "~/lib/types";
import { cn } from "~/lib/utils";

interface MoreMenuGroupsProps {
	currentUser: UserAccount;
	bookmarkCount: number;
	adminAttentionCount: number;
	onNavigate?: () => void;
}

export function MoreMenuGroups({
	currentUser,
	bookmarkCount,
	adminAttentionCount,
	onNavigate,
}: MoreMenuGroupsProps) {
	const navLinks = [
		{
			to: "/bookmarks",
			label: "Disimpan",
			icon: Bookmark,
			badge: bookmarkCount > 0 ? String(bookmarkCount) : undefined,
		},
		...(currentUser.role === "owner"
			? [
					{
						to: "/owner",
						label: "Usahamu",
						icon: LayoutDashboard,
						badge: undefined,
					},
				]
			: []),
		...(currentUser.role === "admin"
			? [
					{
						to: "/admin",
						label: "Verifikasi Admin",
						icon: ShieldAlert,
						badge:
							adminAttentionCount > 0 ? String(adminAttentionCount) : undefined,
					},
				]
			: []),
	];

	return (
		<div className="space-y-4">
			<nav aria-label="Menu navigasi lainnya" className="space-y-1.5">
				{navLinks.map((item) => {
					const Icon = item.icon;
					return (
						<NavLink
							key={item.to}
							to={item.to}
							onClick={onNavigate}
							className={({ isActive }) =>
								cn(
									"group flex min-h-[44px] items-center gap-3 rounded-[10px] px-3.5 py-2 text-sm font-semibold transition-colors duration-150",
									isActive
										? "bg-primary text-primary-foreground shadow-xs"
										: "text-foreground hover:bg-secondary/80 hover:text-secondary-foreground",
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
									<span className="min-w-0 flex-1 truncate">{item.label}</span>
									{item.badge ? (
										<Badge
											variant={isActive ? "secondary" : "outline"}
											className="shrink-0 tabular-nums"
										>
											{item.badge}
										</Badge>
									) : null}
								</>
							)}
						</NavLink>
					);
				})}
			</nav>

			<Separator />

			<div className="space-y-2">
				<p className="px-1 text-xs font-semibold text-muted-foreground">
					Settings · Tema Tampilan
				</p>
				<div
					role="menu"
					aria-label="Settings · Tema Tampilan"
					className="rounded-[12px] border border-border bg-background/60 p-1.5"
				>
					<ThemeMenuOptions />
				</div>
			</div>

			<Separator />

			<div className="flex items-center justify-between gap-3 rounded-[10px] bg-background px-3 py-2">
				<p className="text-[11px] font-medium text-muted-foreground">
					© 2026 Team Lorem Ipsum
				</p>
				<a
					href={GITHUB_REPO_URL}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Repositori GitHub Darasa oleh Team Lorem Ipsum"
					title="GitHub Darasa"
					className="inline-flex size-9 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
				>
					<GitHubMark className="size-5" />
				</a>
			</div>
		</div>
	);
}

interface MobileMoreSheetProps extends MoreMenuGroupsProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function MobileMoreSheet({
	open,
	onOpenChange,
	currentUser,
	bookmarkCount,
	adminAttentionCount,
}: MobileMoreSheetProps) {
	const closeSheet = () => onOpenChange(false);

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					data-slot="bottom-sheet-overlay"
					className="fixed inset-0 z-50 bg-surface-dark/50 backdrop-blur-[2px] lg:hidden"
				/>
				<DialogPrimitive.Content
					data-slot="bottom-sheet-content"
					className="darasa-bottom-sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] border-x border-t border-border bg-card text-card-foreground shadow-xl pb-[env(safe-area-inset-bottom)] outline-none lg:hidden"
				>
					<div
						className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border"
						aria-hidden="true"
					/>

					<div className="relative flex items-center justify-between border-b border-border px-5 pt-2 pb-3.5">
						<DialogPrimitive.Title className="text-lg font-semibold text-foreground">
							Lainnya
						</DialogPrimitive.Title>
						<DialogPrimitive.Description className="sr-only">
							Menu navigasi tambahan, pengaturan tema tampilan, GitHub, dan hak
							cipta Darasa.
						</DialogPrimitive.Description>
						<DialogPrimitive.Close
							aria-label="Tutup menu"
							className="inline-flex size-9 items-center justify-center rounded-[8px] border border-border bg-card text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
						>
							<X className="size-4" aria-hidden="true" />
						</DialogPrimitive.Close>
					</div>

					<div className="flex-1 overflow-y-auto px-5 pt-4 pb-5">
						<MoreMenuGroups
							currentUser={currentUser}
							bookmarkCount={bookmarkCount}
							adminAttentionCount={adminAttentionCount}
							onNavigate={closeSheet}
						/>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
