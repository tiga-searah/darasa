import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-sm font-semibold transition-[background-color,border-color,transform,color] duration-150 select-none disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground border border-primary hover:bg-primary-hover hover:border-primary-hover active:translate-y-px",
				secondary:
					"bg-card text-primary border border-primary/65 hover:bg-secondary hover:border-primary active:translate-y-px",
				outline:
					"bg-card text-foreground border border-input hover:bg-muted active:translate-y-px",
				ghost:
					"bg-transparent text-foreground hover:bg-secondary hover:text-secondary-foreground",
				destructive:
					"bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive-hover hover:border-destructive-hover active:translate-y-px",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "min-h-[44px] px-4 py-2",
				sm: "min-h-[38px] rounded-[8px] px-3 text-xs",
				lg: "min-h-[48px] px-5 text-sm",
				icon: "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ComponentProps<"button">,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	loading?: boolean;
}

export function Button({
	className,
	variant,
	size,
	asChild = false,
	loading = false,
	disabled,
	type = "button",
	children,
	...props
}: ButtonProps) {
	const Comp = asChild ? Slot : "button";

	if (asChild) {
		return (
			<Comp
				data-slot="button"
				className={cn(buttonVariants({ variant, size, className }))}
				{...props}
			>
				{children}
			</Comp>
		);
	}

	return (
		<Comp
			data-slot="button"
			type={type}
			disabled={disabled || loading}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		>
			{loading ? (
				<span
					aria-hidden="true"
					className="inline-block size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
				/>
			) : null}
			{children}
		</Comp>
	);
}

export { buttonVariants };
