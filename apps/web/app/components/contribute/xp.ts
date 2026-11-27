export const XP_REWARDS = {
	place: 50,
	review: 25,
	photo: 15,
	edit: 10,
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
	{ level: 2, minXp: 50, title: "Penjelajah Aktif" },
	{ level: 3, minXp: 150, title: "Kurator Lokal" },
	{ level: 4, minXp: 300, title: "Pemandu Kuliner" },
	{ level: 5, minXp: 500, title: "Duta Kuliner Batang" },
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
