import {
	Clock,
	ImagePlus,
	MapPin,
	MapPinPlus,
	Star,
	Store,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
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
			<div className="space-y-0.5">
				<h2
					id="add-place-live-preview-heading"
					className="text-base font-bold text-foreground"
				>
					Pratinjau Kartu Kuliner
				</h2>
				<p className="text-xs text-muted-foreground">
					Tampilan langsung tempat kuliner Anda di direktori Darasa.
				</p>
			</div>

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

interface AddPlacePreviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	draft: AddPlaceDraft;
	parsedLat: number;
	parsedLng: number;
	onConfirmSubmit: () => void;
}

export function AddPlacePreviewDialog({
	open,
	onOpenChange,
	draft,
	parsedLat,
	parsedLng,
	onConfirmSubmit,
}: AddPlacePreviewDialogProps) {
	const coordText =
		Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
			? `${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)}`
			: `${draft.lat}, ${draft.lng}`;
	const formattedHours = parseOpeningHoursValue(draft.openingHours).formatted;
	const formattedPrice = parsePriceRangeValue(draft.priceRange).formatted;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[min(94dvw,640px)]">
				<DialogHeader>
					<DialogTitle>Pratinjau Tempat Kuliner</DialogTitle>
					<DialogDescription>
						Periksa seluruh data sebelum dikirim ke direktori Darasa dan antrean
						validasi komunitas.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{draft.photoPreview ? (
						<div className="overflow-hidden rounded-[12px] bg-muted">
							<img
								src={draft.photoPreview}
								alt={`Foto ${draft.name.trim()}`}
								width={640}
								height={400}
								className="aspect-[16/10] w-full object-cover"
							/>
						</div>
					) : null}

					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">{draft.category}</Badge>
							<VerificationBadge status="unverified" isPendingModeration />
						</div>
						<h3 className="text-xl font-bold leading-snug text-foreground">
							{draft.name.trim()}
						</h3>
						<p className="text-sm leading-relaxed text-muted-foreground">
							{draft.description.trim()}
						</p>
					</div>

					<dl className="grid grid-cols-1 gap-3 pt-1 text-sm sm:grid-cols-2">
						<div className="flex items-start gap-2.5 sm:col-span-2">
							<MapPin
								className="mt-0.5 size-4 shrink-0 text-primary"
								aria-hidden="true"
							/>
							<div className="min-w-0">
								<dt className="text-xs font-medium text-muted-foreground">
									Alamat &amp; Lokasi Peta
								</dt>
								<dd className="font-medium text-foreground">
									{draft.address.trim()}
								</dd>
								<dd className="text-xs text-muted-foreground tabular-nums">
									{draft.district}, Kabupaten Batang · Koordinat {coordText}
								</dd>
							</div>
						</div>

						<div className="flex items-start gap-2.5">
							<Clock
								className="mt-0.5 size-4 shrink-0 text-primary"
								aria-hidden="true"
							/>
							<div>
								<dt className="text-xs font-medium text-muted-foreground">
									Jam Operasional
								</dt>
								<dd className="font-medium text-foreground">
									{formattedHours}
								</dd>
							</div>
						</div>

						<div className="flex items-start gap-2.5">
							<Store
								className="mt-0.5 size-4 shrink-0 text-primary"
								aria-hidden="true"
							/>
							<div>
								<dt className="text-xs font-medium text-muted-foreground">
									Kisaran Harga
								</dt>
								<dd className="font-medium text-foreground tabular-nums">
									{formattedPrice}
								</dd>
							</div>
						</div>
					</dl>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Ubah Data
					</Button>
					<Button type="button" onClick={onConfirmSubmit}>
						<MapPinPlus className="size-4" aria-hidden="true" />
						Kirim Tempat Kuliner
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
