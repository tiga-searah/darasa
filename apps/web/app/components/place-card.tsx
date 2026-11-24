import { Compass, Gem, MapPin, Star } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { VerificationBadge } from "~/components/verification-badge";
import type { PlaceWithMetrics } from "~/context/darasa-store";

interface PlaceCardProps {
	place: PlaceWithMetrics;
	mode?: "explore" | "hidden-gem";
	prioritizeImage?: boolean;
}

export function PlaceCard({
	place,
	mode = "explore",
	prioritizeImage = false,
}: PlaceCardProps) {
	return (
		<Card className="darasa-card-interactive flex flex-col overflow-hidden">
			<Link
				to={`/places/${place.slug}`}
				className="group relative block aspect-[16/10] w-full overflow-hidden bg-background"
			>
				<img
					src={place.photos[0] ?? "/images/megono-batang.svg"}
					alt={`Ilustrasi sajian ${place.name} di ${place.district}`}
					width={800}
					height={500}
					loading={prioritizeImage ? "eager" : "lazy"}
					fetchPriority={prioritizeImage ? "high" : "auto"}
					className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
				/>
				<div className="absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-2">
					<Badge variant="outline" className="bg-card/95 text-foreground">
						{place.category}
					</Badge>
					{mode === "hidden-gem" ? (
						<Badge variant="yellow" className="bg-yellow-soft/95">
							<Gem className="size-3.5" aria-hidden="true" />
							<span className="tabular-nums">
								Gem {place.hiddenGemScore.toFixed(2)}
							</span>
						</Badge>
					) : (
						<Badge variant="default" className="bg-primary-soft/95">
							<Compass className="size-3.5" aria-hidden="true" />
							<span className="tabular-nums">
								Skor {place.exploreScore.toFixed(2)}
							</span>
						</Badge>
					)}
				</div>
			</Link>

			<div className="flex flex-1 flex-col gap-3 p-5">
				<h2 className="text-[18px] font-semibold leading-snug text-foreground">
					<Link
						to={`/places/${place.slug}`}
						className="hover:text-primary focus-visible:text-primary"
					>
						{place.name}
					</Link>
				</h2>

				<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
					<span className="inline-flex items-center gap-1.5 font-medium text-foreground tabular-nums">
						<Star
							className="size-4 fill-accent-yellow text-yellow-text"
							aria-hidden="true"
						/>
						{place.reviewCount > 0 ? place.averageRating.toFixed(1) : "Baru"}
						<span className="font-normal text-muted-foreground">
							({place.reviewCount} ulasan)
						</span>
					</span>
					<span aria-hidden="true" className="text-border">
						/
					</span>
					<span className="inline-flex items-center gap-1 text-muted-foreground">
						<MapPin className="size-4 text-primary" aria-hidden="true" />
						{place.district}
					</span>
				</div>

				<p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
					{place.description}
				</p>

				<Separator className="mt-auto" />

				<div className="flex flex-wrap items-center justify-between gap-2">
					<VerificationBadge
						status={place.verificationStatus}
						isPendingModeration={place.isPendingModeration}
					/>
					<span className="text-xs font-medium text-muted-foreground tabular-nums">
						{place.priceRange}
					</span>
				</div>
			</div>
		</Card>
	);
}
