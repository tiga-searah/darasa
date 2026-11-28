export type UserRole = "visitor" | "user" | "owner" | "admin";

export type VerificationStatus =
	| "unverified"
	| "community_verified"
	| "owner_verified";

export type PlaceCategory =
	| "Makanan berat"
	| "Minuman"
	| "Street food"
	| "Dessert";

export type BatangDistrict =
	| "Batang Kota"
	| "KITB / Gringsing"
	| "Sigandu & Klidang"
	| "Bandar"
	| "Limpung"
	| "Subah"
	| "Tulis";

export interface UserAccount {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	claimedPlaceId?: string;
}

export interface OwnerReply {
	id: string;
	authorName: string;
	message: string;
	createdAt: string;
}

export interface ReviewItem {
	id: string;
	placeId: string;
	userId: string;
	authorName: string;
	rating: number;
	comment: string;
	photoUrl?: string;
	createdAt: string;
	ownerReply?: OwnerReply;
}

export interface CulinaryPlace {
	id: string;
	slug: string;
	name: string;
	category: PlaceCategory;
	district: BatangDistrict;
	address: string;
	lat: number;
	lng: number;
	openingHours: string;
	priceRange: string;
	phone?: string;
	description: string;
	photos: string[];
	views: number;
	verificationStatus: VerificationStatus;
	ownerId?: string;
	submittedByUserId: string;
	submittedByName: string;
	createdAt: string;
	isPendingModeration?: boolean;
	isPrototypeSample?: boolean;
	legalityDocumentName?: string;
	legalityDocumentUrl?: string;
}

export type ClaimStatus = "pending" | "approved" | "rejected";

export interface BusinessClaim {
	id: string;
	placeId: string;
	placeName: string;
	claimantUserId: string;
	claimantName: string;
	claimantEmail: string;
	businessRole: string;
	whatsappNumber: string;
	evidenceSummary: string;
	evidenceFileName?: string;
	evidenceFileUrl?: string;
	status: ClaimStatus;
	adminNote?: string;
	submittedAt: string;
	reviewedAt?: string;
}

export type AnomalyResolution = "open" | "cleared" | "flagged_hold";

export interface AnomalyFlag {
	id: string;
	placeId: string;
	placeName: string;
	reviewId?: string;
	zScore: number;
	reason: string;
	detectedAt: string;
	resolution: AnomalyResolution;
}
