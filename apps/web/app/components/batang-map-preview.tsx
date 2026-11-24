import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

interface BatangMapPreviewProps {
	name: string;
	district: string;
	address: string;
	lat: number;
	lng: number;
}

const MIN_LAT = -7.08;
const MAX_LAT = -6.86;
const MIN_LNG = 109.7;
const MAX_LNG = 110.0;

function projectCoord(lat: number, lng: number) {
	const xPct = Math.min(
		92,
		Math.max(8, ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 100),
	);
	const yPct = Math.min(
		88,
		Math.max(12, ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * 100),
	);
	return { xPct, yPct };
}

export function BatangMapPreview({
	name,
	district,
	address,
	lat,
	lng,
}: BatangMapPreviewProps) {
	const { xPct, yPct } = projectCoord(lat, lng);
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

	return (
		<Card className="overflow-hidden">
			<div className="relative h-56 w-full bg-primary-soft/50 border-b border-border overflow-hidden">
				<svg
					viewBox="0 0 400 220"
					className="h-full w-full"
					role="img"
					aria-label={`Peta posisi koordinat ${name} di ${district}`}
				>
					<rect width="400" height="220" fill="#EFF5F1" />
					<path
						d="M0 0 H400 V34 Q300 44 200 32 Q100 22 0 38 Z"
						fill="#D5EAE0"
					/>
					<text x="16" y="22" fill="#116B48" fontSize="10" fontWeight="600">
						Pesisir Utara Batang &amp; Sigandu
					</text>
					<path
						d="M18 76 Q140 62 245 78 T386 92"
						stroke="#C8D6CD"
						strokeWidth="4"
						fill="none"
						strokeDasharray="6 4"
					/>
					<circle cx="72" cy="70" r="4" fill="#707873" />
					<text x="80" y="74" fill="#5A625D" fontSize="9">
						Batang Kota
					</text>
					<circle cx="332" cy="96" r="4" fill="#707873" />
					<text x="278" y="110" fill="#5A625D" fontSize="9">
						KITB Gringsing
					</text>
					<circle cx="152" cy="176" r="4" fill="#707873" />
					<text x="160" y="180" fill="#5A625D" fontSize="9">
						Bandar
					</text>
					<circle cx="294" cy="170" r="4" fill="#707873" />
					<text x="302" y="174" fill="#5A625D" fontSize="9">
						Limpung
					</text>
				</svg>

				<div
					style={{ left: `${xPct}%`, top: `${yPct}%` }}
					className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
				>
					<span className="rounded-[6px] bg-card px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border shadow-sm whitespace-nowrap mb-1">
						{name}
					</span>
					<span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-white">
						<MapPin className="size-4" aria-hidden="true" />
					</span>
				</div>
			</div>

			<div className="p-4 flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0 flex-1 space-y-0.5">
					<p className="text-sm font-semibold text-foreground">{district}</p>
					<p className="text-xs text-muted-foreground">{address}</p>
					<p className="text-xs text-muted-foreground tabular-nums">
						Koordinat: {lat.toFixed(4)}, {lng.toFixed(4)} (Pratinjau Peta
						Prototipe)
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
