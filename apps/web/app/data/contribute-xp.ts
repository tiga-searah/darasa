export const XP_REWARDS = {
	place: 15,
	review: 8,
	photo: 5,
	edit: 4,
} as const;

export interface ContributorLevelTier {
	level: number;
	minXp: number;
	title: string;
}

export interface ContributorLevelInfo {
	level: number;
	title: string;
	xp: number;
	currentLevelMinXp: number;
	nextLevelXp: number | null;
	nextLevelTitle: string | null;
	progressPercent: number;
	xpToNext: number;
}

export const CONTRIBUTOR_LEVELS: readonly ContributorLevelTier[] = [
	{ level: 1, minXp: 0, title: "Penjelajah Baru" },
	{ level: 2, minXp: 100, title: "Penjelajah Aktif" },
	{ level: 3, minXp: 220, title: "Pencicip Lokal" },
	{ level: 4, minXp: 360, title: "Pengulas Setia" },
	{ level: 5, minXp: 530, title: "Pemandu Rasa" },
	{ level: 6, minXp: 730, title: "Pemburu Hidden Gem" },
	{ level: 7, minXp: 970, title: "Kurator Lokal" },
	{ level: 8, minXp: 1250, title: "Penjaga Data Kuliner" },
	{ level: 9, minXp: 1580, title: "Pemandu Kuliner" },
	{ level: 10, minXp: 1970, title: "Kurator Senior" },
	{ level: 11, minXp: 2430, title: "Penggerak Komunitas" },
	{ level: 12, minXp: 2970, title: "Pakar Kuliner Batang" },
	{ level: 13, minXp: 3600, title: "Maestro Cita Rasa" },
	{ level: 14, minXp: 4330, title: "Tokoh Kuliner Lokal" },
	{ level: 15, minXp: 5200, title: "Duta Kuliner Batang" },
];

function sanitizeCount(value: number): number {
	return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Hitung total XP kontributor dari jumlah masing-masing jenis kontribusi.
 */
export function calculateContributorXp(counts: {
	places: number;
	reviews: number;
	photos: number;
	edits: number;
}): number {
	return (
		sanitizeCount(counts.places) * XP_REWARDS.place +
		sanitizeCount(counts.reviews) * XP_REWARDS.review +
		sanitizeCount(counts.photos) * XP_REWARDS.photo +
		sanitizeCount(counts.edits) * XP_REWARDS.edit
	);
}

/**
 * Tentukan level, gelar, progres, dan sisa XP ke tingkat berikutnya.
 */
export function getContributorLevel(xp: number): ContributorLevelInfo {
	const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;

	let currentIndex = 0;
	for (let i = 0; i < CONTRIBUTOR_LEVELS.length; i++) {
		if (safeXp >= CONTRIBUTOR_LEVELS[i].minXp) {
			currentIndex = i;
		}
	}

	const currentTier = CONTRIBUTOR_LEVELS[currentIndex];
	const nextTier = CONTRIBUTOR_LEVELS[currentIndex + 1] ?? null;

	if (!nextTier) {
		return {
			level: currentTier.level,
			title: currentTier.title,
			xp: safeXp,
			currentLevelMinXp: currentTier.minXp,
			nextLevelXp: null,
			nextLevelTitle: null,
			progressPercent: 100,
			xpToNext: 0,
		};
	}

	const span = nextTier.minXp - currentTier.minXp;
	const rawPercent = Math.round(((safeXp - currentTier.minXp) / span) * 100);
	const progressPercent = Math.min(100, Math.max(0, rawPercent));

	return {
		level: currentTier.level,
		title: currentTier.title,
		xp: safeXp,
		currentLevelMinXp: currentTier.minXp,
		nextLevelXp: nextTier.minXp,
		nextLevelTitle: nextTier.title,
		progressPercent,
		xpToNext: Math.max(0, nextTier.minXp - safeXp),
	};
}
