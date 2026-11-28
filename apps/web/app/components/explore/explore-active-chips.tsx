import { RotateCcw } from "lucide-react";
import { ActiveFilterChip } from "~/components/active-filter-chip";
import { Button } from "~/components/ui/button";
import { ViewModeToggle } from "~/components/view-mode-toggle";
import type { ExploreFilters, ExploreViewMode } from "~/context/darasa-store";
import { PRICE_TIER_LABELS, VERIFICATION_LABELS } from "~/data/explore-filters";

interface ExploreActiveChipsProps {
	totalResults: number;
	filters: ExploreFilters;
	hasActiveFilters: boolean;
	onUpdateFilters: (partial: Partial<ExploreFilters>) => void;
	onClearDistrict: () => void;
	onReset: () => void;
	onViewModeChange: (mode: ExploreViewMode) => void;
}

interface FilterChipItem {
	key: string;
	label: string;
	ariaLabel: string;
	tone?: "primary" | "yellow";
	onClear: () => void;
}

export function ExploreActiveChips({
	totalResults,
	filters,
	hasActiveFilters,
	onUpdateFilters,
	onClearDistrict,
	onReset,
	onViewModeChange,
}: ExploreActiveChipsProps) {
	const chips: FilterChipItem[] = [];

	if (filters.keyword.trim()) {
		chips.push({
			key: "keyword",
			label: `“${filters.keyword.trim()}”`,
			ariaLabel: `Hapus kata kunci ${filters.keyword}`,
			onClear: () => onUpdateFilters({ keyword: "" }),
		});
	}
	if (filters.category !== "all") {
		chips.push({
			key: "category",
			label: filters.category,
			ariaLabel: `Hapus filter kategori ${filters.category}`,
			onClear: () => onUpdateFilters({ category: "all" }),
		});
	}
	if (filters.district !== "all") {
		chips.push({
			key: "district",
			label: filters.district,
			ariaLabel: `Hapus filter kawasan ${filters.district}`,
			onClear: onClearDistrict,
		});
	}
	if (filters.verification !== "all") {
		chips.push({
			key: "verification",
			label: VERIFICATION_LABELS[filters.verification],
			ariaLabel: `Hapus filter verifikasi ${VERIFICATION_LABELS[filters.verification]}`,
			onClear: () => onUpdateFilters({ verification: "all" }),
		});
	}
	if (filters.minRating !== "all") {
		chips.push({
			key: "minRating",
			label: `Rating ${filters.minRating}+`,
			ariaLabel: `Hapus filter rating ${filters.minRating}+`,
			tone: "yellow",
			onClear: () => onUpdateFilters({ minRating: "all" }),
		});
	}
	if (filters.priceTier !== "all") {
		chips.push({
			key: "priceTier",
			label: PRICE_TIER_LABELS[filters.priceTier],
			ariaLabel: `Hapus filter harga ${PRICE_TIER_LABELS[filters.priceTier]}`,
			onClear: () => onUpdateFilters({ priceTier: "all" }),
		});
	}
	if (filters.onlyHiddenGem) {
		chips.push({
			key: "hiddenGem",
			label: "Hidden Gem",
			ariaLabel: "Hapus filter Hidden Gem",
			tone: "yellow",
			onClear: () => onUpdateFilters({ onlyHiddenGem: false }),
		});
	}
	if (filters.onlyBookmarked) {
		chips.push({
			key: "bookmarked",
			label: "Bookmark",
			ariaLabel: "Hapus filter Bookmark",
			onClear: () => onUpdateFilters({ onlyBookmarked: false }),
		});
	}

	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm text-muted-foreground">
					<strong className="font-semibold text-foreground tabular-nums">
						{totalResults}
					</strong>{" "}
					tempat ditemukan
				</span>

				{chips.map((chip) => (
					<ActiveFilterChip
						key={chip.key}
						label={chip.label}
						ariaLabel={chip.ariaLabel}
						tone={chip.tone}
						onClear={chip.onClear}
					/>
				))}

				{hasActiveFilters ? (
					<Button variant="ghost" size="sm" onClick={onReset}>
						<RotateCcw className="size-3.5" aria-hidden="true" />
						Reset
					</Button>
				) : null}
			</div>

			<div className="ml-auto flex shrink-0 items-center gap-2">
				<ViewModeToggle value={filters.viewMode} onChange={onViewModeChange} />
			</div>
		</div>
	);
}
