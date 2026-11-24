import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "~/lib/utils";

export function Sheet({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

export function SheetTrigger({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

export function SheetContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
	return (
		<SheetPrimitive.Portal>
			<SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-surface-dark/50 backdrop-blur-[2px]" />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					"fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(296px,84dvw)] flex-col border-r border-border bg-sidebar text-sidebar-foreground shadow-xl",
					className,
				)}
				{...props}
			>
				{children}
				<SheetPrimitive.Close
					aria-label="Tutup menu"
					className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-[8px] border border-border bg-card text-foreground hover:bg-background"
				>
					<X className="size-5" aria-hidden="true" />
				</SheetPrimitive.Close>
			</SheetPrimitive.Content>
		</SheetPrimitive.Portal>
	);
}

export function SheetHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn(
				"flex flex-col gap-1 border-b border-border p-4 pr-14",
				className,
			)}
			{...props}
		/>
	);
}

export function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("text-base font-bold text-foreground", className)}
			{...props}
		/>
	);
}

export function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
}
