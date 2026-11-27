import { BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import type { VerificationStatus } from "~/lib/types";
import { cn } from "~/lib/utils";

interface VerificationBadgeProps {
	status: VerificationStatus;
	isPendingModeration?: boolean;
}

const VERIFICATION_META: Record<
	VerificationStatus | "pending",
	{
		label: string;
		icon?: typeof BadgeCheck;
		className: string;
	}
> = {
	pending: {
		label: "Menunggu Validasi",
		icon: Clock,
		className: "font-medium text-yellow-text",
	},
	owner_verified: {
		label: "Terverifikasi Pemilik",
		icon: ShieldCheck,
		className: "font-semibold text-primary",
	},
	community_verified: {
		label: "Terverifikasi Komunitas",
		icon: BadgeCheck,
		className: "font-medium text-primary",
	},
	unverified: {
		label: "Belum Terverifikasi",
		className: "font-medium text-muted-foreground",
	},
};

/** Displays place verification status as a plain inline icon + label without a box wrapper. */
export function VerificationBadge({
	status,
	isPendingModeration = false,
}: VerificationBadgeProps) {
	const meta = isPendingModeration
		? VERIFICATION_META.pending
		: (VERIFICATION_META[status] ?? VERIFICATION_META.unverified);
	const Icon = meta.icon;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 text-xs leading-none whitespace-nowrap",
				meta.className,
			)}
		>
			{Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
			<span>{meta.label}</span>
		</span>
	);
}
