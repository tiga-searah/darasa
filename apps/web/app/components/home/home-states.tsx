import { PlusCircle, RotateCcw } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function HomeSkeleton() {
	return (
		<div className="space-y-8 pb-8" aria-busy="true">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					Kuliner Populer Batang
				</h1>
				<p role="status" className="text-sm text-muted-foreground">
					Memuat katalog kuliner Batang...
				</p>
			</div>
			<div className="h-[260px] rounded-[12px] bg-muted/60" />
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
				{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"].map((key) => (
					<div
						key={key}
						className="h-24 rounded-[10px] border border-border bg-muted/50"
					/>
				))}
			</div>
		</div>
	);
}

export function HomeEmptyState({ onResetData }: { onResetData: () => void }) {
	return (
		<section
			aria-labelledby="home-empty-heading"
			className="mx-auto my-8 max-w-xl rounded-[16px] border border-border bg-card p-6 text-center sm:p-8"
		>
			<h1
				id="home-empty-heading"
				className="text-xl font-bold text-foreground sm:text-2xl"
			>
				Belum Ada Tempat Kuliner Tersedia
			</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Katalog beranda belum memiliki data warung atau kedai. Anda dapat
				menambahkan tempat baru atau memulihkan data bawaan prototipe.
			</p>
			<div className="mt-5 flex flex-wrap items-center justify-center gap-3">
				<Button asChild className="min-h-[44px] rounded-[8px]">
					<Link to="/contribute/add-place">
						<PlusCircle className="size-4" aria-hidden="true" />
						Tambahkan Tempat Kuliner
					</Link>
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onResetData}
					className="min-h-[44px] rounded-[8px] border-input"
				>
					<RotateCcw className="size-4" aria-hidden="true" />
					Muat Ulang Data Bawaan
				</Button>
			</div>
		</section>
	);
}
