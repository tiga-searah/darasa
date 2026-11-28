import { LogIn, UserCheck } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import type { ContributorLevelInfo } from "~/data/contribute-xp";
import type { UserAccount } from "~/lib/types";
import { cn } from "~/lib/utils";

const ROLE_DISPLAY: Record<string, string> = {
	visitor: "Mode Tamu",
	user: "Warga Terdaftar",
	owner: "Pemilik Usaha",
	admin: "Administrator",
};

interface ContributorHeroCardProps {
	currentUser: UserAccount;
	isVisitor: boolean;
	levelInfo: ContributorLevelInfo;
	counts: {
		places: number;
		reviews: number;
		photos: number;
		edits: number;
	};
	onTryAsWarga: () => void;
}

export function ContributorHeroCard({
	currentUser,
	isVisitor,
	levelInfo,
	counts,
	onTryAsWarga,
}: ContributorHeroCardProps) {
	return (
		<section
			aria-labelledby="contribute-dashboard-heading"
			className="rounded-[12px] border border-border bg-card p-5 sm:p-6 space-y-5"
		>
			<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<img
						src="/images/avatar-profile.svg"
						alt={`Avatar ${currentUser.name}`}
						width={52}
						height={52}
						className={cn(
							"size-[52px] shrink-0 rounded-full border-2 object-cover bg-muted",
							isVisitor ? "border-border" : "border-primary",
						)}
					/>
					<div className="min-w-0 space-y-1">
						<h1
							id="contribute-dashboard-heading"
							className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight"
						>
							Kontribusi
						</h1>
						<p className="truncate text-sm text-muted-foreground">
							{currentUser.name} ·{" "}
							{ROLE_DISPLAY[currentUser.role] ?? currentUser.role}
						</p>
					</div>
				</div>

				{isVisitor ? (
					<div className="flex flex-wrap items-center gap-2.5">
						<Button type="button" onClick={onTryAsWarga}>
							<UserCheck className="size-4" aria-hidden="true" />
							Coba sebagai Warga
						</Button>
						<Button asChild variant="outline">
							<Link to="/login?redirect=/contribute">
								<LogIn className="size-4" aria-hidden="true" />
								Masuk Akun
							</Link>
						</Button>
					</div>
				) : (
					<div className="w-full shrink-0 space-y-2.5 rounded-[10px] border border-border bg-background p-4 lg:w-[340px]">
						<div className="flex items-center justify-between gap-2 text-sm">
							<span className="font-semibold text-foreground">
								Level {levelInfo.level} · {levelInfo.title}
							</span>
							<span className="shrink-0 font-semibold text-primary-hover tabular-nums">
								{levelInfo.xp} XP
							</span>
						</div>

						<div
							role="progressbar"
							aria-valuenow={levelInfo.progressPercent}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label="Progres level kontributor"
							className="h-2 w-full overflow-hidden rounded-full bg-muted"
						>
							<div
								className="h-full rounded-full bg-primary transition-[width] duration-300"
								style={{ width: `${levelInfo.progressPercent}%` }}
							/>
						</div>

						<p className="text-xs text-muted-foreground">
							{levelInfo.nextLevelTitle !== null
								? `${levelInfo.xpToNext} XP lagi ke Level ${levelInfo.level + 1} (${levelInfo.nextLevelTitle})`
								: "Anda mencapai tingkat tertinggi kontributor Darasa."}
						</p>
					</div>
				)}
			</div>

			{!isVisitor ? (
				<div className="grid grid-cols-2 gap-2.5 border-t border-border pt-4 sm:grid-cols-4">
					{[
						{ label: "Tempat", value: counts.places },
						{ label: "Ulasan", value: counts.reviews },
						{ label: "Foto", value: counts.photos },
						{ label: "Info diperbarui", value: counts.edits },
					].map((metric) => (
						<div
							key={metric.label}
							className="flex items-center justify-between gap-2 rounded-[8px] border border-border bg-background px-3.5 py-2.5"
						>
							<span className="text-xs text-muted-foreground">
								{metric.label}
							</span>
							<span className="text-base font-bold text-foreground tabular-nums">
								{metric.value}
							</span>
						</div>
					))}
				</div>
			) : null}
		</section>
	);
}
