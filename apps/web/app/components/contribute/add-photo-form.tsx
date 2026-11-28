import { Camera, CheckCircle2, ImagePlus, X } from "lucide-react";
import {
	type ChangeEvent,
	type DragEvent,
	type FormEvent,
	useId,
	useMemo,
	useState,
} from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { getPlacePhotoCount, readImageFiles } from "~/data/contribute";
import { cn } from "~/lib/utils";
import { PlacePicker } from "./place-picker";

interface AddPhotoFormProps {
	places: PlaceWithMetrics[];
	selectedPlaceId: string;
	onSelectPlace: (placeId: string) => void;
	onAddPhoto: (placeId: string, photoUrl: string) => void;
	onRequestAddNewPlace: (prefillName: string) => void;
}

export function AddPhotoForm({
	places,
	selectedPlaceId,
	onSelectPlace,
	onAddPhoto,
	onRequestAddNewPlace,
}: AddPhotoFormProps) {
	const [queuedPhotos, setQueuedPhotos] = useState<string[]>([]);
	const [isDragActive, setIsDragActive] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successSummary, setSuccessSummary] = useState<{
		count: number;
		name: string;
		slug: string;
	} | null>(null);

	const photoInputId = useId();
	const selectedPlace =
		places.find((p) => p.id === selectedPlaceId) ?? places[0];

	const placesNeedingPhotos = useMemo(
		() =>
			[...places]
				.sort((a, b) => getPlacePhotoCount(a) - getPlacePhotoCount(b))
				.slice(0, 3),
		[places],
	);

	const handleFiles = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0) return;
		const { urls, error: fileErr } = await readImageFiles(files);
		if (fileErr) {
			setError(fileErr);
			return;
		}
		setError(null);
		setSuccessSummary(null);
		setQueuedPhotos((prev) =>
			Array.from(new Set([...prev, ...urls])).slice(0, 6),
		);
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		void handleFiles(e.target.files);
		e.target.value = "";
	};

	const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragActive(false);
		void handleFiles(e.dataTransfer.files);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!selectedPlace) {
			setError("Pilih tempat kuliner terlebih dahulu.");
			return;
		}
		if (queuedPhotos.length === 0) {
			setError(
				"Pilih minimal satu foto dari perangkat atau seret ke area unggah.",
			);
			return;
		}
		for (const url of queuedPhotos) {
			onAddPhoto(selectedPlace.id, url);
		}
		setSuccessSummary({
			count: queuedPhotos.length,
			name: selectedPlace.name,
			slug: selectedPlace.slug,
		});
		setQueuedPhotos([]);
		setError(null);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-[12px] border border-border bg-card p-5 sm:p-6 space-y-6"
		>
			<div className="space-y-1">
				<h2 className="text-lg font-semibold text-foreground">
					Tambahkan Foto Kuliner
				</h2>
				<p className="text-xs sm:text-sm text-muted-foreground">
					Foto makanan, daftar harga, atau tampak depan warung membantu warga
					mengenali lokasi dengan cepat.
				</p>
			</div>

			{successSummary ? (
				<div
					role="status"
					className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-hover"
				>
					<div className="flex items-center gap-2 font-medium">
						<CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
						<span>
							{successSummary.count} foto berhasil ditambahkan ke{" "}
							{successSummary.name}.
						</span>
					</div>
					<Link
						to={`/places/${successSummary.slug}`}
						className="text-xs font-semibold underline underline-offset-4"
					>
						Lihat galeri tempat
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

			<PlacePicker
				places={places}
				selectedPlaceId={selectedPlace?.id ?? ""}
				onSelectPlace={(id) => {
					onSelectPlace(id);
					setSuccessSummary(null);
				}}
				label="Pilih tempat tujuan galeri"
				suggestedPlaces={placesNeedingPhotos}
				suggestedLabel="Butuh foto:"
				onRequestAddNewPlace={onRequestAddNewPlace}
				renderPlaceMeta={(p) => `${p.photos.length} foto`}
			/>

			{selectedPlace ? (
				<div className="space-y-2">
					<p className="text-xs font-medium text-muted-foreground">
						Galeri saat ini ({selectedPlace.photos.length} foto)
					</p>
					{selectedPlace.photos.length === 0 ? (
						<p className="rounded-[8px] border border-dashed border-border bg-background/50 px-3 py-2.5 text-xs text-muted-foreground">
							Belum ada foto tersimpan untuk tempat ini. Foto Anda akan menjadi
							yang pertama.
						</p>
					) : (
						<div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
							{selectedPlace.photos.map((src, idx) => (
								<img
									key={src}
									src={src}
									alt={`Foto ${idx + 1} ${selectedPlace.name}`}
									width={200}
									height={125}
									className="aspect-[16/10] w-full rounded-[8px] border border-border object-cover bg-muted"
								/>
							))}
						</div>
					)}
				</div>
			) : null}

			<div className="space-y-2.5">
				<Label htmlFor={photoInputId}>
					Unggah foto baru (maks. 6 foto sekaligus)
				</Label>
				<label
					htmlFor={photoInputId}
					onDragOver={(e) => {
						e.preventDefault();
						setIsDragActive(true);
					}}
					onDragLeave={() => setIsDragActive(false)}
					onDrop={handleDrop}
					className={cn(
						"flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed px-4 py-5 text-center text-sm transition-colors",
						isDragActive
							? "border-primary bg-primary-soft/60 text-foreground"
							: "border-border bg-background/60 text-muted-foreground hover:border-primary hover:text-foreground",
					)}
				>
					<Camera className="size-6 text-primary" aria-hidden="true" />
					<span className="font-semibold text-foreground">
						Pilih atau seret beberapa foto ke sini
					</span>
					<span className="text-xs text-muted-foreground">
						Format JPG, PNG, atau WebP (maks. 5 MB per foto)
					</span>
				</label>
				<input
					id={photoInputId}
					type="file"
					accept="image/*"
					multiple
					onChange={handleFileChange}
					className="sr-only"
				/>
			</div>

			{queuedPhotos.length > 0 ? (
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-2">
						<p className="text-xs font-medium text-foreground">
							Siap diunggah ({queuedPhotos.length} foto)
						</p>
						<button
							type="button"
							onClick={() => setQueuedPhotos([])}
							className="inline-flex min-h-[44px] items-center px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
						>
							Hapus semua
						</button>
					</div>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{queuedPhotos.map((src, idx) => (
							<div key={src} className="relative">
								<img
									src={src}
									alt={`Pratinjau foto baru ${idx + 1}`}
									width={240}
									height={150}
									className="aspect-[16/10] w-full rounded-[8px] border border-border object-cover"
								/>
								<button
									type="button"
									onClick={() =>
										setQueuedPhotos((prev) =>
											prev.filter((item) => item !== src),
										)
									}
									aria-label={`Hapus foto antrean ${idx + 1}`}
									className="absolute right-1.5 top-1.5 inline-flex size-11 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-xs hover:bg-background"
								>
									<X className="size-4" aria-hidden="true" />
								</button>
							</div>
						))}
					</div>
				</div>
			) : null}

			<div className="flex justify-end border-t border-border pt-4">
				<Button type="submit" size="lg" disabled={!selectedPlace}>
					<ImagePlus className="size-4" aria-hidden="true" />
					{queuedPhotos.length > 1
						? `Unggah ${queuedPhotos.length} Foto`
						: "Unggah Foto"}
				</Button>
			</div>
		</form>
	);
}
