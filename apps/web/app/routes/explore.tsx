import gsap from "gsap";
import {
	ArrowUpDown,
	Gem,
	Info,
	PlusCircle,
	RotateCcw,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PlaceCard } from "~/components/place-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { useDarasa } from "~/context/darasa-store";
import { BATANG_DISTRICTS, PLACE_CATEGORIES } from "~/data/batang-places";
import type {
	BatangDistrict,
	PlaceCategory,
	VerificationStatus,
} from "~/lib/types";
import type { Route } from "./+types/explore";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Jelajah Kuliner Batang | Darasa" },
		{
			name: "description",
			content:
				"Temukan warung lokal, kuliner pesisir, kedai kopi, dan hidden gem di Kabupaten Batang melalui kurasi komunitas Darasa.",
		},
	];
}

type SortOption = "explore" | "rating" | "reviews" | "newest";

export default function ExplorePage() {
	const { places, hydrated } = useDarasa();
	const [searchParams, setSearchParams] = useSearchParams();
	const urlDistrict = searchParams.get("district");

	const [keyword, setKeyword] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<
		PlaceCategory | "all"
	>("all");
	const [selectedDistrict, setSelectedDistrict] = useState<
		BatangDistrict | "all"
	>(
		urlDistrict && BATANG_DISTRICTS.includes(urlDistrict as BatangDistrict)
			? (urlDistrict as BatangDistrict)
			: "all",
	);
	const [verificationFilter, setVerificationFilter] = useState<
		VerificationStatus | "all"
	>("all");
	const [sortBy, setSortBy] = useState<SortOption>("explore");

	const gridRef = useRef<HTMLDivElement>(null);
	const searchInputId = useId();
	const districtSelectId = useId();
	const verifySelectId = useId();
	const sortSelectId = useId();

	useEffect(() => {
		if (
			urlDistrict &&
			BATANG_DISTRICTS.includes(urlDistrict as BatangDistrict)
		) {
			setSelectedDistrict(urlDistrict as BatangDistrict);
		}
	}, [urlDistrict]);

	const filteredPlaces = useMemo(() => {
		const q = keyword.trim().toLowerCase();
		return places
			.filter((place) => {
				if (q) {
					const haystack =
						`${place.name} ${place.category} ${place.district} ${place.address} ${place.description}`.toLowerCase();
					if (!haystack.includes(q)) return false;
				}
				if (selectedCategory !== "all" && place.category !== selectedCategory)
					return false;
				if (selectedDistrict !== "all" && place.district !== selectedDistrict)
					return false;
				if (
					verificationFilter !== "all" &&
					place.verificationStatus !== verificationFilter
				) {
					return false;
				}
				return true;
			})
			.sort((a, b) => {
				switch (sortBy) {
					case "rating":
						return (
							b.averageRating - a.averageRating || b.reviewCount - a.reviewCount
						);
					case "reviews":
						return b.reviewCount - a.reviewCount;
					case "newest":
						return Date.parse(b.createdAt) - Date.parse(a.createdAt);
					default:
						return b.exploreScore - a.exploreScore;
				}
			});
	}, [
		places,
		keyword,
		selectedCategory,
		selectedDistrict,
		verificationFilter,
		sortBy,
	]);

	useEffect(() => {
		const container = gridRef.current;
		if (!container) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const _deps = `${selectedCategory}-${selectedDistrict}-${verificationFilter}-${sortBy}`;
		if (!_deps) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				container.children,
				{ opacity: 0, y: 12 },
				{
					opacity: 1,
					y: 0,
					duration: 0.28,
					stagger: 0.04,
					ease: "power2.out",
					clearProps: "transform",
				},
			);
		}, gridRef);

		return () => ctx.revert();
	}, [selectedCategory, selectedDistrict, verificationFilter, sortBy]);

	const hasActiveFilters =
		keyword.trim().length > 0 ||
		selectedCategory !== "all" ||
		selectedDistrict !== "all" ||
		verificationFilter !== "all";

	const resetFilters = () => {
		setKeyword("");
		setSelectedCategory("all");
		setSelectedDistrict("all");
		setVerificationFilter("all");
		if (searchParams.has("district")) {
			setSearchParams({});
		}
	};

	const verificationLabels: Record<VerificationStatus, string> = {
		owner_verified: "Terverifikasi Pemilik",
		community_verified: "Terverifikasi Komunitas",
		unverified: "Belum Terverifikasi",
	};

	return (
		<div className="space-y-6">
			{/* Hero Discovery Header */}
			<Card className="p-6 lg:p-8 space-y-5">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="max-w-2xl space-y-2">
						<h1 className="text-2xl sm:text-[32px] font-bold tracking-tight text-foreground leading-tight">
							Mau cari kuliner apa di Batang hari ini?
						</h1>
						<p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
							Temukan warung lokal, kuliner sekitar koridor KITB, hingga sajian
							pesisir yang diurutkan secara adil menggunakan{" "}
							<strong className="font-semibold text-foreground">
								Explore Score
							</strong>
							.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<Button
							asChild
							variant="outline"
							className="border-accent-yellow/60 bg-accent text-accent-foreground hover:bg-yellow-soft"
						>
							<Link to="/hidden-gem">
								<Gem className="size-4" aria-hidden="true" />
								Jelajahi Hidden Gem
							</Link>
						</Button>
						<Button asChild>
							<Link to="/submit-place">
								<PlusCircle className="size-4" aria-hidden="true" />
								Tambah Tempat Kuliner
							</Link>
						</Button>
					</div>
				</div>

				<Separator />

				{/* Integrated Search + Filter Bar */}
				<search>
					<form
						onSubmit={(e) => e.preventDefault()}
						className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end"
					>
						<div className="md:col-span-4 space-y-1.5">
							<Label htmlFor={searchInputId}>
								Cari nama tempat, menu, atau area
							</Label>
							<div className="relative">
								<Search
									className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
									aria-hidden="true"
								/>
								<Input
									id={searchInputId}
									type="search"
									value={keyword}
									onChange={(e) => setKeyword(e.target.value)}
									placeholder="Contoh: megono, ikan bakar, KITB..."
									className="bg-background pl-10"
								/>
							</div>
						</div>

						<div className="md:col-span-3 space-y-1.5">
							<Label htmlFor={districtSelectId}>Kecamatan / Kawasan</Label>
							<Select
								value={selectedDistrict}
								onValueChange={(val) => {
									const next = val as BatangDistrict | "all";
									setSelectedDistrict(next);
									if (next === "all") {
										setSearchParams({});
									} else {
										setSearchParams({ district: next });
									}
								}}
							>
								<SelectTrigger id={districtSelectId} className="bg-background">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Semua Kawasan Batang</SelectItem>
									{BATANG_DISTRICTS.map((district) => (
										<SelectItem key={district} value={district}>
											{district}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="md:col-span-3 space-y-1.5">
							<Label htmlFor={verifySelectId}>Status Verifikasi</Label>
							<Select
								value={verificationFilter}
								onValueChange={(val) =>
									setVerificationFilter(val as VerificationStatus | "all")
								}
							>
								<SelectTrigger id={verifySelectId} className="bg-background">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Semua Status</SelectItem>
									<SelectItem value="owner_verified">
										Terverifikasi Pemilik
									</SelectItem>
									<SelectItem value="community_verified">
										Terverifikasi Komunitas
									</SelectItem>
									<SelectItem value="unverified">
										Belum Terverifikasi
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="md:col-span-2 space-y-1.5">
							<Label htmlFor={sortSelectId}>Urutkan</Label>
							<Select
								value={sortBy}
								onValueChange={(val) => setSortBy(val as SortOption)}
							>
								<SelectTrigger id={sortSelectId} className="bg-background">
									<ArrowUpDown
										className="size-3.5 text-muted-foreground"
										aria-hidden="true"
									/>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="explore">Explore Score</SelectItem>
									<SelectItem value="rating">Rating Tertinggi</SelectItem>
									<SelectItem value="reviews">Ulasan Terbanyak</SelectItem>
									<SelectItem value="newest">Terbaru Ditambahkan</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</form>
				</search>

				{/* Category Chips */}
				<div className="flex flex-wrap items-center justify-between gap-3 pt-1">
					<fieldset className="flex flex-wrap items-center gap-2 border-0 p-0 m-0">
						<legend className="sr-only">Filter kategori kuliner</legend>
						<Button
							variant={selectedCategory === "all" ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedCategory("all")}
							aria-pressed={selectedCategory === "all"}
						>
							Semua Kategori
						</Button>
						{PLACE_CATEGORIES.map((category) => {
							const active = selectedCategory === category;
							return (
								<Button
									key={category}
									variant={active ? "default" : "outline"}
									size="sm"
									onClick={() => setSelectedCategory(category)}
									aria-pressed={active}
								>
									{category}
								</Button>
							);
						})}
					</fieldset>

					<Dialog>
						<DialogTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground"
							>
								<Info className="size-4 text-primary" aria-hidden="true" />
								Cara Kerja Explore Score
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Bagaimana Explore Score Dihitung?</DialogTitle>
								<DialogDescription>
									Peringkat Explore menyeimbangkan kualitas rasa dan keterbaruan
									agar UMKM lokal tetap punya peluang tampil.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-3 text-sm text-muted-foreground">
								<p className="rounded-[8px] border border-border bg-background p-3 font-medium text-foreground tabular-nums">
									Explore Score = (0.5 x Rating) + (0.2 x log(1 + Jumlah
									Ulasan)) + (0.2 x Keterbaruan) + (0.1 x Status Verifikasi)
								</p>
								<ul className="list-disc pl-5 space-y-1.5">
									<li>Rating rata-rata memberi bobot terbesar (50%).</li>
									<li>
										Jumlah ulasan memakai skala logaritmik agar tempat populer
										tidak memonopoli daftar.
									</li>
									<li>
										Verifikasi pemilik dan komunitas ikut meningkatkan bobot
										kepercayaan profil.
									</li>
								</ul>
							</div>
						</DialogContent>
					</Dialog>
				</div>
			</Card>

			{/* Active Filter Pills & Result Count */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<SlidersHorizontal
							className="size-4 text-primary"
							aria-hidden="true"
						/>
						<span>
							Menampilkan{" "}
							<strong className="font-semibold text-foreground tabular-nums">
								{filteredPlaces.length}
							</strong>{" "}
							tempat kuliner
						</span>
					</div>

					{keyword.trim() ? (
						<button
							type="button"
							onClick={() => setKeyword("")}
							aria-label={`Hapus kata kunci ${keyword}`}
							className="inline-flex items-center gap-1 rounded-[6px] border border-primary/25 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							Kata kunci: &ldquo;{keyword.trim()}&rdquo;
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{selectedCategory !== "all" ? (
						<button
							type="button"
							onClick={() => setSelectedCategory("all")}
							aria-label={`Hapus filter kategori ${selectedCategory}`}
							className="inline-flex items-center gap-1 rounded-[6px] border border-primary/25 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							Kategori: {selectedCategory}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{selectedDistrict !== "all" ? (
						<button
							type="button"
							onClick={() => {
								setSelectedDistrict("all");
								setSearchParams({});
							}}
							aria-label={`Hapus filter kawasan ${selectedDistrict}`}
							className="inline-flex items-center gap-1 rounded-[6px] border border-primary/25 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							Kawasan: {selectedDistrict}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{verificationFilter !== "all" ? (
						<button
							type="button"
							onClick={() => setVerificationFilter("all")}
							aria-label={`Hapus filter verifikasi ${verificationLabels[verificationFilter]}`}
							className="inline-flex items-center gap-1 rounded-[6px] border border-primary/25 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-hover hover:brightness-95"
						>
							Status: {verificationLabels[verificationFilter]}
							<X className="size-3.5" aria-hidden="true" />
						</button>
					) : null}

					{hasActiveFilters ? (
						<Button variant="ghost" size="sm" onClick={resetFilters}>
							<RotateCcw className="size-3.5" aria-hidden="true" />
							Reset Semua
						</Button>
					) : null}
				</div>

				<Badge variant="secondary">
					{!hydrated
						? "Memuat data lokal..."
						: "Katalog Contoh Prototipe Batang"}
				</Badge>
			</div>

			{/* Places Grid or Empty State */}
			{filteredPlaces.length === 0 ? (
				<Card className="p-10 text-center space-y-4">
					<h2 className="text-lg font-semibold text-foreground">
						Tidak ada tempat kuliner yang cocok dengan filter Anda
					</h2>
					<p className="mx-auto max-w-md text-sm text-muted-foreground">
						Coba ubah kata kunci pencarian, hapus salah satu filter aktif, atau
						tambahkan tempat kuliner baru jika belum terdaftar.
					</p>
					<div className="flex flex-wrap justify-center gap-3">
						<Button variant="secondary" onClick={resetFilters}>
							Tampilkan Semua Tempat
						</Button>
						<Button asChild>
							<Link to="/submit-place">Tambah Tempat Baru</Link>
						</Button>
					</div>
				</Card>
			) : (
				<div
					ref={gridRef}
					className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
				>
					{filteredPlaces.map((place, index) => (
						<PlaceCard
							key={place.id}
							place={place}
							mode="explore"
							prioritizeImage={index < 3}
						/>
					))}
				</div>
			)}
		</div>
	);
}
