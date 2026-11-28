import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

interface AddPlaceSuccessProps {
	place: { slug: string; name: string };
	onAddAnother: () => void;
}

export function AddPlaceSuccess({ place, onAddAnother }: AddPlaceSuccessProps) {
	return (
		<section
			aria-live="polite"
			className="rounded-[12px] border border-border bg-card p-6 sm:p-8 space-y-5"
		>
			<div className="flex items-start gap-3">
				<span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-hover">
					<CheckCircle2 className="size-6" aria-hidden="true" />
				</span>
				<div className="space-y-1">
					<h2 className="text-lg font-bold text-foreground">
						"{place.name}" berhasil ditambahkan
					</h2>
					<p className="text-sm text-muted-foreground">
						Data tempat kuliner baru sudah masuk ke direktori Darasa dan antrean
						validasi komunitas.
					</p>
				</div>
			</div>
			<div className="flex flex-wrap gap-2.5">
				<Button asChild>
					<Link to={`/places/${place.slug}`}>Lihat Halaman Tempat</Link>
				</Button>
				<Button type="button" variant="outline" onClick={onAddAnother}>
					Tambah Tempat Lainnya
				</Button>
			</div>
		</section>
	);
}
