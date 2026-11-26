import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type * as React from "react";
import { cn } from "~/lib/utils";

export function Select({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

export function SelectGroup({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

export function SelectValue({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

export function SelectTrigger({
	className,
	children,
	hideChevron = false,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
	hideChevron?: boolean;
}) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				"flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-card px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
				className,
			)}
			{...props}
		>
			{children}
			{hideChevron ? null : (
				<SelectPrimitive.Icon asChild>
					<ChevronDown
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
				</SelectPrimitive.Icon>
			)}
		</SelectPrimitive.Trigger>
	);
}

export function SelectContent({
	className,
	children,
	position = "popper",
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				position={position}
				className={cn(
					"relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-[10px] border border-border bg-popover text-popover-foreground shadow-lg",
					position === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
					className,
				)}
				{...props}
			>
				<SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-muted-foreground">
					<ChevronUp className="size-4" aria-hidden="true" />
				</SelectPrimitive.ScrollUpButton>
				<SelectPrimitive.Viewport
					className={cn(
						"p-1",
						position === "popper" &&
							"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-muted-foreground">
					<ChevronDown className="size-4" aria-hidden="true" />
				</SelectPrimitive.ScrollDownButton>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

export function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"relative flex min-h-[38px] w-full cursor-pointer items-center rounded-[6px] py-1.5 pl-8 pr-3 text-sm outline-none select-none data-[highlighted]:bg-secondary data-[highlighted]:text-secondary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				className,
			)}
			{...props}
		>
			<span className="absolute left-2.5 flex size-4 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<Check className="size-4 text-primary" aria-hidden="true" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}
