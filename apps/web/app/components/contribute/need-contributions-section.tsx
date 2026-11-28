import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import type { PlaceWithMetrics } from "~/context/darasa-store";

export interface MissingInfoSuggestion {
	place: PlaceWithMetrics;
	to: string;
	reason: string;
	ctaLabel: string;
}

interface NeedContributionsSectionProps {
	unreviewedPlaces: PlaceWithMetrics[];
	missingInfoPlaces: MissingInfoSuggestion[];
}

export function NeedContributionsSection({
	unreviewedPlaces,
	missingInfoPlaces,
}: NeedContributionsSectionProps) {
	return (
		<section
			aria-labelledby="need-contributions-heading"
			className="lg:col-span-7 space-y-4"
		>
			<div className="space-y-1">
				<h2
					id="need-contributions-heading"
					className="text-base font-bold text-foreground"
				>
					Butuh Kontribusi Warga
				</h2>
				<p className="text-xs text-muted-foreground">
					Tempat kuliner di Batang yang belum Anda ulas atau masih perlu foto
					dan informasi tambahan.
				</p>
			</div>

			{unreviewedPlaces.length === 0 && missingInfoPlaces.length === 0 ? (
				<div className="py-2 space-y-3">
					<p className="text-sm text-muted-foreground">
						Semua tempat yang terdaftar sudah Anda ulas dan memiliki informasi
						dasar lengkap.
					</p>
					<Button asChild variant="outline">
						<Link to="/contribute/add-place">Tambah Tempat Baru</Link>
					</Button>
				</div>
			) : (
				<ul className="divide-y divide-border">
					{unreviewedPlaces.map((place) => (
						<li
							key={`review-${place.id}`}
							className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex min-w-0 items-center gap-3">
								<img
									src={place.photos[0] ?? "/images/megono-batang.svg"}
									alt=""
									width={48}
									height={48}
									className="size-12 shrink-0 rounded-[8px] border border-border object-cover bg-muted"
								/>
								<div className="min-w-0 space-y-0.5">
									<p className="truncate text-sm font-semibold text-foreground">
										{place.name}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										{place.district} · Belum Anda ulas
									</p>
								</div>
							</div>
							<Button
								asChild
								variant="outline"
								className="shrink-0 self-start sm:self-center"
							>
								<Link to={`/contribute/write-review?placeId=${place.id}`}>
									Tulis Ulasan
								</Link>
							</Button>
						</li>
					))}

					{missingInfoPlaces.map((item) => (
						<li
							key={`info-${item.place.id}`}
							className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex min-w-0 items-center gap-3">
								<img
									src={item.place.photos[0] ?? "/images/megono-batang.svg"}
									alt=""
									width={48}
									height={48}
									className="size-12 shrink-0 rounded-[8px] border border-border object-cover bg-muted"
								/>
								<div className="min-w-0 space-y-0.5">
									<p className="truncate text-sm font-semibold text-foreground">
										{item.place.name}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										{item.reason}
									</p>
								</div>
							</div>
							<Button
								asChild
								variant="outline"
								className="shrink-0 self-start sm:self-center"
							>
								<Link to={item.to}>{item.ctaLabel}</Link>
							</Button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
