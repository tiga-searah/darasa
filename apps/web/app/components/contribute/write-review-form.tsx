import {
	CheckCircle2,
	ImagePlus,
	MessageSquarePlus,
	Star,
	X,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useId, useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { RATING_LABELS, readImageFiles } from "~/data/contribute";
import { cn } from "~/lib/utils";
import { PlacePicker } from "./place-picker";

interface WriteReviewFormProps {
	places: PlaceWithMetrics[];
	selectedPlaceId: string;
	onSelectPlace: (placeId: string) => void;
	rating: number;
	onChangeRating: (rating: number) => void;
	suggestedPlaces: PlaceWithMetrics[];
	onSubmitReview: (input: {
		placeId: string;
		rating: number;
		comment: string;
		photoUrl?: string;
	}) => void;
	onRequestAddNewPlace: (prefillName: string) => void;
}

const IMPRESSION_TAGS = [
	"Porsi mengenyangkan",
	"Harga ramah di kantong",
	"Pelayanan ramah",
	"Bumbu terasa khas",
	"Tempat bersih & nyaman",
	"Parkir mudah",
];

export function WriteReviewForm({
	places,
	selectedPlaceId,
	onSelectPlace,
	rating,
	onChangeRating,
	suggestedPlaces,
	onSubmitReview,
	onRequestAddNewPlace,
}: WriteReviewFormProps) {
	const [hoverRating, setHoverRating] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [photoPreview, setPhotoPreview] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [successPlace, setSuccessPlace] = useState<{
		name: string;
		slug: string;
	} | null>(null);

	const commentId = useId();
	const photoId = useId();

	const selectedPlace =
		places.find((p) => p.id === selectedPlaceId) ?? places[0];

	const handleAddImpressionTag = (tag: string) => {
		setSuccessPlace(null);
		setComment((prev) => {
			const trimmed = prev.trim();
			if (trimmed.toLowerCase().includes(tag.toLowerCase())) return prev;
			return trimmed ? `${trimmed}, ${tag.toLowerCase()}` : `${tag}. `;
		});
	};

	const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		e.target.value = "";
		if (!files || files.length === 0) return;
		const { urls, error: fileErr } = await readImageFiles([files[0]]);
		if (fileErr) {
			setError(fileErr);
			return;
		}
		setError(null);
		if (urls[0]) setPhotoPreview(urls[0]);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!selectedPlace) {
			setError("Pilih tempat kuliner terlebih dahulu.");
			return;
		}
		if (comment.trim().length < 10) {
			setError("Tulis ulasan minimal 10 karakter agar informatif bagi warga.");
			return;
		}
		onSubmitReview({
			placeId: selectedPlace.id,
			rating,
			comment,
			photoUrl: photoPreview || undefined,
		});
		setError(null);
		setComment("");
		setPhotoPreview("");
		onChangeRating(5);
		setSuccessPlace({ name: selectedPlace.name, slug: selectedPlace.slug });
	};

	const displayedRating = hoverRating ?? rating;
	const commentLen = comment.trim().length;

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10"
		>
			<div className="lg:col-span-5 space-y-4">
				<PlacePicker
					places={places}
					selectedPlaceId={selectedPlace?.id ?? ""}
					onSelectPlace={(id) => {
						onSelectPlace(id);
						setSuccessPlace(null);
					}}
					label="Pilih tempat yang ingin diulas"
					suggestedPlaces={suggestedPlaces}
					suggestedLabel="Belum Anda ulas:"
					onRequestAddNewPlace={onRequestAddNewPlace}
					renderPlaceMeta={(p) => `${p.reviewCount} ulasan`}
					listClassName="lg:max-h-[420px]"
				/>
			</div>

			<div className="lg:col-span-7 space-y-6">
				<div className="space-y-1">
					<h2 className="text-lg font-bold text-foreground">
						Tulis Ulasan Pengunjung
					</h2>
					<p className="text-xs sm:text-sm text-muted-foreground">
						Ceritakan rasa hidangan, porsi, kisaran harga, dan suasana tempat
						yang Anda kunjungi.
					</p>
				</div>

				{successPlace ? (
					<div
						role="status"
						className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-hover"
					>
						<div className="flex items-center gap-2 font-medium">
							<CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
							<span>
								Ulasan untuk "{successPlace.name}" berhasil diterbitkan.
							</span>
						</div>
						<Link
							to={`/places/${successPlace.slug}`}
							className="text-xs font-semibold underline underline-offset-4"
						>
							Lihat di halaman tempat
						</Link>
					</div>
				) : null}

				{error ? (
					<div
						role="alert"
						className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-4 py-3 text-sm font-medium text-red-text"
					>
						{error}
					</div>
				) : null}

				<fieldset
					className="space-y-2 border-0 p-0 m-0"
					onMouseLeave={() => setHoverRating(null)}
				>
					<legend className="text-sm font-medium text-foreground">
						Beri rating keseluruhan
					</legend>
					<div className="flex flex-wrap items-center gap-2">
						<div className="flex items-center gap-1">
							{[1, 2, 3, 4, 5].map((star) => {
								const isFilled = star <= displayedRating;
								return (
									<button
										key={star}
										type="button"
										onMouseEnter={() => setHoverRating(star)}
										onClick={() => onChangeRating(star)}
										aria-label={`Beri ${star} bintang (${RATING_LABELS[star]})`}
										aria-pressed={rating === star}
										className="inline-flex size-11 items-center justify-center rounded-[8px] transition-transform duration-150 hover:scale-105 active:scale-95"
									>
										<Star
											className={cn(
												"size-8 transition-colors duration-150",
												isFilled
													? "fill-accent-yellow text-accent-yellow"
													: "text-border hover:text-accent-yellow/70",
											)}
											aria-hidden="true"
										/>
									</button>
								);
							})}
						</div>
						<span className="rounded-[6px] bg-yellow-soft px-2.5 py-1 text-xs font-semibold text-yellow-text tabular-nums">
							{displayedRating} / 5 · {RATING_LABELS[displayedRating]}
						</span>
					</div>
				</fieldset>

				<div className="space-y-2.5">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<Label htmlFor={commentId}>Detail pengalaman Anda</Label>
						<span
							className={cn(
								"text-xs tabular-nums",
								commentLen >= 10
									? "font-medium text-primary-hover"
									: "text-muted-foreground",
							)}
						>
							{commentLen} / 10 karakter min
						</span>
					</div>

					<div className="flex flex-wrap gap-1.5">
						{IMPRESSION_TAGS.map((tag) => (
							<button
								key={tag}
								type="button"
								onClick={() => handleAddImpressionTag(tag)}
								className="min-h-[44px] rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-hover"
							>
								+ {tag}
							</button>
						))}
					</div>

					<Textarea
						id={commentId}
						rows={4}
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						aria-invalid={Boolean(error && commentLen < 10)}
						placeholder="Ceritakan menu yang Anda pesan, rasa, porsi, dan jam kunjungan terbaik..."
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={photoId}>Foto pendukung ulasan (opsional)</Label>
					<label
						htmlFor={photoId}
						className="flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
					>
						<ImagePlus className="size-4 text-primary" aria-hidden="true" />
						<span>Lampirkan foto hidangan atau suasana</span>
					</label>
					<input
						id={photoId}
						type="file"
						accept="image/*"
						onChange={handlePhotoChange}
						className="sr-only"
					/>
					{photoPreview ? (
						<div className="relative inline-block">
							<img
								src={photoPreview}
								alt="Pratinjau foto ulasan"
								width={280}
								height={180}
								className="h-28 w-44 rounded-[8px] border border-border object-cover"
							/>
							<button
								type="button"
								onClick={() => setPhotoPreview("")}
								aria-label="Hapus pratinjau foto ulasan"
								className="absolute right-1.5 top-1.5 inline-flex size-11 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-xs hover:bg-background"
							>
								<X className="size-4" aria-hidden="true" />
							</button>
						</div>
					) : null}
				</div>

				<div className="flex justify-end pt-2">
					<Button type="submit" size="lg" disabled={!selectedPlace}>
						<MessageSquarePlus className="size-4" aria-hidden="true" />
						Terbitkan Ulasan
					</Button>
				</div>
			</div>
		</form>
	);
}
