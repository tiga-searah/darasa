import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "~/components/ui/dialog";

interface PlacePhotoGalleryProps {
	placeId: string;
	placeName: string;
	photos: string[];
}

export function PlacePhotoGallery({
	placeId,
	placeName,
	photos,
}: PlacePhotoGalleryProps) {
	const [activePhotoIndex, setActivePhotoIndex] = useState(0);
	const [lightboxOpen, setLightboxOpen] = useState(false);

	useEffect(() => {
		const _id = placeId;
		if (_id) setActivePhotoIndex(0);
	}, [placeId]);

	const uniquePhotos = Array.from(
		new Set(photos.length > 0 ? photos : ["/images/megono-batang.svg"]),
	);
	const safePhotoIndex = Math.min(
		activePhotoIndex,
		Math.max(0, uniquePhotos.length - 1),
	);
	const activePhoto = uniquePhotos[safePhotoIndex] ?? uniquePhotos[0];
	const hasMultiplePhotos = uniquePhotos.length > 1;

	const showPrevPhoto = () => {
		setActivePhotoIndex(
			(prev) => (prev - 1 + uniquePhotos.length) % uniquePhotos.length,
		);
	};
	const showNextPhoto = () => {
		setActivePhotoIndex((prev) => (prev + 1) % uniquePhotos.length);
	};

	return (
		<section
			aria-label="Galeri foto tempat kuliner"
			className="lg:col-span-7 space-y-3"
		>
			<div className="group relative overflow-hidden rounded-[14px] bg-muted">
				<button
					type="button"
					onClick={() => setLightboxOpen(true)}
					aria-label={`Perbesar foto ${placeName}`}
					className="block w-full overflow-hidden text-left"
				>
					<img
						src={activePhoto}
						alt={`Foto ${safePhotoIndex + 1} ${placeName}`}
						width={800}
						height={500}
						fetchPriority="high"
						className="aspect-[16/10] w-full object-cover"
					/>
				</button>

				{hasMultiplePhotos ? (
					<>
						<button
							type="button"
							onClick={showPrevPhoto}
							aria-label="Foto sebelumnya"
							title="Foto sebelumnya"
							className="absolute left-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm transition-colors hover:bg-card hover:text-primary"
						>
							<ChevronLeft className="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={showNextPhoto}
							aria-label="Foto berikutnya"
							title="Foto berikutnya"
							className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm transition-colors hover:bg-card hover:text-primary"
						>
							<ChevronRight className="size-4" aria-hidden="true" />
						</button>
					</>
				) : null}

				<button
					type="button"
					onClick={() => setLightboxOpen(true)}
					aria-label={`Perbesar foto ${placeName}`}
					title="Perbesar foto"
					className="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm transition-colors hover:bg-card hover:text-primary"
				>
					<Maximize2 className="size-4" aria-hidden="true" />
				</button>
			</div>

			<Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
				<DialogContent
					bare
					onKeyDown={(event) => {
						if (!hasMultiplePhotos) return;
						if (event.key === "ArrowLeft") {
							event.preventDefault();
							showPrevPhoto();
						} else if (event.key === "ArrowRight") {
							event.preventDefault();
							showNextPhoto();
						}
					}}
				>
					<DialogTitle className="sr-only">{placeName}</DialogTitle>
					<DialogDescription className="sr-only">
						Foto ke-{safePhotoIndex + 1} dari {uniquePhotos.length}
					</DialogDescription>
					<div className="relative">
						<img
							src={activePhoto}
							alt={`Foto ukuran penuh ${safePhotoIndex + 1} ${placeName}`}
							className="block max-h-[88dvh] max-w-[92dvw] w-auto h-auto rounded-[10px] object-contain"
						/>
						<DialogClose
							aria-label="Tutup foto"
							className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
						>
							<X className="size-5" aria-hidden="true" />
						</DialogClose>
						{hasMultiplePhotos ? (
							<>
								<button
									type="button"
									onClick={showPrevPhoto}
									aria-label="Foto sebelumnya"
									title="Foto sebelumnya"
									className="absolute left-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80"
								>
									<ChevronLeft className="size-5" aria-hidden="true" />
								</button>
								<button
									type="button"
									onClick={showNextPhoto}
									aria-label="Foto berikutnya"
									title="Foto berikutnya"
									className="absolute right-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80"
								>
									<ChevronRight className="size-5" aria-hidden="true" />
								</button>
							</>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			{hasMultiplePhotos ? (
				<div className="flex gap-2 overflow-x-auto pb-1">
					{uniquePhotos.map((src, idx) => (
						<button
							key={src}
							type="button"
							onClick={() => setActivePhotoIndex(idx)}
							aria-label={`Lihat foto ${idx + 1}`}
							aria-pressed={idx === safePhotoIndex}
							className={`shrink-0 overflow-hidden rounded-[8px] border-2 transition-colors ${
								idx === safePhotoIndex
									? "border-primary"
									: "border-border hover:border-input"
							}`}
						>
							<img
								src={src}
								alt={`Pratinjau foto ${idx + 1} ${placeName}`}
								width={120}
								height={75}
								className="h-16 w-24 object-cover"
							/>
						</button>
					))}
				</div>
			) : null}
		</section>
	);
}
