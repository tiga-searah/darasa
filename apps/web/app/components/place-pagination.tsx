import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useId } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { getPaginationRange, PLACES_PAGE_SIZE_OPTIONS } from "~/lib/pagination";
import { cn } from "~/lib/utils";

interface PlacePaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	pageSize: number;
	startItem: number;
	endItem: number;
	onPageChange: (page: number) => void;
	onPageSizeChange?: (pageSize: number) => void;
	itemLabel?: string;
}

export function PlacePagination({
	currentPage,
	totalPages,
	totalItems,
	pageSize,
	startItem,
	endItem,
	onPageChange,
	onPageSizeChange,
	itemLabel = "tempat",
}: PlacePaginationProps) {
	const pageSizeId = useId();
	if (totalItems === 0) return null;

	const range = getPaginationRange(currentPage, totalPages);
	let ellipsisCount = 0;

	return (
		<div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
				<p className="tabular-nums">
					Menampilkan{" "}
					<strong className="font-semibold text-foreground">
						{startItem}&ndash;{endItem}
					</strong>{" "}
					dari{" "}
					<strong className="font-semibold text-foreground">
						{totalItems}
					</strong>{" "}
					{itemLabel}
				</p>

				{onPageSizeChange ? (
					<div className="flex items-center gap-2">
						<Label
							htmlFor={pageSizeId}
							className="text-xs text-muted-foreground"
						>
							Per halaman:
						</Label>
						<Select
							value={String(pageSize)}
							onValueChange={(val) => onPageSizeChange(Number(val))}
						>
							<SelectTrigger
								id={pageSizeId}
								aria-label="Jumlah tempat per halaman"
								className="min-h-[36px] h-9 w-[80px] bg-background px-2.5 py-1 text-xs tabular-nums"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PLACES_PAGE_SIZE_OPTIONS.map((option) => (
									<SelectItem key={option} value={String(option)}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : null}
			</div>

			{totalPages > 1 ? (
				<nav
					aria-label="Navigasi halaman daftar tempat"
					className="flex flex-wrap items-center gap-1.5"
				>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={currentPage <= 1}
						onClick={() => onPageChange(currentPage - 1)}
						aria-label="Halaman sebelumnya"
						className="min-h-[38px] gap-1 px-2.5"
					>
						<ChevronLeft className="size-4" aria-hidden="true" />
						<span className="hidden sm:inline">Sebelumnya</span>
					</Button>

					<div className="flex items-center gap-1">
						{range.map((token) => {
							if (token === "ellipsis") {
								ellipsisCount += 1;
								return (
									<span
										key={`ellipsis-${ellipsisCount}`}
										aria-hidden="true"
										className="inline-flex size-9 items-center justify-center text-muted-foreground"
									>
										<MoreHorizontal className="size-4" />
									</span>
								);
							}

							const isCurrent = token === currentPage;
							return (
								<Button
									key={token}
									type="button"
									variant={isCurrent ? "default" : "outline"}
									size="sm"
									onClick={() => onPageChange(token)}
									aria-current={isCurrent ? "page" : undefined}
									aria-label={`Halaman ${token}`}
									className={cn(
										"min-h-[38px] min-w-[38px] px-2.5 tabular-nums",
										isCurrent && "pointer-events-none",
									)}
								>
									{token}
								</Button>
							);
						})}
					</div>

					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={currentPage >= totalPages}
						onClick={() => onPageChange(currentPage + 1)}
						aria-label="Halaman berikutnya"
						className="min-h-[38px] gap-1 px-2.5"
					>
						<span className="hidden sm:inline">Berikutnya</span>
						<ChevronRight className="size-4" aria-hidden="true" />
					</Button>
				</nav>
			) : null}
		</div>
	);
}
