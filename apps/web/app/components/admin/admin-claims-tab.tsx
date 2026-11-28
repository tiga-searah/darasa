import { Check, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ClearableSearchInput } from "~/components/clearable-search-input";
import { PlacePagination } from "~/components/place-pagination";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DEFAULT_PLACES_PAGE_SIZE, paginateItems } from "~/lib/pagination";
import type { BusinessClaim, ClaimStatus } from "~/lib/types";
import { cn } from "~/lib/utils";

type ClaimStatusFilter = "all" | ClaimStatus;

const STATUS_OPTIONS: Array<{ value: ClaimStatusFilter; label: string }> = [
	{ value: "all", label: "Semua" },
	{ value: "pending", label: "Menunggu" },
	{ value: "approved", label: "Disetujui" },
	{ value: "rejected", label: "Ditolak" },
];

interface AdminClaimsTabProps {
	claims: BusinessClaim[];
	onReviewClaim: (
		claimId: string,
		decision: "approved" | "rejected",
		adminNote?: string,
	) => void;
}

export function AdminClaimsTab({ claims, onReviewClaim }: AdminClaimsTabProps) {
	const [claimNotes, setClaimNotes] = useState<Record<string, string>>({});
	const [keyword, setKeyword] = useState("");
	const [statusFilter, setStatusFilter] = useState<ClaimStatusFilter>("all");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PLACES_PAGE_SIZE);

	const filteredClaims = useMemo(() => {
		const q = keyword.trim().toLowerCase();
		return claims.filter((claim) => {
			if (statusFilter !== "all" && claim.status !== statusFilter) {
				return false;
			}
			if (q) {
				const haystack =
					`${claim.placeName} ${claim.claimantName} ${claim.claimantEmail} ${claim.businessRole} ${claim.evidenceSummary}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
	}, [claims, keyword, statusFilter]);

	const pagination = useMemo(
		() => paginateItems(filteredClaims, page, pageSize),
		[filteredClaims, page, pageSize],
	);

	const hasActiveFilters = keyword.trim().length > 0 || statusFilter !== "all";

	const handleReset = () => {
		setKeyword("");
		setStatusFilter("all");
		setPage(1);
	};

	return (
		<div className="space-y-5 pt-2">
			<div className="flex flex-col gap-3 border-b border-border pb-4">
				<ClearableSearchInput
					value={keyword}
					onChange={(val) => {
						setKeyword(val);
						setPage(1);
					}}
					label="Cari pengajuan klaim"
					placeholder="Cari nama usaha, pengaju, atau email..."
				/>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-2">
						{STATUS_OPTIONS.map((opt) => {
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
								{filteredClaims.length}
							</strong>{" "}
							pengajuan ditemukan
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

			{filteredClaims.length === 0 ? (
				<div className="border-t border-border py-14 text-center space-y-4">
					<h2 className="text-lg font-semibold text-foreground">
						{claims.length === 0
							? "Belum ada pengajuan klaim yang masuk"
							: "Tidak ada pengajuan klaim yang cocok dengan filter"}
					</h2>
					{hasActiveFilters ? (
						<Button variant="secondary" onClick={handleReset}>
							Tampilkan Semua Pengajuan
						</Button>
					) : null}
				</div>
			) : (
				<>
					<ul className="divide-y divide-border border-t border-border">
						{pagination.items.map((claim) => (
							<li key={claim.id} className="py-5 space-y-3.5">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="space-y-1">
										<h2 className="text-lg font-semibold text-foreground">
											{claim.placeName}
										</h2>
										<p className="text-xs text-muted-foreground">
											Pengaju:{" "}
											<strong className="text-foreground">
												{claim.claimantName}
											</strong>{" "}
											({claim.claimantEmail}) · {claim.businessRole} · WA{" "}
											{claim.whatsappNumber}
										</p>
									</div>
									<Badge
										variant={
											claim.status === "approved"
												? "default"
												: claim.status === "rejected"
													? "destructive"
													: "yellow"
										}
									>
										{claim.status === "approved"
											? "Disetujui"
											: claim.status === "rejected"
												? "Ditolak"
												: "Menunggu Tinjauan"}
									</Badge>
								</div>

								<p className="border-l-2 border-border pl-3.5 py-0.5 text-sm text-foreground">
									Bukti: {claim.evidenceSummary}
									{claim.evidenceFileName
										? ` (Lampiran: ${claim.evidenceFileName})`
										: ""}
								</p>

								{claim.status === "pending" ? (
									<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
										<label className="sr-only" htmlFor={`note-${claim.id}`}>
											Catatan keputusan untuk {claim.placeName}
										</label>
										<Input
											id={`note-${claim.id}`}
											type="text"
											value={claimNotes[claim.id] ?? ""}
											onChange={(e) =>
												setClaimNotes((prev) => ({
													...prev,
													[claim.id]: e.target.value,
												}))
											}
											placeholder="Catatan keputusan admin (opsional)..."
											className="flex-1"
										/>
										<div className="flex gap-2">
											<Button
												onClick={() =>
													onReviewClaim(
														claim.id,
														"approved",
														claimNotes[claim.id],
													)
												}
											>
												<Check className="size-4" aria-hidden="true" />
												Setujui Klaim
											</Button>
											<Button
												variant="destructive"
												onClick={() =>
													onReviewClaim(
														claim.id,
														"rejected",
														claimNotes[claim.id],
													)
												}
											>
												<X className="size-4" aria-hidden="true" />
												Tolak
											</Button>
										</div>
									</div>
								) : claim.adminNote ? (
									<p className="text-xs text-muted-foreground">
										Catatan keputusan: {claim.adminNote}
									</p>
								) : null}
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
						itemLabel="pengajuan"
					/>
				</>
			)}
		</div>
	);
}
