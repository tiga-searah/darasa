import type * as React from "react";
import { cn } from "~/lib/utils";

export function Input({
	className,
	type,
	...props
}: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex min-h-[44px] w-full rounded-[8px] border border-border bg-card px-3.5 py-2 text-sm text-foreground transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-secondary-red",
				className,
			)}
			{...props}
		/>
	);
}
