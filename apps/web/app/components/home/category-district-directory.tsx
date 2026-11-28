import {
	Coffee,
	Cookie,
	MapPin,
	PlusCircle,
	Soup,
	Utensils,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import type { ExploreFilters, PlaceWithMetrics } from "~/context/darasa-store";
import { BATANG_DISTRICTS, PLACE_CATEGORIES } from "~/data/batang-places";
import type { PlaceCategory } from "~/lib/types";

const CATEGORY_ICON_MAP: Record<PlaceCategory, typeof Soup> = {
	"Makanan berat": Soup,
	Minuman: Coffee,
	"Street food": Utensils,
	Dessert: Cookie,
};

interface CategoryDistrictDirectoryProps {
	places: PlaceWithMetrics[];
	onSelectFilter: (preset: Partial<ExploreFilters>) => void;
}

export function CategoryDistrictDirectory({
	places,
	onSelectFilter,
}: CategoryDistrictDirectoryProps) {
	return (
		<section
			aria-labelledby="home-directory-heading"
			className="space-y-4 rounded-[12px] border border-border bg-card p-5 sm:p-6"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2
					id="home-directory-heading"
					className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
				>
					Jelajahi Kategori &amp; Kawasan Batang
				</h2>
				<Button
					asChild
					variant="outline"
					className="min-h-[44px] rounded-[8px] border-input text-xs font-semibold"
				>
					<Link to="/contribute/add-place">
						<PlusCircle className="size-4 text-primary" aria-hidden="true" />
						Ajukan Tempat Baru
					</Link>
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
				{PLACE_CATEGORIES.map((category) => {
					const Icon = CATEGORY_ICON_MAP[category];
					const count = places.filter((p) => p.category === category).length;
					return (
						<button
							key={category}
							type="button"
							onClick={() => onSelectFilter({ category })}
							className="group flex min-h-[48px] items-center justify-between gap-3 rounded-[8px] border border-border bg-background px-3.5 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary-soft/50"
						>
							<span className="flex min-w-0 items-center gap-2.5">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
									<Icon className="size-4" aria-hidden="true" />
								</span>
								<span className="truncate text-sm font-semibold text-foreground">
									{category}
								</span>
							</span>
							<span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
								{count} tempat
							</span>
						</button>
					);
				})}
			</div>

			<div className="flex flex-wrap gap-2 border-t border-border pt-4">
				{BATANG_DISTRICTS.map((district) => {
					const count = places.filter((p) => p.district === district).length;
					return (
						<button
							key={district}
							type="button"
							onClick={() => onSelectFilter({ district })}
							className="inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary-soft/60 hover:text-primary-hover"
						>
							<MapPin
								className="size-3.5 shrink-0 text-primary"
								aria-hidden="true"
							/>
							<span>{district}</span>
							<span className="rounded-[6px] bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground tabular-nums">
								{count}
							</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}
