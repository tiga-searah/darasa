import { Bookmark, Clock, Compass, Eye, Gem, MapPin, Star } from "lucide-react";
import { Link } from "react-router";
import { VerificationBadge } from "~/components/verification-badge";
import { type PlaceWithMetrics, useDarasa } from "~/context/darasa-store";
import { cn } from "~/lib/utils";

interface PlaceCardProps {
	place: PlaceWithMetrics;
	mode?: "explore" | "hidden-gem";
	layout?: "grid" | "list";
	prioritizeImage?: boolean;
}

/** Shared icon-only bookmark toggle without wrapper box (hover affects icon only). */
export function BookmarkIconButton({
	placeName,
	saved,
	onToggle,
}: {
	placeName: string;
	saved: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={saved}
			aria-label={
				saved
					? `Hapus ${placeName} dari bookmark`
					: `Simpan ${placeName} ke bookmark`
			}
			title={saved ? "Hapus dari Bookmark" : "Simpan ke Bookmark"}
			className="group/bookmark relative z-10 inline-flex shrink-0 items-center justify-center bg-transparent p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			<Bookmark
				className={cn(
					"size-5 transition-[color,transform,fill] duration-150 group-hover/bookmark:scale-110",
					saved
						? "fill-primary text-primary group-hover/bookmark:fill-primary-hover group-hover/bookmark:text-primary-hover"
						: "text-muted-foreground group-hover/bookmark:text-primary",
				)}
				aria-hidden="true"
			/>
		</button>
	);
}

interface PlaceScoreBadgeProps {
	mode: "explore" | "hidden-gem";
	score: number;
	surface?: "overlay" | "inline";
}

/** Displays a place's ranking metric as a clean photo-corner tag or inline readout. */
export function PlaceScoreBadge({
	mode,
	score,
	surface = "overlay",
}: PlaceScoreBadgeProps) {
	const isHiddenGem = mode === "hidden-gem";
	const label = isHiddenGem ? "Skor Hidden Gem" : "Skor Explore";
	const Icon = isHiddenGem ? Gem : Compass;
	const iconColor = isHiddenGem
		? "fill-[#f7c95c] text-yellow-text dark:fill-[#f7c95c]/30"
		: "text-primary";

	if (surface === "inline") {
		return (
			<span
				title={label}
				className={cn(
					"inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums",
					isHiddenGem ? "text-yellow-text" : "text-primary",
				)}
			>
				<Icon className={cn("size-3.5", iconColor)} aria-hidden="true" />
				<span className="sr-only">{label} </span>
				<span>{score.toFixed(2)}</span>
			</span>
		);
	}

	return (
		<span
			title={label}
			className="inline-flex items-center gap-1 rounded-[6px] bg-card/95 px-2 py-1 text-xs font-semibold leading-none text-foreground shadow-sm tabular-nums"
		>
			<Icon className={cn("size-3.5", iconColor)} aria-hidden="true" />
			<span className="sr-only">{label} </span>
			<span>{score.toFixed(2)}</span>
		</span>
	);
}

export function PlaceCard({
	place,
	mode = "explore",
	layout = "grid",
	prioritizeImage = false,
}: PlaceCardProps) {
	const { isBookmarked, toggleBookmark } = useDarasa();
	const saved = isBookmarked(place.id);
	const scoreValue =
		mode === "hidden-gem" ? place.hiddenGemScore : place.exploreScore;

	const bookmarkButton = (
		<BookmarkIconButton
			placeName={place.name}
			saved={saved}
			onToggle={() => toggleBookmark(place.id)}
		/>
	);

	if (layout === "list") {
		return (
			<article className="group relative flex flex-col gap-4 rounded-[12px] px-2 py-4 transition-colors duration-150 hover:bg-muted/55 sm:flex-row sm:items-start">
				<div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-[12px] bg-muted sm:w-48">
					<img
						src={place.photos[0] ?? "/images/megono-batang.svg"}
						alt={`Ilustrasi sajian ${place.name} di ${place.district}`}
						width={400}
						height={250}
						loading={prioritizeImage ? "eager" : "lazy"}
						fetchPriority={prioritizeImage ? "high" : "auto"}
						className="h-full w-full object-cover"
					/>
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex items-start justify-between gap-2">
						<h2 className="min-w-0 flex-1 text-base sm:text-[18px] font-semibold leading-snug text-foreground">
							<Link
								to={`/places/${place.slug}`}
								className="after:absolute after:inset-0 after:rounded-[12px] focus-visible:outline-none"
							>
								{place.name}
							</Link>
						</h2>
						<div className="flex shrink-0 items-center gap-2">
							<PlaceScoreBadge
								mode={mode}
								score={scoreValue}
								surface="inline"
							/>
							{bookmarkButton}
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
						<span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
							<Star
								className="size-4 fill-accent-yellow text-accent-yellow"
								aria-hidden="true"
							/>
							{place.reviewCount > 0 ? place.averageRating.toFixed(1) : "Baru"}
							<span className="font-normal text-muted-foreground">
								({place.reviewCount})
							</span>
						</span>
						<span aria-hidden="true" className="text-border">
							·
						</span>
						<span>{place.category}</span>
						<span aria-hidden="true" className="text-border">
							·
						</span>
						<span className="inline-flex items-center gap-1 text-muted-foreground">
							<MapPin className="size-3.5 text-primary" aria-hidden="true" />
							{place.district}
						</span>
						<span aria-hidden="true" className="text-border">
							·
						</span>
						<span className="text-xs font-medium text-foreground tabular-nums">
							{place.priceRange}
						</span>
						<span aria-hidden="true" className="text-border">
							·
						</span>
						<span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
							<Eye className="size-3.5 text-primary" aria-hidden="true" />
							{place.views.toLocaleString("id-ID")}
						</span>
					</div>

					<p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
						{place.description}
					</p>

					<div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-muted-foreground">
						<VerificationBadge
							status={place.verificationStatus}
							isPendingModeration={place.isPendingModeration}
						/>
						<span className="inline-flex items-center gap-1">
							<Clock
								className="size-3.5 shrink-0 text-primary"
								aria-hidden="true"
							/>
							<span>{place.openingHours}</span>
						</span>
					</div>
				</div>
			</article>
		);
	}

	return (
		<article className="group relative flex h-full flex-col rounded-[14px] p-2.5 -m-2.5 transition-colors duration-150 hover:bg-muted/55">
			<div className="relative aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-muted">
				<img
					src={place.photos[0] ?? "/images/megono-batang.svg"}
					alt={`Ilustrasi sajian ${place.name} di ${place.district}`}
					width={800}
					height={500}
					loading={prioritizeImage ? "eager" : "lazy"}
					fetchPriority={prioritizeImage ? "high" : "auto"}
					className="h-full w-full object-cover"
				/>
				<div className="absolute right-2.5 top-2.5">
					<PlaceScoreBadge mode={mode} score={scoreValue} />
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-2 pt-3">
				<div className="space-y-1">
					<div className="flex items-start justify-between gap-2">
						<h2 className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-foreground line-clamp-2">
							<Link
								to={`/places/${place.slug}`}
								className="after:absolute after:inset-0 after:rounded-[14px] focus-visible:outline-none"
							>
								{place.name}
							</Link>
						</h2>
						{bookmarkButton}
					</div>

					<p className="truncate text-xs font-medium text-muted-foreground">
						{place.category}
					</p>

					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
						<span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
							<Star
								className="size-3.5 fill-accent-yellow text-accent-yellow"
								aria-hidden="true"
							/>
							{place.reviewCount > 0 ? place.averageRating.toFixed(1) : "Baru"}
							<span className="font-normal text-muted-foreground">
								({place.reviewCount})
							</span>
						</span>
						<span aria-hidden="true" className="text-border">
							·
						</span>
						<span className="inline-flex items-center gap-1 text-muted-foreground">
							<MapPin className="size-3.5 text-primary" aria-hidden="true" />
							{place.district}
						</span>
						<span aria-hidden="true" className="text-border">
							·
						</span>
						<span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
							<Eye className="size-3.5 text-primary" aria-hidden="true" />
							{place.views.toLocaleString("id-ID")}
						</span>
					</div>
				</div>

				<p className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
					{place.description}
				</p>

				<div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1.5 text-xs">
					<VerificationBadge
						status={place.verificationStatus}
						isPendingModeration={place.isPendingModeration}
					/>
					<span className="font-medium text-foreground tabular-nums">
						{place.priceRange}
					</span>
				</div>
			</div>
		</article>
	);
}
