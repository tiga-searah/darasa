import { Check, LogIn, LogOut, Moon, Sun, UserPlus } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { DEMO_ACCOUNTS } from "~/data/batang-places";
import { ROLE_LABELS, SHORT_ROLE_LABELS } from "~/data/nav-config";
import { setColorSchemePreference } from "~/lib/theme";
import type { UserAccount } from "~/lib/types";
import { cn } from "~/lib/utils";

interface ProfilePopoverProps {
	currentUser: UserAccount;
	onSwitchDemoAccount: (userId: string) => void;
	onLogout: () => void;
}

export function ProfilePopover({
	currentUser,
	onSwitchDemoAccount,
	onLogout,
}: ProfilePopoverProps) {
	const location = useLocation();
	const popoverRef = useRef<HTMLDivElement>(null);
	const popoverId = useId();

	const closePopover = useCallback(() => {
		try {
			popoverRef.current?.hidePopover?.();
		} catch {
			// Ignore if popover is already closed or unsupported
		}
	}, []);

	useEffect(() => {
		const _path = location.pathname;
		if (_path) closePopover();
	}, [location.pathname, closePopover]);

	return (
		<>
			<button
				type="button"
				popoverTarget={popoverId}
				popoverTargetAction="toggle"
				aria-controls={popoverId}
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
				id={popoverId}
				ref={popoverRef}
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
							<Link to="/login" onClick={closePopover}>
								<LogIn className="size-4" aria-hidden="true" />
								Masuk
							</Link>
						</Button>
						<Button asChild variant="outline" size="sm" className="w-full">
							<Link to="/register" onClick={closePopover}>
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
							onLogout();
							closePopover();
						}}
						className="w-full justify-start"
					>
						<LogOut className="size-4" aria-hidden="true" />
						Keluar Akun
					</Button>
				)}

				<Separator />

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
										onSwitchDemoAccount(acc.id);
										closePopover();
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
										<Check className="size-3.5 shrink-0" aria-hidden="true" />
									) : null}
								</button>
							);
						})}
					</div>
				</fieldset>
			</div>
		</>
	);
}
