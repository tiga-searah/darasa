import { MapPin, RotateCcw, ShieldCheck, Star, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { ClearableSearchInput } from "~/components/clearable-search-input";
import { PlacePagination } from "~/components/place-pagination";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { VerificationBadge } from "~/components/verification-badge";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { BATANG_DISTRICTS } from "~/data/batang-places";
import { VERIFICATION_LABELS } from "~/data/explore-filters";
import { DEFAULT_PLACES_PAGE_SIZE, paginateItems } from "~/lib/pagination";
import type { BatangDistrict, VerificationStatus } from "~/lib/types";
import { cn } from "~/lib/utils";

interface AdminPlacesTabProps {
	places: PlaceWithMetrics[];
	onSetPlaceVerification: (
		placeId: string,
		status: VerificationStatus,
		approvePending?: boolean,
	) => void;
}

export function AdminPlacesTab({
	places,
	onSetPlaceVerification,
}: AdminPlacesTabProps) {
	const [keyword, setKeyword] = useState("");
	const [districtFilter, setDistrictFilter] = useState<BatangDistrict | "all">(
		"all",
	);
	const [verificationFilter, setVerificationFilter] = useState<
		VerificationStatus | "all"
	>("all");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PLACES_PAGE_SIZE);

	const districtId = useId();
	const verifyId = useId();

	const filteredPlaces = useMemo(() => {
		const q = keyword.trim().toLowerCase();
		return places.filter((p) => {
			if (q) {
				const haystack =
					`${p.name} ${p.category} ${p.district} ${p.address}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			if (districtFilter !== "all" && p.district !== districtFilter) {
				return false;
			}
			if (
				verificationFilter !== "all" &&
				p.verificationStatus !== verificationFilter
			) {
				return false;
			}
			return true;
		});
	}, [places, keyword, districtFilter, verificationFilter]);

	const pagination = useMemo(
		() => paginateItems(filteredPlaces, page, pageSize),
		[filteredPlaces, page, pageSize],
	);

	const hasActiveFilters =
		keyword.trim().length > 0 ||
		districtFilter !== "all" ||
		verificationFilter !== "all";

	const handleReset = () => {
		setKeyword("");
		setDistrictFilter("all");
		setVerificationFilter("all");
		setPage(1);
	};

	return (
		<div className="space-y-5 pt-2">
			<div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
				<ClearableSearchInput
					value={keyword}
					onChange={(val) => {
						setKeyword(val);
						setPage(1);
					}}
					label="Cari tempat kuliner untuk moderasi"
					placeholder="Cari nama tempat, kategori, atau kawasan..."
				/>

				<div className="grid grid-cols-1 gap-2.5 sm:flex sm:items-center">
					<div className="sm:w-[200px]">
						<Label htmlFor={districtId} className="sr-only">
							Filter kawasan
						</Label>
						<Select
							value={districtFilter}
							onValueChange={(val) => {
								setDistrictFilter(val as BatangDistrict | "all");
								setPage(1);
							}}
						>
							<SelectTrigger id={districtId} className="bg-background">
								<div className="flex min-w-0 flex-1 items-center gap-2">
									<MapPin
										className={cn(
											"size-4 shrink-0",
											districtFilter !== "all"
												? "text-primary"
												: "text-muted-foreground",
										)}
										aria-hidden="true"
									/>
									<SelectValue />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Semua Kawasan</SelectItem>
								{BATANG_DISTRICTS.map((d) => (
									<SelectItem key={d} value={d}>
										{d}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="sm:w-[220px]">
						<Label htmlFor={verifyId} className="sr-only">
							Filter status verifikasi
						</Label>
						<Select
							value={verificationFilter}
							onValueChange={(val) => {
								setVerificationFilter(val as VerificationStatus | "all");
								setPage(1);
							}}
						>
							<SelectTrigger id={verifyId} className="bg-background">
								<div className="flex min-w-0 flex-1 items-center gap-2">
									<ShieldCheck
										className={cn(
											"size-4 shrink-0",
											verificationFilter !== "all"
												? "text-primary"
												: "text-muted-foreground",
										)}
										aria-hidden="true"
									/>
									<SelectValue />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Semua Status</SelectItem>
								<SelectItem value="owner_verified">
									Terverifikasi Pemilik
								</SelectItem>
								<SelectItem value="community_verified">
									Terverifikasi Komunitas
								</SelectItem>
								<SelectItem value="unverified">Belum Terverifikasi</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm text-muted-foreground">
					<strong className="font-semibold text-foreground tabular-nums">
						{filteredPlaces.length}
					</strong>{" "}
					tempat ditemukan
				</span>

				{keyword.trim() ? (
					<button
						type="button"
						onClick={() => {
							setKeyword("");
							setPage(1);
						}}
						aria-label={`Hapus kata kunci ${keyword}`}
						className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
					>
						&ldquo;{keyword.trim()}&rdquo;
						<X className="size-3.5" aria-hidden="true" />
					</button>
				) : null}

				{districtFilter !== "all" ? (
					<button
						type="button"
						onClick={() => {
							setDistrictFilter("all");
							setPage(1);
						}}
						aria-label={`Hapus filter kawasan ${districtFilter}`}
						className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
					>
						{districtFilter}
						<X className="size-3.5" aria-hidden="true" />
					</button>
				) : null}

				{verificationFilter !== "all" ? (
					<button
						type="button"
						onClick={() => {
							setVerificationFilter("all");
							setPage(1);
						}}
						aria-label={`Hapus filter verifikasi ${VERIFICATION_LABELS[verificationFilter]}`}
						className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
					>
						{VERIFICATION_LABELS[verificationFilter]}
						<X className="size-3.5" aria-hidden="true" />
					</button>
				) : null}

				{hasActiveFilters ? (
					<Button variant="ghost" size="sm" onClick={handleReset}>
						<RotateCcw className="size-3.5" aria-hidden="true" />
						Reset
					</Button>
				) : null}
			</div>

			{filteredPlaces.length === 0 ? (
				<div className="border-t border-border py-14 text-center space-y-4">
					<h2 className="text-lg font-semibold text-foreground">
						Tidak ada tempat kuliner yang cocok dengan filter
					</h2>
					<Button variant="secondary" onClick={handleReset}>
						Tampilkan Semua Tempat
					</Button>
				</div>
			) : (
				<>
					<div className="border-t border-border">
						<Table>
							<TableCaption className="sr-only">
								Daftar tempat kuliner dan status verifikasi Darasa
							</TableCaption>
							<TableHeader>
								<TableRow>
									<TableHead>Nama Tempat</TableHead>
									<TableHead>Kawasan</TableHead>
									<TableHead>Rating / Ulasan</TableHead>
									<TableHead>Status Saat Ini</TableHead>
									<TableHead className="text-right">
										Tindakan Verifikasi
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{pagination.items.map((p) => (
									<TableRow key={p.id}>
										<TableCell>
											<Link
												to={`/places/${p.slug}`}
												className="font-semibold text-foreground hover:text-primary hover:underline"
											>
												{p.name}
											</Link>
											<p className="text-xs text-muted-foreground">
												{p.category}
											</p>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{p.district}
										</TableCell>
										<TableCell className="tabular-nums">
											<span className="inline-flex items-center gap-1 font-semibold text-foreground">
												<Star
													className="size-3.5 fill-accent-yellow text-accent-yellow"
													aria-hidden="true"
												/>
												{p.reviewCount > 0
													? p.averageRating.toFixed(1)
													: "Baru"}
												<span className="font-normal text-muted-foreground">
													({p.reviewCount})
												</span>
											</span>
										</TableCell>
										<TableCell>
											<VerificationBadge
												status={p.verificationStatus}
												isPendingModeration={p.isPendingModeration}
											/>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap justify-end gap-2">
												<Button
													variant="secondary"
													size="sm"
													onClick={() =>
														onSetPlaceVerification(
															p.id,
															"community_verified",
															true,
														)
													}
												>
													Verifikasi Komunitas
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														onSetPlaceVerification(p.id, "unverified", false)
													}
												>
													Reset
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

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
					/>
				</>
			)}
		</div>
	);
}
