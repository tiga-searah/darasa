import type * as React from "react";
import { cn } from "~/lib/utils";

export function Textarea({
	className,
	...props
}: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex min-h-[88px] w-full rounded-[8px] border border-border bg-card px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-secondary-red",
				className,
			)}
			{...props}
		/>
	);
}
