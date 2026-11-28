import { Camera, MapPinPlus, PencilLine, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type HistoryFilter = "all" | "place" | "review" | "other";

export interface TimelineEntry {
	id: string;
	kind: "place" | "review" | "photo" | "edit";
	title: string;
	subtitle: string;
	slug: string;
	createdAt: string;
	xp: number;
}

interface ContributionHistorySectionProps {
	isVisitor: boolean;
	timelineEntries: TimelineEntry[];
}

export function ContributionHistorySection({
	isVisitor,
	timelineEntries,
}: ContributionHistorySectionProps) {
	const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
	const [showAllHistory, setShowAllHistory] = useState(false);

	const filteredTimeline = useMemo(() => {
		if (historyFilter === "all") return timelineEntries;
		if (historyFilter === "place") {
			return timelineEntries.filter((e) => e.kind === "place");
		}
		if (historyFilter === "review") {
			return timelineEntries.filter((e) => e.kind === "review");
		}
		return timelineEntries.filter(
			(e) => e.kind === "photo" || e.kind === "edit",
		);
	}, [timelineEntries, historyFilter]);

	const visibleTimeline = showAllHistory
		? filteredTimeline
		: filteredTimeline.slice(0, 6);

	return (
		<section
			aria-labelledby="contribution-history-heading"
			className="lg:col-span-5 rounded-[12px] border border-border bg-card p-5 space-y-4"
		>
			<div className="flex items-center justify-between gap-2">
				<h2
					id="contribution-history-heading"
					className="text-base font-semibold text-foreground"
				>
					Riwayat Kontribusi
				</h2>
				{!isVisitor ? (
					<span className="text-xs font-semibold text-muted-foreground tabular-nums">
						{timelineEntries.length}
					</span>
				) : null}
			</div>

			{isVisitor ? (
				<p className="rounded-[10px] border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
					Riwayat kontribusi Anda akan tampil di sini setelah masuk ke akun
					warga.
				</p>
			) : timelineEntries.length === 0 ? (
				<div className="rounded-[10px] border border-dashed border-border bg-background/60 p-4 space-y-3">
					<p className="text-sm text-muted-foreground">
						Belum ada kontribusi pada akun ini. Mulai dengan menulis ulasan atau
						menambahkan tempat baru.
					</p>
					<Button asChild variant="outline">
						<Link to="/contribute/write-review">Tulis Ulasan</Link>
					</Button>
				</div>
			) : (
				<>
					<div className="flex flex-wrap gap-1.5">
						{(
							[
								{ id: "all", label: "Semua" },
								{ id: "place", label: "Tempat" },
								{ id: "review", label: "Ulasan" },
								{ id: "other", label: "Foto & Info" },
							] as const
						).map((filterItem) => (
							<button
								key={filterItem.id}
								type="button"
								onClick={() => {
									setHistoryFilter(filterItem.id);
									setShowAllHistory(false);
								}}
								aria-pressed={historyFilter === filterItem.id}
								className={cn(
									"min-h-[44px] rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									historyFilter === filterItem.id
										? "border-primary bg-primary-soft font-semibold text-primary-hover"
										: "border-border bg-background font-medium text-muted-foreground hover:text-foreground",
								)}
							>
								{filterItem.label}
							</button>
						))}
					</div>

					{filteredTimeline.length === 0 ? (
						<p className="rounded-[10px] border border-border bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
							Belum ada kontribusi pada kategori ini.
						</p>
					) : (
						<div className="divide-y divide-border border-t border-border">
							{visibleTimeline.map((entry) => {
								const rowContent = (
									<>
										<span className="mt-0.5 shrink-0">
											{entry.kind === "place" ? (
												<MapPinPlus
													className="size-4 text-primary"
													aria-hidden="true"
												/>
											) : entry.kind === "review" ? (
												<Star
													className="size-4 fill-accent-yellow text-accent-yellow"
													aria-hidden="true"
												/>
											) : entry.kind === "photo" ? (
												<Camera
													className="size-4 text-primary"
													aria-hidden="true"
												/>
											) : (
												<PencilLine
													className="size-4 text-primary"
													aria-hidden="true"
												/>
											)}
										</span>
										<div className="min-w-0 flex-1 space-y-0.5">
											<p className="truncate text-sm font-medium text-foreground">
												{entry.title}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{entry.subtitle}
											</p>
										</div>
										<span className="shrink-0 text-xs font-semibold text-primary-hover tabular-nums">
											+{entry.xp} XP
										</span>
									</>
								);

								return entry.slug ? (
									<Link
										key={entry.id}
										to={`/places/${entry.slug}`}
										className="flex min-h-[44px] items-start gap-3 py-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										{rowContent}
									</Link>
								) : (
									<div
										key={entry.id}
										className="flex min-h-[44px] items-start gap-3 py-3"
									>
										{rowContent}
									</div>
								);
							})}
						</div>
					)}

					{filteredTimeline.length > 6 ? (
						<button
							type="button"
							onClick={() => setShowAllHistory((prev) => !prev)}
							className="min-h-[44px] w-full rounded-[8px] border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{showAllHistory ? "Tampilkan ringkas" : "Lihat semua"}
						</button>
					) : null}
				</>
			)}
		</section>
	);
}
