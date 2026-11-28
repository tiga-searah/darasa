import { Clock, ImagePlus, MapPin, Star } from "lucide-react";
import { VerificationBadge } from "~/components/verification-badge";
import { cn } from "~/lib/utils";
import {
	type AddPlaceDraft,
	parseOpeningHoursValue,
	parsePriceRangeValue,
} from "./add-place-validation";

interface AddPlaceLivePreviewProps {
	draft: AddPlaceDraft;
}

function formatPreviewHours(raw: string): string {
	const parsed = parseOpeningHoursValue(raw);
	if (parsed.formatted) return parsed.formatted;
	const trimmed = raw.trim();
	return trimmed ? `${trimmed} WIB` : "";
}

function formatPreviewPrice(raw: string): string {
	const parsed = parsePriceRangeValue(raw);
	if (parsed.formatted) return parsed.formatted;
	const trimmed = raw.trim();
	return trimmed ? `Rp ${trimmed}` : "";
}

export function AddPlaceLivePreview({ draft }: AddPlaceLivePreviewProps) {
	const displayName = draft.name.trim();
	const displayAddress = draft.address.trim();
	const displayHours = formatPreviewHours(draft.openingHours);
	const displayPrice = formatPreviewPrice(draft.priceRange);
	const displayDescription = draft.description.trim();

	return (
		<section
			aria-labelledby="add-place-live-preview-heading"
			className="space-y-4"
		>
			<h2
				id="add-place-live-preview-heading"
				className="text-base font-bold text-foreground"
			>
				Pratinjau Kartu Kuliner
			</h2>

			<article className="space-y-3">
				<div className="relative aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-muted">
					{draft.photoPreview ? (
						<img
							src={draft.photoPreview}
							alt={
								displayName
									? `Pratinjau foto ${displayName}`
									: "Pratinjau foto tempat kuliner"
							}
							width={640}
							height={400}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center text-muted-foreground">
							<ImagePlus
								className="size-6 text-primary/70"
								aria-hidden="true"
							/>
							<span className="text-xs font-medium">
								Foto tempat wajib diunggah
							</span>
						</div>
					)}
				</div>

				<div className="space-y-2">
					<div className="space-y-1">
						<h3
							className={cn(
								"text-[17px] font-semibold leading-snug line-clamp-2",
								displayName
									? "text-foreground"
									: "text-muted-foreground italic",
							)}
						>
							{displayName || "Nama tempat kuliner belum diisi"}
						</h3>
						<p className="text-xs font-medium text-muted-foreground">
							{draft.category}
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
							<Star
								className="size-3.5 fill-accent-yellow text-accent-yellow"
								aria-hidden="true"
							/>
							Baru (0)
						</span>
						<span aria-hidden="true" className="text-border">
							·
						</span>
						<span className="inline-flex items-center gap-1">
							<MapPin className="size-3.5 text-primary" aria-hidden="true" />
							{draft.district}
						</span>
						<span aria-hidden="true" className="text-border">
							·
						</span>
						<span className="inline-flex items-center gap-1">
							<Clock className="size-3.5 text-primary" aria-hidden="true" />
							<span className={displayHours ? "text-foreground" : "italic"}>
								{displayHours || "Jam buka belum diisi"}
							</span>
						</span>
					</div>

					<p
						className={cn(
							"text-xs",
							displayAddress
								? "text-foreground/85"
								: "text-muted-foreground italic",
						)}
					>
						{displayAddress || "Alamat atau patokan lokasi belum diisi"}
					</p>

					<p
						className={cn(
							"line-clamp-2 text-xs leading-relaxed",
							displayDescription
								? "text-muted-foreground"
								: "text-muted-foreground/80 italic",
						)}
					>
						{displayDescription ||
							"Deskripsi singkat menu andalan dan suasana akan tampil di sini."}
					</p>

					<div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
						<VerificationBadge status="unverified" isPendingModeration />
						<span
							className={cn(
								"font-medium tabular-nums",
								displayPrice
									? "text-foreground"
									: "text-muted-foreground italic",
							)}
						>
							{displayPrice || "Harga belum diisi"}
						</span>
					</div>
				</div>
			</article>
		</section>
	);
}
