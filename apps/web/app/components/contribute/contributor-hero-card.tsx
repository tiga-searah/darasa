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
			className="flex flex-col items-center pb-2 pt-1 text-center"
		>
			<div className="flex w-full max-w-lg flex-col items-center space-y-3.5">
				<img
					src="/images/avatar-profile.svg"
					alt={`Avatar ${currentUser.name}`}
					width={56}
					height={56}
					className={cn(
						"size-14 shrink-0 rounded-full border-2 object-cover bg-muted",
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
					<p className="text-sm text-muted-foreground">
						<span className="font-medium text-foreground">
							{currentUser.name}
						</span>{" "}
						· {ROLE_DISPLAY[currentUser.role] ?? currentUser.role}
					</p>
				</div>

				{isVisitor ? (
					<div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
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
					<>
						<div className="w-full max-w-md space-y-2 pt-1">
							<div className="flex items-center justify-between gap-2 text-sm">
								<span className="font-semibold text-foreground">
									Level {levelInfo.level} · {levelInfo.title}
								</span>
								<span className="shrink-0 text-xs font-semibold text-primary-hover tabular-nums">
									{levelInfo.progressPercent}%
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
									? `Menuju Level ${levelInfo.level + 1}: ${levelInfo.nextLevelTitle}`
									: "Anda mencapai tingkat tertinggi kontributor Darasa."}
							</p>
						</div>

						<dl className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-1 text-sm">
							{[
								{ label: "Tempat", value: counts.places },
								{ label: "Ulasan", value: counts.reviews },
								{ label: "Foto", value: counts.photos },
								{ label: "Info diperbarui", value: counts.edits },
							].map((metric) => (
								<div key={metric.label} className="flex items-baseline gap-1.5">
									<dt className="text-xs text-muted-foreground">
										{metric.label}
									</dt>
									<dd className="font-bold text-foreground tabular-nums">
										{metric.value}
									</dd>
								</div>
							))}
						</dl>
					</>
				)}
			</div>
		</section>
	);
}
