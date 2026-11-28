import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export interface ContributePageHeaderProps {
	title: string;
	description: string;
}

export function ContributePageHeader({
	title,
	description,
}: ContributePageHeaderProps) {
	return (
		<header className="space-y-2 border-b border-border pb-5">
			<div>
				<Link
					to="/contribute"
					className="inline-flex min-h-[44px] items-center gap-2.5 rounded-[6px] text-base font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<ArrowLeft className="size-5 shrink-0" aria-hidden="true" />
					<span>Kembali</span>
				</Link>
			</div>

			<div className="space-y-1">
				<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
					{title}
				</h1>
				<p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
					{description}
				</p>
			</div>
		</header>
	);
}
