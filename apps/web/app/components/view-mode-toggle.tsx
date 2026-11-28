import { LayoutGrid, List } from "lucide-react";
import type { ExploreViewMode } from "~/context/darasa-store";
import { cn } from "~/lib/utils";

interface ViewModeToggleProps {
	value: ExploreViewMode;
	onChange: (mode: ExploreViewMode) => void;
	legend?: string;
}

export function ViewModeToggle({
	value,
	onChange,
	legend = "Mode tampilan daftar",
}: ViewModeToggleProps) {
	return (
		<fieldset className="m-0 inline-flex shrink-0 items-center rounded-[8px] border border-border bg-background p-0.5">
			<legend className="sr-only">{legend}</legend>
			<button
				type="button"
				aria-label="Tampilan grid ala Play Store"
				title="Tampilan Grid"
				aria-pressed={value === "grid"}
				onClick={() => onChange("grid")}
				className={cn(
					"inline-flex size-9 items-center justify-center rounded-[6px] transition-colors",
					value === "grid"
						? "bg-card text-primary shadow-xs"
						: "text-muted-foreground hover:text-foreground",
				)}
			>
				<LayoutGrid className="size-4" aria-hidden="true" />
			</button>
			<button
				type="button"
				aria-label="Tampilan daftar ala Google Maps"
				title="Tampilan Daftar"
				aria-pressed={value === "list"}
				onClick={() => onChange("list")}
				className={cn(
					"inline-flex size-9 items-center justify-center rounded-[6px] transition-colors",
					value === "list"
						? "bg-card text-primary shadow-xs"
						: "text-muted-foreground hover:text-foreground",
				)}
			>
				<List className="size-4" aria-hidden="true" />
			</button>
		</fieldset>
	);
}
