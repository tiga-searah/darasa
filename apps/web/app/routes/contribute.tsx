import { useMemo } from "react";
import { Link, type MetaArgs } from "react-router";
import {
	ContributionHistorySection,
	type TimelineEntry,
} from "~/components/contribute/contribution-history-section";
import { ContributorHeroCard } from "~/components/contribute/contributor-hero-card";
import {
	type MissingInfoSuggestion,
	NeedContributionsSection,
} from "~/components/contribute/need-contributions-section";
import { useDarasa } from "~/context/darasa-store";
import {
	CONTRIBUTE_ACTIONS,
	calculateContributorXp,
	formatRelativeContributionDate,
	getContributorLevel,
	getPlacePhotoCount,
	XP_REWARDS,
} from "~/data/contribute";

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

export default function ContributeDashboardPage() {
	const { hydrated, currentUser, places, contributions, switchDemoAccount } =
		useDarasa();

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

	const missingInfoPlaces = useMemo<MissingInfoSuggestion[]>(() => {
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
			<ContributorHeroCard
				currentUser={currentUser}
				isVisitor={isVisitor}
				levelInfo={levelInfo}
				counts={{
					places: userSubmittedPlaces.length,
					reviews: userReviews.length,
					photos: userPhotoCount,
					edits: userEditCount,
				}}
				onTryAsWarga={() => switchDemoAccount("usr-warga")}
			/>

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

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				<NeedContributionsSection
					unreviewedPlaces={unreviewedPlaces}
					missingInfoPlaces={missingInfoPlaces}
				/>
				<ContributionHistorySection
					isVisitor={isVisitor}
					timelineEntries={timelineEntries}
				/>
			</div>
		</div>
	);
}
