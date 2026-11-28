import type { MetaArgs } from "react-router";
import { MoreMenuGroups } from "~/components/shell/mobile-more-sheet";
import { useDarasa } from "~/context/darasa-store";

export function meta(_args: MetaArgs) {
	return [
		{ title: "Lainnya | Darasa" },
		{
			name: "description",
			content:
				"Menu navigasi tambahan, pengaturan tema tampilan terang/gelap, dan informasi Darasa.",
		},
	];
}

export default function MorePage() {
	const { currentUser, bookmarkedPlaceIds, claims, anomalies, places } =
		useDarasa();

	const pendingClaimCount = claims.filter((c) => c.status === "pending").length;
	const openAnomalyCount = anomalies.filter(
		(a) => a.resolution === "open",
	).length;
	const pendingPlaceCount = places.filter((p) => p.isPendingModeration).length;
	const adminAttentionCount =
		pendingClaimCount + openAnomalyCount + pendingPlaceCount;

	return (
		<div className="mx-auto max-w-xl space-y-5 rounded-[16px] border border-border bg-card p-5 sm:p-6">
			<header className="space-y-1 border-b border-border pb-4">
				<h1 className="text-xl font-bold tracking-tight text-foreground">
					Lainnya
				</h1>
				<p className="text-xs text-muted-foreground">
					Menu tambahan, pengaturan tampilan, dan informasi Darasa.
				</p>
			</header>

			<MoreMenuGroups
				currentUser={currentUser}
				bookmarkCount={bookmarkedPlaceIds.length}
				adminAttentionCount={adminAttentionCount}
			/>
		</div>
	);
}
