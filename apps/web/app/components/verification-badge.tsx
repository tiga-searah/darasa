import { BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import type { VerificationStatus } from "~/lib/types";

interface VerificationBadgeProps {
	status: VerificationStatus;
	isPendingModeration?: boolean;
}

export function VerificationBadge({
	status,
	isPendingModeration = false,
}: VerificationBadgeProps) {
	if (isPendingModeration) {
		return (
			<Badge variant="yellow">
				<Clock className="size-3.5" aria-hidden="true" />
				<span>Menunggu Validasi</span>
			</Badge>
		);
	}

	switch (status) {
		case "owner_verified":
			return (
				<Badge variant="default">
					<ShieldCheck className="size-3.5" aria-hidden="true" />
					<span>Terverifikasi Pemilik</span>
				</Badge>
			);
		case "community_verified":
			return (
				<Badge variant="default">
					<BadgeCheck className="size-3.5" aria-hidden="true" />
					<span>Terverifikasi Komunitas</span>
				</Badge>
			);
		default:
			return (
				<Badge variant="secondary">
					<span>Belum Terverifikasi</span>
				</Badge>
			);
	}
}
