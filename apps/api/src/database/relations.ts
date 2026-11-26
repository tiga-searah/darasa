import { defineRelations } from "drizzle-orm";
import { schema } from "./schema";

export const relations = defineRelations(schema, (r) => ({
	users: {
		sessions: r.many.sessions({ from: r.users.id, to: r.sessions.userId }),
		oauthAccounts: r.many.oauthAccounts({
			from: r.users.id,
			to: r.oauthAccounts.userId,
		}),
		media: r.many.media({ from: r.users.id, to: r.media.ownerId }),
		places: r.many.places({ from: r.users.id, to: r.places.createdById }),
		reviews: r.many.reviews({ from: r.users.id, to: r.reviews.userId }),
		claims: r.many.businessClaims({
			from: r.users.id,
			to: r.businessClaims.claimantId,
		}),
	},
	sessions: {
		user: r.one.users({ from: r.sessions.userId, to: r.users.id }),
	},
	oauthAccounts: {
		user: r.one.users({ from: r.oauthAccounts.userId, to: r.users.id }),
	},
	media: {
		owner: r.one.users({ from: r.media.ownerId, to: r.users.id }),
	},
	categories: {
		places: r.many.places({ from: r.categories.id, to: r.places.categoryId }),
	},
	places: {
		category: r.one.categories({
			from: r.places.categoryId,
			to: r.categories.id,
		}),
		createdBy: r.one.users({ from: r.places.createdById, to: r.users.id }),
		coverMedia: r.one.media({
			from: r.places.coverMediaId,
			to: r.media.id,
		}),
		photos: r.many.placePhotos({
			from: r.places.id,
			to: r.placePhotos.placeId,
		}),
		reviews: r.many.reviews({ from: r.places.id, to: r.reviews.placeId }),
		claims: r.many.businessClaims({
			from: r.places.id,
			to: r.businessClaims.placeId,
		}),
		anomalyFlags: r.many.anomalyFlags({
			from: r.places.id,
			to: r.anomalyFlags.placeId,
		}),
		stats: r.many.placeStats({ from: r.places.id, to: r.placeStats.placeId }),
	},
	placePhotos: {
		place: r.one.places({ from: r.placePhotos.placeId, to: r.places.id }),
		media: r.one.media({ from: r.placePhotos.mediaId, to: r.media.id }),
		uploadedBy: r.one.users({
			from: r.placePhotos.uploadedById,
			to: r.users.id,
		}),
	},
	reviews: {
		place: r.one.places({ from: r.reviews.placeId, to: r.places.id }),
		user: r.one.users({ from: r.reviews.userId, to: r.users.id }),
		photos: r.many.reviewPhotos({
			from: r.reviews.id,
			to: r.reviewPhotos.reviewId,
		}),
		ownerReply: r.one.ownerReplies({
			from: r.reviews.id,
			to: r.ownerReplies.reviewId,
		}),
		anomalyFlags: r.many.anomalyFlags({
			from: r.reviews.id,
			to: r.anomalyFlags.reviewId,
		}),
	},
	reviewPhotos: {
		review: r.one.reviews({ from: r.reviewPhotos.reviewId, to: r.reviews.id }),
		media: r.one.media({ from: r.reviewPhotos.mediaId, to: r.media.id }),
	},
	ownerReplies: {
		review: r.one.reviews({ from: r.ownerReplies.reviewId, to: r.reviews.id }),
		place: r.one.places({ from: r.ownerReplies.placeId, to: r.places.id }),
		author: r.one.users({ from: r.ownerReplies.authorId, to: r.users.id }),
	},
	businessClaims: {
		place: r.one.places({ from: r.businessClaims.placeId, to: r.places.id }),
		claimant: r.one.users({
			from: r.businessClaims.claimantId,
			to: r.users.id,
		}),
		reviewedBy: r.one.users({
			from: r.businessClaims.reviewedById,
			to: r.users.id,
		}),
	},
	anomalyFlags: {
		place: r.one.places({ from: r.anomalyFlags.placeId, to: r.places.id }),
		review: r.one.reviews({ from: r.anomalyFlags.reviewId, to: r.reviews.id }),
		user: r.one.users({ from: r.anomalyFlags.userId, to: r.users.id }),
		resolvedBy: r.one.users({
			from: r.anomalyFlags.resolvedById,
			to: r.users.id,
		}),
	},
	placeStats: {
		place: r.one.places({ from: r.placeStats.placeId, to: r.places.id }),
	},
}));
