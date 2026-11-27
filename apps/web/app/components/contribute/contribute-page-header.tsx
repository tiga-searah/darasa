import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";

export interface ContributePageHeaderProps {
	title: string;
	description: string;
	xpReward?: number;
}

export function ContributePageHeader({
	title,
	description,
	xpReward,
}: ContributePageHeaderProps) {
	return (
		<header className="space-y-3 border-b border-border pb-4">
			<div>
				<Link
					to="/contribute"
					className="inline-flex min-h-[44px] items-center gap-2 rounded-[6px] text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
					<span>Kembali ke Kontribusi</span>
				</Link>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1">
					<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
						{title}
					</h1>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>

				{typeof xpReward === "number" && xpReward > 0 ? (
					<Badge
						variant="default"
						className="self-start shrink-0 font-semibold tabular-nums"
					>
						+{xpReward} XP
					</Badge>
				) : null}
			</div>
		</header>
	);
}
