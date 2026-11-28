import { AlertTriangle, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ClearableSearchInput } from "~/components/clearable-search-input";
import { PlacePagination } from "~/components/place-pagination";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DEFAULT_PLACES_PAGE_SIZE, paginateItems } from "~/lib/pagination";
import type { AnomalyFlag, AnomalyResolution } from "~/lib/types";
import { cn } from "~/lib/utils";

type AnomalyFilter = "all" | AnomalyResolution;

const ANOMALY_STATUS_OPTIONS: Array<{ value: AnomalyFilter; label: string }> = [
	{ value: "all", label: "Semua" },
	{ value: "open", label: "Perlu Tinjauan" },
	{ value: "cleared", label: "Dinyatakan Wajar" },
	{ value: "flagged_hold", label: "Perlu Pantauan" },
];

const ANOMALY_STATUS_BADGE: Record<
	AnomalyResolution,
	{ variant: "default" | "destructive" | "yellow"; label: string }
> = {
	cleared: { variant: "default", label: "Dinyatakan Wajar" },
	flagged_hold: { variant: "destructive", label: "Ditandai Perlu Pantauan" },
	open: { variant: "yellow", label: "Perlu Tinjauan" },
};

interface AdminAnomaliesTabProps {
	anomalies: AnomalyFlag[];
	onResolveAnomaly: (flagId: string, resolution: AnomalyResolution) => void;
}

export function AdminAnomaliesTab({
	anomalies,
	onResolveAnomaly,
}: AdminAnomaliesTabProps) {
	const [keyword, setKeyword] = useState("");
	const [statusFilter, setStatusFilter] = useState<AnomalyFilter>("all");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PLACES_PAGE_SIZE);

	const filteredAnomalies = useMemo(() => {
		const q = keyword.trim().toLowerCase();
		return anomalies.filter((flag) => {
			if (statusFilter !== "all" && flag.resolution !== statusFilter) {
				return false;
			}
			if (q) {
				const haystack = `${flag.placeName} ${flag.reason}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
	}, [anomalies, keyword, statusFilter]);

	const pagination = useMemo(
		() => paginateItems(filteredAnomalies, page, pageSize),
		[filteredAnomalies, page, pageSize],
	);

	const hasActiveFilters = keyword.trim().length > 0 || statusFilter !== "all";

	const handleReset = () => {
		setKeyword("");
		setStatusFilter("all");
		setPage(1);
	};

	return (
		<div className="space-y-5 pt-2">
			<div className="rounded-[10px] border border-accent-yellow/60 bg-yellow-soft p-4 flex items-start gap-3">
				<AlertTriangle
					className="mt-0.5 size-5 shrink-0 text-yellow-text"
					aria-hidden="true"
				/>
				<p className="text-sm text-yellow-text leading-relaxed">
					<strong>Aturan Peninjauan Manual (FR-036):</strong> Flag Z-Score hanya
					berfungsi sebagai indikasi statistik awal untuk ditinjau manual oleh
					administrator, bukan bukti otomatis kecurangan atau pelanggaran.
				</p>
			</div>

			<div className="flex flex-col gap-3 border-b border-border pb-4">
				<ClearableSearchInput
					value={keyword}
					onChange={(val) => {
						setKeyword(val);
						setPage(1);
					}}
					label="Cari indikasi anomali"
					placeholder="Cari nama tempat atau keterangan Z-Score..."
				/>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-2">
						{ANOMALY_STATUS_OPTIONS.map((opt) => {
							const active = statusFilter === opt.value;
							return (
								<button
									key={opt.value}
									type="button"
									aria-pressed={active}
									onClick={() => {
										setStatusFilter(opt.value);
										setPage(1);
									}}
									className={cn(
										"inline-flex min-h-[36px] items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
										active
											? "border-primary bg-primary text-primary-foreground"
											: "border-border bg-card text-foreground hover:border-primary/60",
									)}
								>
									{opt.label}
								</button>
							);
						})}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm text-muted-foreground">
							<strong className="font-semibold text-foreground tabular-nums">
								{filteredAnomalies.length}
							</strong>{" "}
							indikasi ditemukan
						</span>
						{hasActiveFilters ? (
							<Button variant="ghost" size="sm" onClick={handleReset}>
								<RotateCcw className="size-3.5" aria-hidden="true" />
								Reset
							</Button>
						) : null}
					</div>
				</div>
			</div>

			{filteredAnomalies.length === 0 ? (
				<div className="border-t border-border py-14 text-center space-y-4">
					<h2 className="text-lg font-semibold text-foreground">
						{anomalies.length === 0
							? "Tidak ada aktivitas rating dengan simpangan Z-Score di atas ambang saat ini"
							: "Tidak ada indikasi anomali yang cocok dengan filter"}
					</h2>
					{hasActiveFilters ? (
						<Button variant="secondary" onClick={handleReset}>
							Tampilkan Semua Indikasi
						</Button>
					) : null}
				</div>
			) : (
				<>
					<ul className="divide-y divide-border border-t border-border">
						{pagination.items.map((flag) => (
							<li
								key={flag.id}
								className="py-5 flex flex-wrap items-center justify-between gap-4"
							>
								<div className="space-y-1 max-w-2xl">
									<div className="flex flex-wrap items-center gap-2">
										<h2 className="text-base font-semibold text-foreground">
											{flag.placeName}
										</h2>
										<Badge
											variant={ANOMALY_STATUS_BADGE[flag.resolution].variant}
										>
											{ANOMALY_STATUS_BADGE[flag.resolution].label}
										</Badge>
									</div>
									<p className="text-sm text-muted-foreground tabular-nums">
										{flag.reason}
									</p>
								</div>

								<div className="flex flex-wrap gap-2">
									<Button
										variant="secondary"
										size="sm"
										onClick={() => onResolveAnomaly(flag.id, "cleared")}
									>
										Tandai Wajar
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => onResolveAnomaly(flag.id, "flagged_hold")}
									>
										Tahan untuk Pantauan
									</Button>
								</div>
							</li>
						))}
					</ul>

					<PlacePagination
						currentPage={pagination.currentPage}
						totalPages={pagination.totalPages}
						totalItems={pagination.totalItems}
						pageSize={pagination.pageSize}
						startItem={pagination.startItem}
						endItem={pagination.endItem}
						onPageChange={setPage}
						onPageSizeChange={(nextSize) => {
							setPageSize(nextSize);
							setPage(1);
						}}
						itemLabel="indikasi"
					/>
				</>
			)}
		</div>
	);
}
