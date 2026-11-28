import { X } from "lucide-react";
import { cn } from "~/lib/utils";

interface ActiveFilterChipProps {
	label: string;
	ariaLabel: string;
	tone?: "primary" | "yellow";
	onClear: () => void;
}

export function ActiveFilterChip({
	label,
	ariaLabel,
	tone = "primary",
	onClear,
}: ActiveFilterChipProps) {
	return (
		<button
			type="button"
			onClick={onClear}
			aria-label={ariaLabel}
			className={cn(
				"inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:brightness-95",
				tone === "yellow"
					? "border-accent-yellow/50 bg-yellow-soft text-yellow-text"
					: "border-primary/25 bg-primary-soft text-primary-hover",
			)}
		>
			{label}
			<X className="size-3.5" aria-hidden="true" />
		</button>
	);
}
