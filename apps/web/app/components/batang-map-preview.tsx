import { ExternalLink } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

interface BatangMapPreviewProps {
	name: string;
	district: string;
	address: string;
	lat: number;
	lng: number;
}

export function BatangMapPreview({
	name,
	district,
	address,
	lat,
	lng,
}: BatangMapPreviewProps) {
	const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

	return (
		<Card className="overflow-hidden">
			<div className="h-64 w-full border-b border-border bg-background">
				<iframe
					title={`Peta Google Maps untuk ${name} di ${district}`}
					src={embedUrl}
					width={600}
					height={256}
					loading="lazy"
					referrerPolicy="no-referrer-when-downgrade"
					className="h-full w-full border-0"
				/>
			</div>

			<div className="p-4 flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0 flex-1 space-y-0.5">
					<p className="text-sm font-semibold text-foreground">{district}</p>
					<p className="text-xs text-muted-foreground">{address}</p>
					<p className="text-xs text-muted-foreground tabular-nums">
						Koordinat Google Maps: {lat.toFixed(4)}, {lng.toFixed(4)}
					</p>
				</div>
				<Button asChild variant="secondary" size="sm">
					<a href={mapsUrl} target="_blank" rel="noopener noreferrer">
						Buka di Google Maps
						<ExternalLink className="size-3.5" aria-hidden="true" />
					</a>
				</Button>
			</div>
		</Card>
	);
}
