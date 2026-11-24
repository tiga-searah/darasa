import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "~/lib/utils";

export function Sidebar({
	className,
	ref,
	...props
}: React.ComponentProps<"aside">) {
	return (
		<aside
			ref={ref}
			data-slot="sidebar"
			className={cn(
				"bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
				className,
			)}
			{...props}
		/>
	);
}

export function SidebarHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-header"
			className={cn("flex flex-col gap-2 p-4", className)}
			{...props}
		/>
	);
}

export function SidebarContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-content"
			className={cn(
				"flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2",
				className,
			)}
			{...props}
		/>
	);
}

export function SidebarFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-footer"
			className={cn("border-t border-sidebar-border p-4", className)}
			{...props}
		/>
	);
}

export function SidebarGroup({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group"
			className={cn("flex flex-col gap-1", className)}
			{...props}
		/>
	);
}

export function SidebarGroupTrigger({
	open,
	collapsed = false,
	className,
	children,
	...props
}: React.ComponentProps<"button"> & {
	open: boolean;
	collapsed?: boolean;
}) {
	if (collapsed) {
		return <span className="sr-only">{children}</span>;
	}

	return (
		<button
			type="button"
			data-slot="sidebar-group-trigger"
			aria-expanded={open}
			className={cn(
				"flex min-h-[38px] w-full items-center justify-between rounded-[8px] px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
				className,
			)}
			{...props}
		>
			<span>{children}</span>
			<ChevronDown
				className={cn(
					"size-4 shrink-0 transition-transform duration-200",
					open ? "rotate-180 text-primary" : "rotate-0",
				)}
				aria-hidden="true"
			/>
		</button>
	);
}

export function SidebarMenu({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu"
			className={cn("flex flex-col gap-1", className)}
			{...props}
		/>
	);
}

export function SidebarMenuItem({
	className,
	...props
}: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="sidebar-menu-item"
			className={cn("relative", className)}
			{...props}
		/>
	);
}
