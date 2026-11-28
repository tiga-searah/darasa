import { Search, X } from "lucide-react";
import { useId } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface ClearableSearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	label: string;
	clearLabel?: string;
	className?: string;
}

export function ClearableSearchInput({
	value,
	onChange,
	placeholder,
	label,
	clearLabel = "Hapus kata kunci pencarian",
	className,
}: ClearableSearchInputProps) {
	const inputId = useId();

	return (
		<div className={cn("relative flex-1", className)}>
			<Label htmlFor={inputId} className="sr-only">
				{label}
			</Label>
			<Search
				className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<Input
				id={inputId}
				type="search"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="h-11 rounded-full border-border bg-background pl-10 pr-10"
			/>
			{value.trim() ? (
				<button
					type="button"
					onClick={() => onChange("")}
					aria-label={clearLabel}
					className="absolute right-2.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<X className="size-4" aria-hidden="true" />
				</button>
			) : null}
		</div>
	);
}
