import {
	Camera,
	LogIn,
	MapPinPlus,
	PencilLine,
	Star,
	UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, type MetaArgs } from "react-router";
import {
	CONTRIBUTE_ACTIONS,
	calculateContributorXp,
	formatRelativeContributionDate,
	getContributorLevel,
	getPlacePhotoCount,
	XP_REWARDS,
} from "~/components/contribute/types";
import { Button } from "~/components/ui/button";
import { useDarasa } from "~/context/darasa-store";
import { cn } from "~/lib/utils";

export function meta(_args: MetaArgs) {
	return [
		{ title: "Kontribusi | Darasa" },
		{
			name: "description",
			content:
				"Dasbor kontributor komunitas Darasa untuk menambah tempat, menulis ulasan, mengunggah foto, dan memperbarui info kuliner di Kabupaten Batang.",
		},
	];
}

const ROLE_DISPLAY: Record<string, string> = {
	visitor: "Mode Tamu",
	user: "Warga Terdaftar",
	owner: "Pemilik Usaha",
	admin: "Administrator",
};

type HistoryFilter = "all" | "place" | "review" | "other";

interface TimelineEntry {
	id: string;
	kind: "place" | "review" | "photo" | "edit";
	title: string;
	subtitle: string;
	slug: string;
	createdAt: string;
	xp: number;
}

export default function ContributeDashboardPage() {
	const { hydrated, currentUser, places, contributions, switchDemoAccount } =
		useDarasa();
	const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
	const [showAllHistory, setShowAllHistory] = useState(false);

	const isVisitor = currentUser.role === "visitor";

	const userSubmittedPlaces = useMemo(
		() =>
			isVisitor
				? []
				: places.filter((p) => p.submittedByUserId === currentUser.id),
		[isVisitor, places, currentUser.id],
	);

	const userReviews = useMemo(
		() =>
			isVisitor
				? []
				: places.flatMap((place) =>
						place.reviews
							.filter((r) => r.userId === currentUser.id)
							.map((review) => ({ place, review })),
					),
		[isVisitor, places, currentUser.id],
	);

	const userPhotoCount = useMemo(
		() =>
			isVisitor
				? 0
				: contributions.filter(
						(c) => c.userId === currentUser.id && c.type === "photo",
					).length,
		[isVisitor, contributions, currentUser.id],
	);

	const userEditCount = useMemo(
		() =>
			isVisitor
				? 0
				: contributions.filter(
						(c) => c.userId === currentUser.id && c.type === "edit",
					).length,
		[isVisitor, contributions, currentUser.id],
	);

	const totalXp = useMemo(
		() =>
			calculateContributorXp({
				places: userSubmittedPlaces.length,
				reviews: userReviews.length,
				photos: userPhotoCount,
				edits: userEditCount,
			}),
		[
			userSubmittedPlaces.length,
			userReviews.length,
			userPhotoCount,
			userEditCount,
		],
	);

	const levelInfo = useMemo(() => getContributorLevel(totalXp), [totalXp]);

	const unreviewedPlaces = useMemo(
		() =>
			places
				.filter((p) => !p.reviews.some((r) => r.userId === currentUser.id))
				.slice(0, 2),
		[places, currentUser.id],
	);

	const missingInfoPlaces = useMemo(() => {
		const unreviewedIds = new Set(unreviewedPlaces.map((p) => p.id));
		return places
			.filter(
				(p) =>
					!unreviewedIds.has(p.id) && (!p.phone || getPlacePhotoCount(p) <= 1),
			)
			.slice(0, 2)
			.map((place) => {
				const photoCount = getPlacePhotoCount(place);
				const needsPhoto = photoCount <= 1;
				return {
					place,
					to: needsPhoto
						? `/contribute/add-photo?placeId=${place.id}`
						: `/contribute/update-info?placeId=${place.id}`,
					reason: needsPhoto
						? `Baru memiliki ${photoCount} foto`
						: "Belum ada nomor kontak usaha",
					ctaLabel: needsPhoto ? "Tambah Foto" : "Lengkapi Info",
				};
			});
	}, [places, unreviewedPlaces]);

	const timelineEntries = useMemo<TimelineEntry[]>(() => {
		if (isVisitor) return [];

		const placeEntries: TimelineEntry[] = userSubmittedPlaces.map((p) => ({
			id: `place-${p.id}`,
			kind: "place",
			title: `Menambahkan ${p.name}`,
			subtitle: `${p.district} · ${formatRelativeContributionDate(p.createdAt)}`,
			slug: p.slug,
			createdAt: p.createdAt,
			xp: XP_REWARDS.place,
		}));

		const reviewEntries: TimelineEntry[] = userReviews.map(
			({ place, review }) => ({
				id: `rev-${review.id}`,
				kind: "review",
				title: `Mengulas ${place.name}`,
				subtitle: `${review.rating}/5 · ${formatRelativeContributionDate(review.createdAt)}`,
				slug: place.slug,
				createdAt: review.createdAt,
				xp: XP_REWARDS.review,
			}),
		);

		const extraEntries: TimelineEntry[] = contributions
			.filter(
				(c) =>
					c.userId === currentUser.id &&
					(c.type === "photo" || c.type === "edit"),
			)
			.map((item) => {
				const target = places.find((p) => p.id === item.placeId);
				const isPhoto = item.type === "photo";
				return {
					id: item.id,
					kind: isPhoto ? "photo" : "edit",
					title: isPhoto
						? `Foto baru di ${item.placeName}`
						: `Edit info ${item.placeName}`,
					subtitle: `${item.summary} · ${formatRelativeContributionDate(item.createdAt)}`,
					slug: target?.slug ?? "",
					createdAt: item.createdAt,
					xp: isPhoto ? XP_REWARDS.photo : XP_REWARDS.edit,
				};
			});

		return [...placeEntries, ...reviewEntries, ...extraEntries].sort(
			(a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
		);
	}, [
		isVisitor,
		userSubmittedPlaces,
		userReviews,
		contributions,
		currentUser.id,
		places,
	]);

	const filteredTimeline = useMemo(() => {
		if (historyFilter === "all") return timelineEntries;
		if (historyFilter === "place") {
			return timelineEntries.filter((e) => e.kind === "place");
		}
		if (historyFilter === "review") {
			return timelineEntries.filter((e) => e.kind === "review");
		}
		return timelineEntries.filter(
			(e) => e.kind === "photo" || e.kind === "edit",
		);
	}, [timelineEntries, historyFilter]);

	const visibleTimeline = showAllHistory
		? filteredTimeline
		: filteredTimeline.slice(0, 6);

	if (!hydrated) {
		return (
			<section
				aria-busy="true"
				aria-label="Memuat dasbor kontribusi"
				className="space-y-6 pb-8"
			>
				<div className="rounded-[12px] border border-border bg-card p-5 sm:p-6 space-y-4">
					<div className="flex items-center gap-4">
						<div className="size-[52px] shrink-0 rounded-full bg-muted" />
						<div className="space-y-2 flex-1 min-w-0">
							<div className="h-7 w-40 rounded-[6px] bg-muted" />
							<div className="h-4 w-56 max-w-full rounded-[6px] bg-muted" />
						</div>
					</div>
					<div className="h-16 rounded-[10px] bg-muted" />
				</div>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{[1, 2, 3, 4].map((item) => (
						<div
							key={item}
							className="h-[84px] rounded-[12px] border border-border bg-card"
						/>
					))}
				</div>
				<p role="status" className="text-xs text-muted-foreground">
					Memuat dasbor kontribusi...
				</p>
			</section>
		);
	}

	return (
		<div className="space-y-6 pb-8">
			{/* Section 1: Contributor Level & XP Hero Card */}
			<section
				aria-labelledby="contribute-dashboard-heading"
				className="rounded-[12px] border border-border bg-card p-5 sm:p-6 space-y-5"
			>
				<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-w-0 items-center gap-4">
						<img
							src="/images/avatar-profile.svg"
							alt={`Avatar ${currentUser.name}`}
							width={52}
							height={52}
							className={cn(
								"size-[52px] shrink-0 rounded-full border-2 object-cover bg-muted",
								isVisitor ? "border-border" : "border-primary",
							)}
						/>
						<div className="min-w-0 space-y-1">
							<h1
								id="contribute-dashboard-heading"
								className="text-2xl font-bold tracking-tight text-foreground leading-tight sm:text-[28px]"
							>
								Kontribusi
							</h1>
							<p className="truncate text-sm text-muted-foreground">
								{currentUser.name} ·{" "}
								{ROLE_DISPLAY[currentUser.role] ?? currentUser.role}
							</p>
						</div>
					</div>

					{isVisitor ? (
						<div className="flex flex-wrap items-center gap-2.5">
							<Button
								type="button"
								onClick={() => switchDemoAccount("usr-warga")}
							>
								<UserCheck className="size-4" aria-hidden="true" />
								Coba sebagai Warga
							</Button>
							<Button asChild variant="outline">
								<Link to="/login?redirect=/contribute">
									<LogIn className="size-4" aria-hidden="true" />
									Masuk Akun
								</Link>
							</Button>
						</div>
					) : (
						<div className="w-full shrink-0 space-y-2.5 rounded-[10px] border border-border bg-background p-4 lg:w-[340px]">
							<div className="flex items-center justify-between gap-2 text-sm">
								<span className="font-semibold text-foreground">
									Level {levelInfo.level} · {levelInfo.title}
								</span>
								<span className="shrink-0 font-semibold text-primary-hover tabular-nums">
									{levelInfo.xp} XP
								</span>
							</div>

							<div
								role="progressbar"
								aria-valuenow={levelInfo.progressPercent}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-label="Progres level kontributor"
								className="h-2 w-full overflow-hidden rounded-full bg-muted"
							>
								<div
									className="h-full rounded-full bg-primary transition-[width] duration-300"
									style={{ width: `${levelInfo.progressPercent}%` }}
								/>
							</div>

							<p className="text-xs text-muted-foreground">
								{levelInfo.nextLevelTitle !== null
									? `${levelInfo.xpToNext} XP lagi ke Level ${levelInfo.level + 1} (${levelInfo.nextLevelTitle})`
									: "Anda mencapai tingkat tertinggi kontributor Darasa."}
							</p>
						</div>
					)}
				</div>

				{!isVisitor ? (
					<div className="grid grid-cols-2 gap-2.5 border-t border-border pt-4 sm:grid-cols-4">
						{[
							{ label: "Tempat", value: userSubmittedPlaces.length },
							{ label: "Ulasan", value: userReviews.length },
							{ label: "Foto", value: userPhotoCount },
							{ label: "Info diperbarui", value: userEditCount },
						].map((metric) => (
							<div
								key={metric.label}
								className="flex items-center justify-between gap-2 rounded-[8px] border border-border bg-background px-3.5 py-2.5"
							>
								<span className="text-xs text-muted-foreground">
									{metric.label}
								</span>
								<span className="text-base font-bold text-foreground tabular-nums">
									{metric.value}
								</span>
							</div>
						))}
					</div>
				) : null}
			</section>

			{/* Section 2: 4 Contribution Menu Cards */}
			<section
				aria-labelledby="contribute-actions-heading"
				className="space-y-3"
			>
				<div className="space-y-1">
					<h2
						id="contribute-actions-heading"
						className="text-lg font-bold tracking-tight text-foreground"
					>
						Pilih Kontribusi
					</h2>
					<p className="text-sm text-muted-foreground">
						Pilih jenis kontribusi untuk membantu warga menemukan kuliner
						terdekat di Batang.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{CONTRIBUTE_ACTIONS.map((action) => {
						const Icon = action.icon;
						return (
							<Link
								key={action.id}
								to={action.to}
								className="min-h-[84px] flex items-start gap-3.5 rounded-[12px] border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary-soft/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-hover">
									<Icon className="size-5" aria-hidden="true" />
								</span>
								<div className="min-w-0 flex-1 space-y-1">
									<div className="flex items-center justify-between gap-2">
										<span className="text-sm font-semibold text-foreground">
											{action.label}
										</span>
										<span className="shrink-0 text-xs font-semibold text-primary-hover tabular-nums">
											+{action.xpReward} XP
										</span>
									</div>
									<p className="text-xs text-muted-foreground">
										{action.shortDesc}
									</p>
								</div>
							</Link>
						);
					})}
				</div>
			</section>

			{/* Section 3: Asymmetric Split - Actionable Suggestions & History */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				{/* Left: Actionable Suggestions */}
				<section
					aria-labelledby="need-contributions-heading"
					className="lg:col-span-7 rounded-[12px] border border-border bg-card p-5 space-y-4"
				>
					<div className="space-y-1">
						<h2
							id="need-contributions-heading"
							className="text-base font-semibold text-foreground"
						>
							Butuh Kontribusi Warga
						</h2>
						<p className="text-xs text-muted-foreground">
							Tempat kuliner di Batang yang belum Anda ulas atau masih perlu
							foto dan informasi tambahan.
						</p>
					</div>

					{unreviewedPlaces.length === 0 && missingInfoPlaces.length === 0 ? (
						<div className="rounded-[10px] border border-dashed border-border bg-background/60 p-4 space-y-3">
							<p className="text-sm text-muted-foreground">
								Semua tempat yang terdaftar sudah Anda ulas dan memiliki
								informasi dasar lengkap.
							</p>
							<Button asChild variant="outline">
								<Link to="/contribute/add-place">Tambah Tempat Baru</Link>
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{unreviewedPlaces.map((place) => (
								<div
									key={`review-${place.id}`}
									className="flex flex-col gap-3 rounded-[10px] border border-border bg-background/70 p-3.5 sm:flex-row sm:items-center sm:justify-between"
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
								</div>
							))}

							{missingInfoPlaces.map((item) => (
								<div
									key={`info-${item.place.id}`}
									className="flex flex-col gap-3 rounded-[10px] border border-border bg-background/70 p-3.5 sm:flex-row sm:items-center sm:justify-between"
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
								</div>
							))}
						</div>
					)}
				</section>

				{/* Right: Contribution History */}
				<section
					aria-labelledby="contribution-history-heading"
					className="lg:col-span-5 rounded-[12px] border border-border bg-card p-5 space-y-4"
				>
					<div className="flex items-center justify-between gap-2">
						<h2
							id="contribution-history-heading"
							className="text-base font-semibold text-foreground"
						>
							Riwayat Kontribusi
						</h2>
						{!isVisitor ? (
							<span className="text-xs font-semibold text-muted-foreground tabular-nums">
								{timelineEntries.length}
							</span>
						) : null}
					</div>

					{isVisitor ? (
						<p className="rounded-[10px] border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
							Riwayat kontribusi Anda akan tampil di sini setelah masuk ke akun
							warga.
						</p>
					) : timelineEntries.length === 0 ? (
						<div className="rounded-[10px] border border-dashed border-border bg-background/60 p-4 space-y-3">
							<p className="text-sm text-muted-foreground">
								Belum ada kontribusi pada akun ini. Mulai dengan menulis ulasan
								atau menambahkan tempat baru.
							</p>
							<Button asChild variant="outline">
								<Link to="/contribute/write-review">Tulis Ulasan</Link>
							</Button>
						</div>
					) : (
						<>
							<div className="flex flex-wrap gap-1.5">
								{(
									[
										{ id: "all", label: "Semua" },
										{ id: "place", label: "Tempat" },
										{ id: "review", label: "Ulasan" },
										{ id: "other", label: "Foto & Info" },
									] as const
								).map((filterItem) => (
									<button
										key={filterItem.id}
										type="button"
										onClick={() => {
											setHistoryFilter(filterItem.id);
											setShowAllHistory(false);
										}}
										aria-pressed={historyFilter === filterItem.id}
										className={cn(
											"min-h-[44px] rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											historyFilter === filterItem.id
												? "border-primary bg-primary-soft font-semibold text-primary-hover"
												: "border-border bg-background font-medium text-muted-foreground hover:text-foreground",
										)}
									>
										{filterItem.label}
									</button>
								))}
							</div>

							{filteredTimeline.length === 0 ? (
								<p className="rounded-[10px] border border-border bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
									Belum ada kontribusi pada kategori ini.
								</p>
							) : (
								<div className="divide-y divide-border border-t border-border">
									{visibleTimeline.map((entry) => {
										const rowContent = (
											<>
												<span className="mt-0.5 shrink-0">
													{entry.kind === "place" ? (
														<MapPinPlus
															className="size-4 text-primary"
															aria-hidden="true"
														/>
													) : entry.kind === "review" ? (
														<Star
															className="size-4 fill-accent-yellow text-accent-yellow"
															aria-hidden="true"
														/>
													) : entry.kind === "photo" ? (
														<Camera
															className="size-4 text-primary"
															aria-hidden="true"
														/>
													) : (
														<PencilLine
															className="size-4 text-primary"
															aria-hidden="true"
														/>
													)}
												</span>
												<div className="min-w-0 flex-1 space-y-0.5">
													<p className="truncate text-sm font-medium text-foreground">
														{entry.title}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{entry.subtitle}
													</p>
												</div>
												<span className="shrink-0 text-xs font-semibold text-primary-hover tabular-nums">
													+{entry.xp} XP
												</span>
											</>
										);

										return entry.slug ? (
											<Link
												key={entry.id}
												to={`/places/${entry.slug}`}
												className="flex min-h-[44px] items-start gap-3 py-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												{rowContent}
											</Link>
										) : (
											<div
												key={entry.id}
												className="flex min-h-[44px] items-start gap-3 py-3"
											>
												{rowContent}
											</div>
										);
									})}
								</div>
							)}

							{filteredTimeline.length > 6 ? (
								<button
									type="button"
									onClick={() => setShowAllHistory((prev) => !prev)}
									className="min-h-[44px] w-full rounded-[8px] border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									{showAllHistory ? "Tampilkan ringkas" : "Lihat semua"}
								</button>
							) : null}
						</>
					)}
				</section>
			</div>
		</div>
	);
}
