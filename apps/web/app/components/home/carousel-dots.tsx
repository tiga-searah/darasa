import { cn } from "~/lib/utils";

export function getScrollBehavior(): ScrollBehavior {
	if (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		return "auto";
	}
	return "smooth";
}

interface CarouselDotsProps {
	count: number;
	activeIndex: number;
	labelPrefix: string;
	tone?: "default" | "light";
	onSelect: (index: number) => void;
}

export function CarouselDots({
	count,
	activeIndex,
	labelPrefix,
	tone = "default",
	onSelect,
}: CarouselDotsProps) {
	if (count <= 1) return null;
	const indices = Array.from({ length: count }, (_, idx) => idx);
	const isLightTone = tone === "light";

	return (
		<div className="flex items-center justify-center gap-0.5 pt-1">
			{indices.map((idx) => {
				const distance = Math.abs(idx - activeIndex);
				const isActive = distance === 0;
				const dotSizeClass = isActive
					? cn("size-3", isLightTone ? "bg-[#52d69f]" : "bg-primary")
					: distance === 1
						? cn(
								"size-2",
								isLightTone
									? "bg-white/50 group-hover:bg-white/80"
									: "bg-muted-foreground/50 group-hover:bg-foreground/70",
							)
						: cn(
								"size-1.5",
								isLightTone
									? "bg-white/30 group-hover:bg-white/65"
									: "bg-muted-foreground/30 group-hover:bg-foreground/60",
							);

				return (
					<button
						key={`${labelPrefix}-dot-${idx + 1}`}
						type="button"
						onClick={() => onSelect(idx)}
						aria-current={isActive ? "true" : undefined}
						aria-label={`${labelPrefix} ${idx + 1} dari ${count}`}
						className="group inline-flex h-11 min-w-[28px] items-center justify-center rounded-[6px] px-1 transition-colors"
					>
						<span
							aria-hidden="true"
							className={cn(
								"block rounded-full transition-all duration-200",
								dotSizeClass,
							)}
						/>
					</button>
				);
			})}
		</div>
	);
}
