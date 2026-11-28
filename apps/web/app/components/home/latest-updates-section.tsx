import { ArrowRight, MessageSquare, PlusCircle, Star } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import type { PlaceWithMetrics } from "~/context/darasa-store";

export interface UpdateFeedEntry {
	id: string;
	kind: "review" | "place";
	place: PlaceWithMetrics;
	title: string;
	snippet: string;
	actorName: string;
	rating?: number;
	timestamp: string;
}

function formatShortDate(isoDate: string): string {
	const parsed = Date.parse(isoDate);
	if (Number.isNaN(parsed)) return "Baru";
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(parsed));
}

interface LatestUpdatesSectionProps {
	entries: UpdateFeedEntry[];
	onViewAll: () => void;
}

export function LatestUpdatesSection({
	entries,
	onViewAll,
}: LatestUpdatesSectionProps) {
	return (
		<section aria-labelledby="home-updates-heading" className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2
					id="home-updates-heading"
					className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
				>
					Pembaruan Terbaru
				</h2>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={onViewAll}
					aria-label="Lihat Semua Terbaru"
					title="Lihat Semua Terbaru"
					className="size-11 rounded-full"
				>
					<ArrowRight className="size-5" aria-hidden="true" />
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
				{entries.map((entry) => (
					<article
						key={entry.id}
						className="group relative flex items-start gap-3 rounded-[10px] border border-border bg-card p-3 transition-colors hover:border-input hover:bg-muted/40"
					>
						<div className="w-[88px] shrink-0 overflow-hidden rounded-[8px] border border-border bg-muted">
							<img
								src={entry.place.photos[0] ?? "/images/megono-batang.svg"}
								alt=""
								width={176}
								height={110}
								loading="lazy"
								className="aspect-[16/10] w-full object-cover"
							/>
						</div>

						<div className="min-w-0 flex-1 space-y-1">
							<div className="flex items-start justify-between gap-2">
								<h3 className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
									<Link
										to={`/places/${entry.place.slug}`}
										className="after:absolute after:inset-0 after:rounded-[10px] focus-visible:outline-none"
									>
										{entry.title}
									</Link>
								</h3>
								{entry.kind === "review" && entry.rating ? (
									<span className="inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-yellow-soft px-1.5 py-0.5 text-[11px] font-bold text-yellow-text tabular-nums">
										<Star className="size-3 fill-current" aria-hidden="true" />
										{entry.rating.toFixed(1)}
									</span>
								) : (
									<span className="shrink-0 rounded-[6px] bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
										Baru
									</span>
								)}
							</div>

							<p className="line-clamp-1 text-xs text-muted-foreground">
								{entry.snippet}
							</p>

							<div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
								<span className="inline-flex min-w-0 flex-1 items-center gap-1">
									{entry.kind === "review" ? (
										<MessageSquare
											className="size-3 shrink-0 text-primary"
											aria-hidden="true"
										/>
									) : (
										<PlusCircle
											className="size-3 shrink-0 text-primary"
											aria-hidden="true"
										/>
									)}
									<span className="truncate font-medium text-foreground">
										{entry.actorName}
									</span>
									<span aria-hidden="true" className="shrink-0">
										·
									</span>
									<span className="truncate">{entry.place.district}</span>
								</span>
								<time
									dateTime={entry.timestamp}
									className="shrink-0 tabular-nums"
								>
									{formatShortDate(entry.timestamp)}
								</time>
							</div>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
