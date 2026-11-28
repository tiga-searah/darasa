import gsap from "gsap";
import {
	Banknote,
	Bookmark,
	Gem,
	MapPin,
	RotateCcw,
	ShieldCheck,
	Star,
} from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import type {
	ExploreFilters,
	ExploreMinRating,
	ExplorePriceTier,
} from "~/context/darasa-store";
import { BATANG_DISTRICTS, PLACE_CATEGORIES } from "~/data/batang-places";
import { MIN_RATING_OPTIONS, PRICE_TIER_OPTIONS } from "~/data/explore-filters";
import type { BatangDistrict, VerificationStatus } from "~/lib/types";
import { cn } from "~/lib/utils";

interface ExploreFilterPanelProps {
	id: string;
	open: boolean;
	filters: ExploreFilters;
	bookmarkedCount: number;
	hasActiveFilters: boolean;
	onUpdateFilters: (partial: Partial<ExploreFilters>) => void;
	onDistrictChange: (district: BatangDistrict | "all") => void;
	onReset: () => void;
	onClose: () => void;
}

export function ExploreFilterPanel({
	id,
	open,
	filters,
	bookmarkedCount,
	hasActiveFilters,
	onUpdateFilters,
	onDistrictChange,
	onReset,
	onClose,
}: ExploreFilterPanelProps) {
	const panelRef = useRef<HTMLDivElement>(null);
	const districtSelectId = useId();
	const verifySelectId = useId();
	const ratingSelectId = useId();
	const priceSelectId = useId();

	useEffect(() => {
		if (!open) return;
		const panel = panelRef.current;
		if (!panel) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				panel.children,
				{ opacity: 0, y: 8 },
				{
					opacity: 1,
					y: 0,
					duration: 0.24,
					stagger: 0.05,
					delay: 0.04,
					ease: "power2.out",
					clearProps: "opacity,transform",
				},
			);
		}, panelRef);

		return () => ctx.revert();
	}, [open]);

	const {
		category: selectedCategory,
		district: selectedDistrict,
		verification: verificationFilter,
		minRating,
		priceTier,
		onlyHiddenGem,
		onlyBookmarked,
	} = filters;

	return (
		<div
			id={id}
			aria-hidden={!open}
			inert={!open}
			className={cn(
				"grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none",
				open
					? "mt-4 grid-rows-[1fr] opacity-100"
					: "pointer-events-none !mt-0 grid-rows-[0fr] opacity-0",
			)}
		>
			<div className="min-h-0 overflow-hidden">
				<div
					ref={panelRef}
					className="flex flex-col gap-5 rounded-[14px] border border-border bg-background p-4 sm:p-5"
				>
					{/* Category Pills */}
					<fieldset className="border-0 p-0">
						<legend className="mb-2.5 text-xs font-semibold leading-none text-muted-foreground">
							Kategori Kuliner
						</legend>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								aria-pressed={selectedCategory === "all"}
								onClick={() => onUpdateFilters({ category: "all" })}
								className={cn(
									"inline-flex min-h-[36px] items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
									selectedCategory === "all"
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-card text-foreground hover:border-primary/60",
								)}
							>
								Semua Kategori
							</button>
							{PLACE_CATEGORIES.map((category) => {
								const active = selectedCategory === category;
								return (
									<button
										key={category}
										type="button"
										aria-pressed={active}
										onClick={() =>
											onUpdateFilters({
												category: active ? "all" : category,
											})
										}
										className={cn(
											"inline-flex min-h-[36px] items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
											active
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-card text-foreground hover:border-primary/60",
										)}
									>
										{category}
									</button>
								);
							})}
						</div>
					</fieldset>

					{/* District + Verification + Rating + Price Grid */}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
						<div className="flex flex-col gap-2">
							<Label
								htmlFor={districtSelectId}
								className="text-xs font-semibold text-muted-foreground"
							>
								Kawasan Batang
							</Label>
							<Select
								value={selectedDistrict}
								onValueChange={(val) =>
									onDistrictChange(val as BatangDistrict | "all")
								}
							>
								<SelectTrigger id={districtSelectId} className="bg-card">
									<div className="flex min-w-0 flex-1 items-center gap-2">
										<MapPin
											className={cn(
												"size-4 shrink-0",
												selectedDistrict !== "all"
													? "text-primary"
													: "text-muted-foreground",
											)}
											aria-hidden="true"
										/>
										<SelectValue />
									</div>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Semua Kawasan Batang</SelectItem>
									{BATANG_DISTRICTS.map((district) => (
										<SelectItem key={district} value={district}>
											{district}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor={verifySelectId}
								className="text-xs font-semibold text-muted-foreground"
							>
								Status Verifikasi
							</Label>
							<Select
								value={verificationFilter}
								onValueChange={(val) =>
									onUpdateFilters({
										verification: val as VerificationStatus | "all",
									})
								}
							>
								<SelectTrigger id={verifySelectId} className="bg-card">
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
									<SelectItem value="unverified">
										Belum Terverifikasi
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor={ratingSelectId}
								className="text-xs font-semibold text-muted-foreground"
							>
								Rating Minimum
							</Label>
							<Select
								value={minRating}
								onValueChange={(val) =>
									onUpdateFilters({ minRating: val as ExploreMinRating })
								}
							>
								<SelectTrigger id={ratingSelectId} className="bg-card">
									<div className="flex min-w-0 flex-1 items-center gap-2">
										<Star
											className={cn(
												"size-4 shrink-0",
												minRating !== "all"
													? "fill-accent-yellow text-accent-yellow"
													: "text-muted-foreground",
											)}
											aria-hidden="true"
										/>
										<SelectValue />
									</div>
								</SelectTrigger>
								<SelectContent>
									{MIN_RATING_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor={priceSelectId}
								className="text-xs font-semibold text-muted-foreground"
							>
								Kisaran Harga
							</Label>
							<Select
								value={priceTier}
								onValueChange={(val) =>
									onUpdateFilters({ priceTier: val as ExplorePriceTier })
								}
							>
								<SelectTrigger id={priceSelectId} className="bg-card">
									<div className="flex min-w-0 flex-1 items-center gap-2">
										<Banknote
											className={cn(
												"size-4 shrink-0",
												priceTier !== "all"
													? "text-primary"
													: "text-muted-foreground",
											)}
											aria-hidden="true"
										/>
										<SelectValue />
									</div>
								</SelectTrigger>
								<SelectContent>
									{PRICE_TIER_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Extra Toggles + Panel Actions */}
					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								aria-pressed={onlyHiddenGem}
								onClick={() =>
									onUpdateFilters({ onlyHiddenGem: !onlyHiddenGem })
								}
								className={cn(
									"inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
									onlyHiddenGem
										? "border-accent-yellow bg-accent text-accent-foreground"
										: "border-border bg-card text-foreground hover:border-accent-yellow",
								)}
							>
								<Gem className="size-3.5" aria-hidden="true" />
								Hanya Hidden Gem
							</button>

							<button
								type="button"
								aria-pressed={onlyBookmarked}
								onClick={() =>
									onUpdateFilters({ onlyBookmarked: !onlyBookmarked })
								}
								className={cn(
									"inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
									onlyBookmarked
										? "border-primary bg-primary-soft text-primary-hover"
										: "border-border bg-card text-foreground hover:border-primary/60",
								)}
							>
								<Bookmark className="size-3.5" aria-hidden="true" />
								Hanya Bookmark ({bookmarkedCount})
							</button>
						</div>

						<div className="ml-auto flex shrink-0 items-center gap-2">
							{hasActiveFilters ? (
								<Button variant="ghost" size="sm" onClick={onReset}>
									<RotateCcw className="size-3.5" aria-hidden="true" />
									Reset Semua
								</Button>
							) : null}
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={onClose}
							>
								Tutup Filter
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
