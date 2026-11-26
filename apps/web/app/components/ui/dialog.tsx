import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "~/lib/utils";

export function Dialog({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export function DialogTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"fixed inset-0 z-50 bg-surface-dark/50 backdrop-blur-[2px]",
				className,
			)}
			{...props}
		/>
	);
}

export function DialogContent({
	className,
	children,
	bare = false,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	bare?: boolean;
}) {
	return (
		<DialogPrimitive.Portal>
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					bare
						? "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none"
						: "fixed top-1/2 left-1/2 z-50 grid w-[min(92dvw,560px)] max-h-[90dvb] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto overscroll-contain rounded-[16px] border border-border bg-card p-6 text-card-foreground shadow-xl",
					className,
				)}
				{...props}
			>
				{children}
				{!bare ? (
					<DialogPrimitive.Close
						aria-label="Tutup dialog"
						className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-[8px] border border-border bg-card text-muted-foreground hover:bg-background hover:text-foreground"
					>
						<X className="size-5" aria-hidden="true" />
					</DialogPrimitive.Close>
				) : null}
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

export function DialogHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn(
				"flex flex-col gap-1.5 border-b border-border pr-12 pb-4",
				className,
			)}
			{...props}
		/>
	);
}

export function DialogFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("flex flex-wrap justify-end gap-2.5 pt-2", className)}
			{...props}
		/>
	);
}

export function DialogTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("text-lg font-semibold text-foreground", className)}
			{...props}
		/>
	);
}

export function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}
