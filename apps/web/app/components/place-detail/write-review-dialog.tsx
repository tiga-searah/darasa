import { ImagePlus, Star } from "lucide-react";
import { type ChangeEvent, type FormEvent, useId, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

const RATING_TEXT_LABELS = [
	"Kurang Memuaskan",
	"Cukup",
	"Enak",
	"Direkomendasikan",
	"Sangat Memuaskan",
] as const;

interface WriteReviewDialogProps {
	open: boolean;
	placeName: string;
	onOpenChange: (open: boolean) => void;
	onSubmitReview: (input: {
		rating: number;
		comment: string;
		photoUrl?: string;
	}) => void;
}

export function WriteReviewDialog({
	open,
	placeName,
	onOpenChange,
	onSubmitReview,
}: WriteReviewDialogProps) {
	const [rating, setRating] = useState(5);
	const [hoverRating, setHoverRating] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [photoPreview, setPhotoPreview] = useState("");
	const [formError, setFormError] = useState<string | null>(null);

	const commentId = useId();
	const photoInputId = useId();
	const errorId = useId();

	const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			setPhotoPreview("");
			return;
		}
		if (!file.type.startsWith("image/")) {
			setFormError("File harus berupa gambar (JPG, PNG, WebP).");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				setPhotoPreview(reader.result);
			}
		};
		reader.readAsDataURL(file);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (comment.trim().length < 10) {
			setFormError(
				"Tulis ulasan minimal 10 karakter agar bermanfaat bagi pengunjung lain.",
			);
			return;
		}
		onSubmitReview({
			rating,
			comment,
			photoUrl: photoPreview || undefined,
		});
		setFormError(null);
		setComment("");
		setPhotoPreview("");
		setRating(5);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Ulas {placeName}</DialogTitle>
					<DialogDescription>
						Penilaian Anda terhubung ke akun untuk menjaga kualitas kurasi dan
						analisis anomali.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} noValidate className="space-y-4">
					{formError ? (
						<div
							id={errorId}
							role="alert"
							className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-3.5 py-2.5 text-sm font-medium text-red-text"
						>
							{formError}
						</div>
					) : null}

					<fieldset
						className="space-y-2"
						onMouseLeave={() => setHoverRating(null)}
					>
						<legend className="text-sm font-semibold text-foreground">
							Berikan Rating Bintang
						</legend>
						<div className="flex flex-wrap items-center gap-1.5">
							{[1, 2, 3, 4, 5].map((value) => {
								const activeLimit = hoverRating ?? rating;
								const isFilled = value <= activeLimit;
								return (
									<label
										key={value}
										onMouseEnter={() => setHoverRating(value)}
										className="relative inline-flex size-11 items-center justify-center rounded-[8px] transition-transform duration-150 hover:scale-110 active:scale-95 focus-within:outline-2 focus-within:outline-ring"
									>
										<input
											type="radio"
											name="rating"
											value={value}
											checked={rating === value}
											onChange={() => setRating(value)}
											aria-label={`${value} bintang`}
											className="sr-only"
										/>
										<Star
											className={`size-8 transition-colors duration-150 ${
												isFilled
													? "fill-accent-yellow text-accent-yellow"
													: "text-border hover:text-accent-yellow/70"
											}`}
											aria-hidden="true"
										/>
									</label>
								);
							})}
							<span className="ml-2 text-sm font-medium text-muted-foreground">
								{RATING_TEXT_LABELS[(hoverRating ?? rating) - 1]}
							</span>
						</div>
					</fieldset>

					<div className="space-y-1.5">
						<Label htmlFor={commentId}>Ulasan tertulis</Label>
						<Textarea
							id={commentId}
							rows={4}
							required
							value={comment}
							onChange={(e) => {
								setComment(e.target.value);
								if (formError) setFormError(null);
							}}
							aria-invalid={Boolean(formError)}
							aria-describedby={formError ? errorId : undefined}
							placeholder="Ceritakan rasa makanan, harga, porsi, atau suasana warung..."
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={photoInputId}>
							Unggah foto makanan atau tempat (opsional)
						</Label>
						<label
							htmlFor={photoInputId}
							className="flex min-h-[44px] items-center gap-2 rounded-[8px] border border-dashed border-border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground hover:border-primary"
						>
							<ImagePlus className="size-4 text-primary" aria-hidden="true" />
							<span>Pilih file gambar dari perangkat Anda</span>
						</label>
						<input
							id={photoInputId}
							type="file"
							accept="image/*"
							onChange={handlePhotoChange}
							className="visually-hidden"
						/>
						{photoPreview ? (
							<img
								src={photoPreview}
								alt="Pratinjau foto ulasan"
								width={240}
								height={140}
								className="mt-2 h-28 w-44 rounded-[8px] border border-border object-cover"
							/>
						) : null}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Batal
						</Button>
						<Button type="submit">Kirim Ulasan</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
