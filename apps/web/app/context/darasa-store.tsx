import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	DEMO_ACCOUNTS,
	INITIAL_CLAIMS,
	INITIAL_PLACES,
	INITIAL_REVIEWS,
} from "~/data/batang-places";
import {
	calculateExploreScore,
	calculateHiddenGemScore,
	computePlaceAnomalyFlags,
	getAverageRating,
	isHiddenGemEligible,
} from "~/lib/scoring";
import type {
	AnomalyFlag,
	AnomalyResolution,
	BatangDistrict,
	BusinessClaim,
	CulinaryPlace,
	OwnerReply,
	PlaceCategory,
	ReviewItem,
	UserAccount,
	VerificationStatus,
} from "~/lib/types";

export type ExploreSortOption = "explore" | "rating" | "reviews" | "newest";
export type ExploreViewMode = "grid" | "list";
export type ExploreMinRating = "all" | "4.0" | "4.5";
export type ExplorePriceTier = "all" | "budget" | "mid" | "premium";

export interface ExploreFilters {
	keyword: string;
	category: PlaceCategory | "all";
	district: BatangDistrict | "all";
	verification: VerificationStatus | "all";
	minRating: ExploreMinRating;
	priceTier: ExplorePriceTier;
	onlyHiddenGem: boolean;
	onlyBookmarked: boolean;
	sortBy: ExploreSortOption;
	viewMode: ExploreViewMode;
}

export const DEFAULT_EXPLORE_FILTERS: ExploreFilters = {
	keyword: "",
	category: "all",
	district: "all",
	verification: "all",
	minRating: "all",
	priceTier: "all",
	onlyHiddenGem: false,
	onlyBookmarked: false,
	sortBy: "explore",
	viewMode: "grid",
};

const STORAGE_KEY = "darasa_prototype_state_v1";

export interface ContributionActivity {
	id: string;
	userId: string;
	type: "place" | "review" | "photo" | "edit";
	placeId: string;
	placeName: string;
	summary: string;
	createdAt: string;
}

interface PersistedState {
	places: CulinaryPlace[];
	reviews: ReviewItem[];
	claims: BusinessClaim[];
	accounts: UserAccount[];
	currentUserId: string;
	anomalyOverrides: Record<string, AnomalyResolution>;
	bookmarkedPlaceIds: string[];
	contributions: ContributionActivity[];
}

export interface PlaceWithMetrics extends CulinaryPlace {
	reviews: ReviewItem[];
	averageRating: number;
	reviewCount: number;
	exploreScore: number;
	exploreBreakdown: ReturnType<typeof calculateExploreScore>;
	hiddenGemEligible: boolean;
	hiddenGemScore: number;
}

export interface ToastNotification {
	id: number;
	message: string;
	tone: "success" | "info";
}

interface DarasaContextValue {
	hydrated: boolean;
	currentUser: UserAccount;
	accounts: UserAccount[];
	places: PlaceWithMetrics[];
	claims: BusinessClaim[];
	anomalies: AnomalyFlag[];
	bookmarkedPlaceIds: string[];
	contributions: ContributionActivity[];
	toast: ToastNotification | null;
	exploreFilters: ExploreFilters;
	setExploreFilters: (
		updater:
			| Partial<ExploreFilters>
			| ((prev: ExploreFilters) => ExploreFilters),
	) => void;
	resetExploreFilters: () => void;
	isBookmarked: (placeId: string) => boolean;
	toggleBookmark: (placeId: string) => void;
	notify: (message: string, tone?: "success" | "info") => void;
	dismissToast: () => void;
	loginWithCredentials: (
		email: string,
		password: string,
	) => { ok: true; user: UserAccount } | { ok: false; error: string };
	registerAccount: (
		name: string,
		email: string,
		password: string,
	) => { ok: true; user: UserAccount } | { ok: false; error: string };
	switchDemoAccount: (userId: string) => void;
	logout: () => void;
	submitPlace: (
		input: Omit<
			CulinaryPlace,
			| "id"
			| "slug"
			| "verificationStatus"
			| "submittedByUserId"
			| "submittedByName"
			| "createdAt"
			| "isPendingModeration"
		>,
	) => CulinaryPlace;
	submitReview: (input: {
		placeId: string;
		rating: number;
		comment: string;
		photoUrl?: string;
	}) => ReviewItem;
	submitClaim: (input: {
		placeId: string;
		businessRole: string;
		whatsappNumber: string;
		evidenceSummary: string;
		evidenceFileName?: string;
	}) => BusinessClaim;
	reviewClaim: (
		claimId: string,
		decision: "approved" | "rejected",
		adminNote?: string,
	) => void;
	updatePlaceProfile: (
		placeId: string,
		updates: Partial<
			Pick<
				CulinaryPlace,
				| "name"
				| "address"
				| "openingHours"
				| "priceRange"
				| "phone"
				| "description"
				| "category"
				| "district"
			>
		>,
	) => void;
	addPlacePhoto: (placeId: string, photoUrl: string) => void;
	suggestPlaceUpdate: (
		placeId: string,
		updates: Partial<
			Pick<
				CulinaryPlace,
				"address" | "openingHours" | "priceRange" | "phone" | "description"
			>
		>,
		note?: string,
	) => void;
	replyToReview: (reviewId: string, message: string) => void;
	setPlaceVerification: (
		placeId: string,
		status: VerificationStatus,
		approvePending?: boolean,
	) => void;
	resolveAnomalyFlag: (flagId: string, resolution: AnomalyResolution) => void;
	resetPrototypeData: () => void;
}

const DarasaContext = createContext<DarasaContextValue | null>(null);

function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "kuliner-batang"
	);
}

const DEFAULT_STATE: PersistedState = {
	places: INITIAL_PLACES,
	reviews: INITIAL_REVIEWS,
	claims: INITIAL_CLAIMS,
	accounts: DEMO_ACCOUNTS,
	currentUserId: "usr-visitor",
	anomalyOverrides: {},
	bookmarkedPlaceIds: [],
	contributions: [],
};

export function DarasaProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
	const [hydrated, setHydrated] = useState(false);
	const [toast, setToast] = useState<ToastNotification | null>(null);
	const [exploreFilters, setExploreFiltersState] = useState<ExploreFilters>(
		DEFAULT_EXPLORE_FILTERS,
	);

	const setExploreFilters: DarasaContextValue["setExploreFilters"] =
		useCallback((updater) => {
			setExploreFiltersState((prev) =>
				typeof updater === "function" ? updater(prev) : { ...prev, ...updater },
			);
		}, []);

	const resetExploreFilters = useCallback(() => {
		setExploreFiltersState((prev) => ({
			...DEFAULT_EXPLORE_FILTERS,
			viewMode: prev.viewMode,
		}));
	}, []);

	const notify = useCallback(
		(message: string, tone: "success" | "info" = "success") => {
			setToast({ id: Date.now(), message, tone });
		},
		[],
	);

	const dismissToast = useCallback(() => {
		setToast(null);
	}, []);

	useEffect(() => {
		if (!toast) return;
		const timer = window.setTimeout(() => setToast(null), 4200);
		return () => window.clearTimeout(timer);
	}, [toast]);

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<PersistedState>;
				if (Array.isArray(parsed.places) && Array.isArray(parsed.reviews)) {
					setState({
						places: parsed.places,
						reviews: parsed.reviews,
						claims: Array.isArray(parsed.claims)
							? parsed.claims
							: INITIAL_CLAIMS,
						accounts: Array.isArray(parsed.accounts)
							? parsed.accounts
							: DEMO_ACCOUNTS,
						currentUserId:
							typeof parsed.currentUserId === "string"
								? parsed.currentUserId
								: "usr-visitor",
						anomalyOverrides: parsed.anomalyOverrides ?? {},
						bookmarkedPlaceIds: Array.isArray(parsed.bookmarkedPlaceIds)
							? parsed.bookmarkedPlaceIds
							: [],
						contributions: Array.isArray(parsed.contributions)
							? parsed.contributions
							: [],
					});
				}
			}
		} catch {
			// Ignore malformed storage and retain deterministic seed data
		} finally {
			setHydrated(true);
		}
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Ignore quota errors in restricted browsers
		}
	}, [state, hydrated]);

	const currentUser = useMemo(() => {
		return (
			state.accounts.find((acc) => acc.id === state.currentUserId) ??
			state.accounts[0] ??
			DEMO_ACCOUNTS[0]
		);
	}, [state.accounts, state.currentUserId]);

	const reviewsByPlace = useMemo(() => {
		const grouped: Record<string, ReviewItem[]> = {};
		for (const review of state.reviews) {
			if (!grouped[review.placeId]) grouped[review.placeId] = [];
			grouped[review.placeId].push(review);
		}
		for (const key of Object.keys(grouped)) {
			grouped[key].sort(
				(a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
			);
		}
		return grouped;
	}, [state.reviews]);

	const places = useMemo<PlaceWithMetrics[]>(() => {
		return state.places.map((place) => {
			const placeReviews = reviewsByPlace[place.id] ?? [];
			const averageRating = getAverageRating(placeReviews);
			const reviewCount = placeReviews.length;
			const exploreBreakdown = calculateExploreScore(place, placeReviews);
			const hiddenGemEligible = isHiddenGemEligible(averageRating);
			const hiddenGemScore = calculateHiddenGemScore(
				averageRating,
				reviewCount,
			);

			return {
				...place,
				reviews: placeReviews,
				averageRating,
				reviewCount,
				exploreScore: exploreBreakdown.totalScore,
				exploreBreakdown,
				hiddenGemEligible,
				hiddenGemScore,
			};
		});
	}, [state.places, reviewsByPlace]);

	const anomalies = useMemo<AnomalyFlag[]>(() => {
		return computePlaceAnomalyFlags(state.places, reviewsByPlace).map(
			(flag) => ({
				...flag,
				resolution: state.anomalyOverrides[flag.id] ?? flag.resolution,
			}),
		);
	}, [state.places, reviewsByPlace, state.anomalyOverrides]);

	const loginWithCredentials = useCallback(
		(email: string, password: string) => {
			const cleanEmail = email.trim().toLowerCase();
			if (!cleanEmail || !password || password.length < 6) {
				return {
					ok: false as const,
					error: "Masukkan email valid dan kata sandi minimal 6 karakter.",
				};
			}
			const found = state.accounts.find(
				(acc) =>
					acc.email.toLowerCase() === cleanEmail && acc.role !== "visitor",
			);
			if (!found) {
				return {
					ok: false as const,
					error:
						"Akun tidak ditemukan. Gunakan akun prototipe atau daftar akun baru terlebih dahulu.",
				};
			}
			setState((prev) => ({ ...prev, currentUserId: found.id }));
			return { ok: true as const, user: found };
		},
		[state.accounts],
	);

	const registerAccount = useCallback(
		(name: string, email: string, password: string) => {
			const cleanName = name.trim();
			const cleanEmail = email.trim().toLowerCase();
			if (cleanName.length < 2) {
				return {
					ok: false as const,
					error: "Nama lengkap minimal 2 karakter.",
				};
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
				return { ok: false as const, error: "Format email tidak valid." };
			}
			if (password.length < 6) {
				return {
					ok: false as const,
					error: "Kata sandi minimal 6 karakter.",
				};
			}
			const exists = state.accounts.some(
				(acc) => acc.email.toLowerCase() === cleanEmail,
			);
			if (exists) {
				return {
					ok: false as const,
					error: "Email tersebut sudah terdaftar di Darasa.",
				};
			}
			const newAccount: UserAccount = {
				id: `usr-${Date.now()}`,
				name: cleanName,
				email: cleanEmail,
				role: "user",
			};
			setState((prev) => ({
				...prev,
				accounts: [...prev.accounts, newAccount],
				currentUserId: newAccount.id,
			}));
			return { ok: true as const, user: newAccount };
		},
		[state.accounts],
	);

	const switchDemoAccount = useCallback((userId: string) => {
		setState((prev) => ({ ...prev, currentUserId: userId }));
	}, []);

	const logout = useCallback(() => {
		setState((prev) => ({ ...prev, currentUserId: "usr-visitor" }));
	}, []);

	const submitPlace: DarasaContextValue["submitPlace"] = useCallback(
		(input) => {
			const id = `plc-${Date.now()}`;
			const baseSlug = slugify(input.name);
			const newPlace: CulinaryPlace = {
				...input,
				id,
				slug: `${baseSlug}-${id.slice(-4)}`,
				photos:
					input.photos.length > 0
						? input.photos
						: ["/images/megono-batang.svg"],
				verificationStatus: "unverified",
				submittedByUserId: currentUser.id,
				submittedByName: currentUser.name,
				createdAt: new Date().toISOString(),
				isPendingModeration: true,
				isPrototypeSample: false,
			};
			setState((prev) => ({
				...prev,
				places: [newPlace, ...prev.places],
			}));
			notify(`Tempat "${newPlace.name}" berhasil ditambahkan ke direktori!`);
			return newPlace;
		},
		[currentUser, notify],
	);

	const submitReview: DarasaContextValue["submitReview"] = useCallback(
		({ placeId, rating, comment, photoUrl }) => {
			const newReview: ReviewItem = {
				id: `rev-${Date.now()}`,
				placeId,
				userId: currentUser.id,
				authorName: currentUser.name,
				rating,
				comment: comment.trim(),
				photoUrl: photoUrl || undefined,
				createdAt: new Date().toISOString(),
			};
			setState((prev) => {
				const nextPlaces =
					photoUrl && photoUrl.length > 0
						? prev.places.map((p) =>
								p.id === placeId && !p.photos.includes(photoUrl)
									? { ...p, photos: [...p.photos, photoUrl] }
									: p,
							)
						: prev.places;
				return {
					...prev,
					places: nextPlaces,
					reviews: [newReview, ...prev.reviews],
				};
			});
			notify("Ulasan dan rating Anda berhasil disimpan.");
			return newReview;
		},
		[currentUser, notify],
	);

	const submitClaim: DarasaContextValue["submitClaim"] = useCallback(
		({
			placeId,
			businessRole,
			whatsappNumber,
			evidenceSummary,
			evidenceFileName,
		}) => {
			const targetPlace = state.places.find((p) => p.id === placeId);
			const claim: BusinessClaim = {
				id: `clm-${Date.now()}`,
				placeId,
				placeName: targetPlace?.name ?? "Tempat Kuliner Batang",
				claimantUserId: currentUser.id,
				claimantName: currentUser.name,
				claimantEmail: currentUser.email,
				businessRole: businessRole.trim(),
				whatsappNumber: whatsappNumber.trim(),
				evidenceSummary: evidenceSummary.trim(),
				evidenceFileName: evidenceFileName || undefined,
				status: "pending",
				submittedAt: new Date().toISOString(),
			};
			setState((prev) => ({
				...prev,
				claims: [claim, ...prev.claims],
			}));
			notify(`Pengajuan klaim "${claim.placeName}" berhasil dikirim.`);
			return claim;
		},
		[currentUser, state.places, notify],
	);

	const reviewClaim = useCallback(
		(
			claimId: string,
			decision: "approved" | "rejected",
			adminNote?: string,
		) => {
			setState((prev) => {
				const targetClaim = prev.claims.find((c) => c.id === claimId);
				if (!targetClaim) return prev;

				const nextClaims = prev.claims.map((c) =>
					c.id === claimId
						? {
								...c,
								status: decision,
								adminNote: adminNote?.trim() || c.adminNote,
								reviewedAt: new Date().toISOString(),
							}
						: c,
				);

				let nextPlaces = prev.places;
				let nextAccounts = prev.accounts;

				if (decision === "approved") {
					nextPlaces = prev.places.map((p) =>
						p.id === targetClaim.placeId
							? {
									...p,
									verificationStatus: "owner_verified",
									ownerId: targetClaim.claimantUserId,
									isPendingModeration: false,
								}
							: p,
					);

					nextAccounts = prev.accounts.map((acc) =>
						acc.id === targetClaim.claimantUserId
							? {
									...acc,
									role: acc.role === "admin" ? "admin" : "owner",
									claimedPlaceId: targetClaim.placeId,
								}
							: acc,
					);
				}

				return {
					...prev,
					claims: nextClaims,
					places: nextPlaces,
					accounts: nextAccounts,
				};
			});
			notify(
				decision === "approved"
					? "Klaim profil usaha telah disetujui."
					: "Klaim profil usaha telah ditolak.",
				decision === "approved" ? "success" : "info",
			);
		},
		[notify],
	);

	const updatePlaceProfile: DarasaContextValue["updatePlaceProfile"] =
		useCallback(
			(placeId, updates) => {
				setState((prev) => ({
					...prev,
					places: prev.places.map((p) =>
						p.id === placeId ? { ...p, ...updates } : p,
					),
				}));
				notify("Profil usaha berhasil diperbarui.");
			},
			[notify],
		);

	const addPlacePhoto = useCallback(
		(placeId: string, photoUrl: string) => {
			if (!photoUrl) return;
			const targetPlace = state.places.find((p) => p.id === placeId);
			if (!targetPlace) return;
			const activity: ContributionActivity = {
				id: `ctb-${Date.now()}`,
				userId: currentUser.id,
				type: "photo",
				placeId,
				placeName: targetPlace.name,
				summary: "Menambahkan foto kuliner baru",
				createdAt: new Date().toISOString(),
			};
			setState((prev) => ({
				...prev,
				places: prev.places.map((p) =>
					p.id === placeId && !p.photos.includes(photoUrl)
						? { ...p, photos: [photoUrl, ...p.photos] }
						: p,
				),
				contributions: [activity, ...prev.contributions],
			}));
			notify(`Foto untuk "${targetPlace.name}" berhasil ditambahkan.`);
		},
		[currentUser.id, notify, state.places],
	);

	const suggestPlaceUpdate: DarasaContextValue["suggestPlaceUpdate"] =
		useCallback(
			(placeId, updates, note) => {
				const targetPlace = state.places.find((p) => p.id === placeId);
				if (!targetPlace) return;
				const activity: ContributionActivity = {
					id: `ctb-${Date.now()}`,
					userId: currentUser.id,
					type: "edit",
					placeId,
					placeName: targetPlace.name,
					summary:
						note?.trim() || "Memperbarui informasi operasional tempat kuliner",
					createdAt: new Date().toISOString(),
				};
				setState((prev) => ({
					...prev,
					places: prev.places.map((p) =>
						p.id === placeId ? { ...p, ...updates } : p,
					),
					contributions: [activity, ...prev.contributions],
				}));
				notify(`Pembaruan info untuk "${targetPlace.name}" berhasil disimpan.`);
			},
			[currentUser.id, notify, state.places],
		);

	const replyToReview = useCallback(
		(reviewId: string, message: string) => {
			const cleanMessage = message.trim();
			if (!cleanMessage) return;
			const reply: OwnerReply = {
				id: `rep-${Date.now()}`,
				authorName: `${currentUser.name} (Pemilik)`,
				message: cleanMessage,
				createdAt: new Date().toISOString(),
			};
			setState((prev) => ({
				...prev,
				reviews: prev.reviews.map((r) =>
					r.id === reviewId ? { ...r, ownerReply: reply } : r,
				),
			}));
			notify("Balasan ulasan berhasil dikirim.");
		},
		[currentUser.name, notify],
	);

	const setPlaceVerification = useCallback(
		(placeId: string, status: VerificationStatus, approvePending = true) => {
			setState((prev) => ({
				...prev,
				places: prev.places.map((p) =>
					p.id === placeId
						? {
								...p,
								verificationStatus: status,
								isPendingModeration: approvePending
									? false
									: p.isPendingModeration,
							}
						: p,
				),
			}));
			notify("Status verifikasi tempat diperbarui.");
		},
		[notify],
	);

	const resolveAnomalyFlag = useCallback(
		(flagId: string, resolution: AnomalyResolution) => {
			setState((prev) => ({
				...prev,
				anomalyOverrides: {
					...prev.anomalyOverrides,
					[flagId]: resolution,
				},
			}));
			notify("Status peninjauan anomali Z-Score disimpan.", "info");
		},
		[notify],
	);

	const resetPrototypeData = useCallback(() => {
		setState(DEFAULT_STATE);
		try {
			window.localStorage.removeItem(STORAGE_KEY);
		} catch {
			// Ignore
		}
		notify("Data prototipe dikembalikan ke kondisi awal.", "info");
	}, [notify]);

	const isBookmarked = useCallback(
		(placeId: string) => state.bookmarkedPlaceIds.includes(placeId),
		[state.bookmarkedPlaceIds],
	);

	const toggleBookmark = useCallback(
		(placeId: string) => {
			const alreadySaved = state.bookmarkedPlaceIds.includes(placeId);
			setState((prev) => {
				const exists = prev.bookmarkedPlaceIds.includes(placeId);
				return {
					...prev,
					bookmarkedPlaceIds: exists
						? prev.bookmarkedPlaceIds.filter((id) => id !== placeId)
						: [placeId, ...prev.bookmarkedPlaceIds],
				};
			});
			notify(
				alreadySaved
					? "Tempat dihapus dari Bookmark."
					: "Tempat disimpan ke Bookmark.",
				alreadySaved ? "info" : "success",
			);
		},
		[state.bookmarkedPlaceIds, notify],
	);

	const value = useMemo<DarasaContextValue>(
		() => ({
			hydrated,
			currentUser,
			accounts: state.accounts,
			places,
			claims: state.claims,
			anomalies,
			bookmarkedPlaceIds: state.bookmarkedPlaceIds,
			contributions: state.contributions,
			toast,
			exploreFilters,
			setExploreFilters,
			resetExploreFilters,
			isBookmarked,
			toggleBookmark,
			notify,
			dismissToast,
			loginWithCredentials,
			registerAccount,
			switchDemoAccount,
			logout,
			submitPlace,
			submitReview,
			submitClaim,
			reviewClaim,
			updatePlaceProfile,
			addPlacePhoto,
			suggestPlaceUpdate,
			replyToReview,
			setPlaceVerification,
			resolveAnomalyFlag,
			resetPrototypeData,
		}),
		[
			hydrated,
			currentUser,
			state.accounts,
			places,
			state.claims,
			anomalies,
			state.bookmarkedPlaceIds,
			state.contributions,
			toast,
			exploreFilters,
			setExploreFilters,
			resetExploreFilters,
			isBookmarked,
			toggleBookmark,
			notify,
			dismissToast,
			loginWithCredentials,
			registerAccount,
			switchDemoAccount,
			logout,
			submitPlace,
			submitReview,
			submitClaim,
			reviewClaim,
			updatePlaceProfile,
			addPlacePhoto,
			suggestPlaceUpdate,
			replyToReview,
			setPlaceVerification,
			resolveAnomalyFlag,
			resetPrototypeData,
		],
	);

	return (
		<DarasaContext.Provider value={value}>{children}</DarasaContext.Provider>
	);
}

export function useDarasa() {
	const ctx = useContext(DarasaContext);
	if (!ctx) {
		throw new Error("useDarasa must be used inside DarasaProvider");
	}
	return ctx;
}
