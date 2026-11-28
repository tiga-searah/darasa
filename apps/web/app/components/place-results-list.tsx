import type { RefObject } from "react";
import { PlaceCard } from "~/components/place-card";
import type { ExploreViewMode, PlaceWithMetrics } from "~/context/darasa-store";
import { DEFAULT_PLACES_PAGE_SIZE } from "~/lib/pagination";
import { cn } from "~/lib/utils";

interface PlaceResultsListProps {
	places: PlaceWithMetrics[];
	mode: "explore" | "hidden-gem";
	viewMode: ExploreViewMode;
	containerRef?: RefObject<HTMLDivElement | null>;
	isInitialLoading?: boolean;
	skeletonCount?: number;
	withTopBorder?: boolean;
}

function PlaceCardSkeleton({ layout }: { layout: "grid" | "list" }) {
	if (layout === "list") {
		return (
			<div
				aria-hidden="true"
				className="flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-start"
			>
				<div className="aspect-[16/10] w-full shrink-0 animate-pulse rounded-[12px] bg-muted sm:w-48" />
				<div className="flex min-w-0 flex-1 flex-col gap-2.5">
					<div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
					<div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
					<div className="h-4 w-full animate-pulse rounded bg-muted" />
					<div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
				</div>
			</div>
		);
	}

	return (
		<div aria-hidden="true" className="flex h-full flex-col">
			<div className="aspect-[16/10] w-full animate-pulse rounded-[12px] bg-muted" />
			<div className="flex flex-1 flex-col gap-2.5 pt-3">
				<div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
				<div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
				<div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
				<div className="h-4 w-full animate-pulse rounded bg-muted" />
			</div>
		</div>
	);
}

export function PlaceResultsList({
	places,
	mode,
	viewMode,
	containerRef,
	isInitialLoading = false,
	skeletonCount = DEFAULT_PLACES_PAGE_SIZE,
	withTopBorder = true,
}: PlaceResultsListProps) {
	if (isInitialLoading && places.length === 0) {
		const skeletonKeys = Array.from(
			{ length: skeletonCount },
			(_, idx) => `skeleton-${viewMode}-${idx}`,
		);

		if (viewMode === "list") {
			return (
				<div
					role="status"
					aria-busy="true"
					aria-label="Memuat daftar tempat kuliner"
					className={cn(
						"divide-y divide-border",
						withTopBorder && "border-t border-border",
					)}
				>
					{skeletonKeys.map((key) => (
						<PlaceCardSkeleton key={key} layout="list" />
					))}
				</div>
			);
		}

		return (
			<div
				role="status"
				aria-busy="true"
				aria-label="Memuat daftar tempat kuliner"
				className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
			>
				{skeletonKeys.map((key) => (
					<PlaceCardSkeleton key={key} layout="grid" />
				))}
			</div>
		);
	}

	if (viewMode === "list") {
		return (
			<div
				ref={containerRef}
				className={cn(
					"divide-y divide-border",
					withTopBorder && "border-t border-border",
				)}
			>
				{places.map((place, index) => (
					<PlaceCard
						key={place.id}
						place={place}
						mode={mode}
						layout="list"
						prioritizeImage={index < 3}
					/>
				))}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
		>
			{places.map((place, index) => (
				<PlaceCard
					key={place.id}
					place={place}
					mode={mode}
					layout="grid"
					prioritizeImage={index < 3}
				/>
			))}
		</div>
	);
}
