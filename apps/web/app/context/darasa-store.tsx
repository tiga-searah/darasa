import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { DEMO_ACCOUNTS } from "~/data/batang-places";
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
	BusinessClaim,
	CulinaryPlace,
	OwnerReply,
	ReviewItem,
	UserAccount,
	VerificationStatus,
} from "~/lib/types";
import {
	clearPersistedState,
	DEFAULT_STATE,
	getDeterministicBaseLikes,
	loadPersistedState,
	savePersistedState,
	slugify,
} from "./darasa-storage";
import {
	type ContributionActivity,
	type DarasaContextValue,
	DEFAULT_EXPLORE_FILTERS,
	type ExploreFilters,
	type PersistedState,
	type PlaceWithMetrics,
	type ToastNotification,
} from "./darasa-types";

export {
	type ContributionActivity,
	type DarasaContextValue,
	DEFAULT_EXPLORE_FILTERS,
	type ExploreFilters,
	type ExploreMinRating,
	type ExplorePriceTier,
	type ExploreSortOption,
	type ExploreViewMode,
	type PlaceWithMetrics,
	type ToastNotification,
} from "./darasa-types";

const DarasaContext = createContext<DarasaContextValue | null>(null);

function normalizeViews(views: number | undefined): number {
	return typeof views === "number" && Number.isFinite(views) && views >= 0
		? views
		: 0;
}

function toggleIdInList(list: string[], id: string): string[] {
	return list.includes(id) ? list.filter((item) => item !== id) : [id, ...list];
}

function promoteUserToOwner(
	accounts: UserAccount[],
	userId: string,
	placeId: string,
): UserAccount[] {
	return accounts.map((acc) =>
		acc.id === userId
			? {
					...acc,
					role: acc.role === "admin" ? ("admin" as const) : ("owner" as const),
					claimedPlaceId: placeId,
				}
			: acc,
	);
}

function buildContributionActivity(
	userId: string,
	type: ContributionActivity["type"],
	placeId: string,
	placeName: string,
	summary: string,
): ContributionActivity {
	return {
		id: `ctb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		userId,
		type,
		placeId,
		placeName,
		summary,
		createdAt: new Date().toISOString(),
	};
}

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
		const loaded = loadPersistedState();
		if (loaded) {
			setState(loaded);
		}
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		savePersistedState(state);
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
			const views = normalizeViews(place.views);
			const exploreBreakdown = calculateExploreScore(place, placeReviews);
			const hiddenGemEligible = isHiddenGemEligible(
				averageRating,
				placeReviews,
			);
			const hiddenGemScore = calculateHiddenGemScore(
				averageRating,
				placeReviews,
				views,
			);

			return {
				...place,
				views,
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

	const loginWithGoogle: DarasaContextValue["loginWithGoogle"] = useCallback(
		({ name, email, accountId }) => {
			if (accountId) {
				const target = state.accounts.find((acc) => acc.id === accountId);
				if (target) {
					setState((prev) => ({ ...prev, currentUserId: target.id }));
					notify(`Masuk dengan Google sebagai ${target.name}.`);
					return target;
				}
			}

			const cleanEmail = email.trim().toLowerCase();
			const existing = state.accounts.find(
				(acc) =>
					acc.email.toLowerCase() === cleanEmail && acc.role !== "visitor",
			);
			if (existing) {
				setState((prev) => ({ ...prev, currentUserId: existing.id }));
				notify(`Masuk dengan Google sebagai ${existing.name}.`);
				return existing;
			}

			const newAccount: UserAccount = {
				id: `usr-google-${Date.now()}`,
				name: name.trim() || cleanEmail.split("@")[0] || "Pengguna Google",
				email: cleanEmail,
				role: "user",
			};
			setState((prev) => ({
				...prev,
				accounts: [...prev.accounts, newAccount],
				currentUserId: newAccount.id,
			}));
			notify(`Berhasil masuk dengan Google (${newAccount.email}).`);
			return newAccount;
		},
		[notify, state.accounts],
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
			const newPlace: CulinaryPlace = {
				...input,
				id,
				slug: `${slugify(input.name)}-${id.slice(-4)}`,
				photos:
					input.photos.length > 0
						? input.photos
						: ["/images/megono-batang.svg"],
				views: 0,
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
			notify(
				newPlace.legalityDocumentName
					? `Tempat "${newPlace.name}" beserta surat legalitas dikirim untuk verifikasi admin.`
					: `Tempat "${newPlace.name}" berhasil ditambahkan ke direktori!`,
			);
			return newPlace;
		},
		[currentUser, notify],
	);

	const recordPlaceView = useCallback((placeId: string) => {
		setState((prev) => ({
			...prev,
			places: prev.places.map((p) =>
				p.id === placeId ? { ...p, views: normalizeViews(p.views) + 1 } : p,
			),
		}));
	}, []);

	const submitReview: DarasaContextValue["submitReview"] = useCallback(
		({ placeId, rating, comment }) => {
			const existingReview = state.reviews.find(
				(r) => r.placeId === placeId && r.userId === currentUser.id,
			);
			if (existingReview) {
				notify(
					"Anda sudah menulis ulasan untuk tempat ini (maksimal 1 ulasan).",
					"info",
				);
				return existingReview;
			}
			const newReview: ReviewItem = {
				id: `rev-${Date.now()}`,
				placeId,
				userId: currentUser.id,
				authorName: currentUser.name,
				rating,
				comment: comment.trim(),
				createdAt: new Date().toISOString(),
			};
			setState((prev) => {
				if (
					prev.reviews.some(
						(r) => r.placeId === placeId && r.userId === currentUser.id,
					)
				) {
					return prev;
				}
				return {
					...prev,
					reviews: [newReview, ...prev.reviews],
				};
			});
			notify("Ulasan dan rating Anda berhasil disimpan.");
			return newReview;
		},
		[currentUser, notify, state.reviews],
	);

	const deleteReview = useCallback(
		(reviewId: string) => {
			const target = state.reviews.find((r) => r.id === reviewId);
			if (!target) return;
			if (target.userId !== currentUser.id && currentUser.role !== "admin") {
				return;
			}
			setState((prev) => {
				const existing = prev.reviews.find((r) => r.id === reviewId);
				if (!existing) return prev;
				if (
					existing.userId !== currentUser.id &&
					currentUser.role !== "admin"
				) {
					return prev;
				}
				return {
					...prev,
					reviews: prev.reviews.filter((r) => r.id !== reviewId),
					likedReviewIds: prev.likedReviewIds.filter((id) => id !== reviewId),
				};
			});
			notify("Ulasan berhasil dihapus.", "info");
		},
		[currentUser.id, currentUser.role, notify, state.reviews],
	);

	const submitClaim: DarasaContextValue["submitClaim"] = useCallback(
		({
			placeId,
			businessRole,
			whatsappNumber,
			evidenceSummary,
			evidenceFileName,
			evidenceFileUrl,
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
				evidenceFileName: evidenceFileName.trim() || undefined,
				evidenceFileUrl: evidenceFileUrl || undefined,
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

					nextAccounts = promoteUserToOwner(
						prev.accounts,
						targetClaim.claimantUserId,
						targetClaim.placeId,
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
			if (!targetPlace || targetPlace.photos.includes(photoUrl)) return;
			const activity = buildContributionActivity(
				currentUser.id,
				"photo",
				placeId,
				targetPlace.name,
				"Menambahkan foto kuliner baru",
			);
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
				const activity = buildContributionActivity(
					currentUser.id,
					"edit",
					placeId,
					targetPlace.name,
					note?.trim() || "Memperbarui informasi operasional tempat kuliner",
				);
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
			setState((prev) => {
				const targetPlace = prev.places.find((p) => p.id === placeId);
				if (!targetPlace) return prev;

				const promotedOwnerId =
					status === "owner_verified"
						? (targetPlace.ownerId ??
							(targetPlace.submittedByUserId !== "usr-visitor"
								? targetPlace.submittedByUserId
								: undefined))
						: targetPlace.ownerId;

				const nextPlaces = prev.places.map((p) =>
					p.id === placeId
						? {
								...p,
								verificationStatus: status,
								ownerId: promotedOwnerId,
								isPendingModeration: approvePending
									? false
									: p.isPendingModeration,
							}
						: p,
				);

				const nextAccounts =
					status === "owner_verified" && promotedOwnerId
						? promoteUserToOwner(prev.accounts, promotedOwnerId, placeId)
						: prev.accounts;

				return {
					...prev,
					places: nextPlaces,
					accounts: nextAccounts,
				};
			});
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
		clearPersistedState();
		notify("Data prototipe dikembalikan ke kondisi awal.", "info");
	}, [notify]);

	const isBookmarked = useCallback(
		(placeId: string) => state.bookmarkedPlaceIds.includes(placeId),
		[state.bookmarkedPlaceIds],
	);

	const toggleBookmark = useCallback(
		(placeId: string) => {
			const alreadySaved = state.bookmarkedPlaceIds.includes(placeId);
			setState((prev) => ({
				...prev,
				bookmarkedPlaceIds: toggleIdInList(prev.bookmarkedPlaceIds, placeId),
			}));
			notify(
				alreadySaved
					? "Tempat dihapus dari Bookmark."
					: "Tempat disimpan ke Bookmark.",
				alreadySaved ? "info" : "success",
			);
		},
		[state.bookmarkedPlaceIds, notify],
	);

	const isReviewLiked = useCallback(
		(reviewId: string) => state.likedReviewIds.includes(reviewId),
		[state.likedReviewIds],
	);

	const toggleReviewLike = useCallback((reviewId: string) => {
		setState((prev) => ({
			...prev,
			likedReviewIds: toggleIdInList(prev.likedReviewIds, reviewId),
		}));
	}, []);

	const getReviewLikeCount = useCallback(
		(reviewId: string) =>
			getDeterministicBaseLikes(reviewId) +
			(state.likedReviewIds.includes(reviewId) ? 1 : 0),
		[state.likedReviewIds],
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
			isReviewLiked,
			toggleReviewLike,
			getReviewLikeCount,
			notify,
			dismissToast,
			loginWithCredentials,
			loginWithGoogle,
			registerAccount,
			switchDemoAccount,
			logout,
			submitPlace,
			recordPlaceView,
			submitReview,
			deleteReview,
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
			isReviewLiked,
			toggleReviewLike,
			getReviewLikeCount,
			notify,
			dismissToast,
			loginWithCredentials,
			loginWithGoogle,
			registerAccount,
			switchDemoAccount,
			logout,
			submitPlace,
			recordPlaceView,
			submitReview,
			deleteReview,
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
