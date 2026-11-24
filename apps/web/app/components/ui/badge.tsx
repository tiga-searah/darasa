import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1 text-xs font-medium leading-none transition-colors whitespace-nowrap",
	{
		variants: {
			variant: {
				default: "border-primary/25 bg-primary-soft text-primary-hover",
				yellow: "border-accent-yellow/50 bg-yellow-soft text-yellow-text",
				destructive: "border-secondary-red/30 bg-red-soft text-red-text",
				secondary: "border-border bg-background text-text-secondary",
				outline: "border-border bg-card text-foreground",
			},
		},
		defaultVariants: {
			variant: "secondary",
		},
	},
);

export interface BadgeProps
	extends React.ComponentProps<"span">,
		VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<span
			data-slot="badge"
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { badgeVariants };
