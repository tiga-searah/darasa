import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "owner", "admin"]);

export const placeStatus = pgEnum("place_status", [
	"pending",
	"published",
	"rejected",
	"archived",
]);

export const reviewStatus = pgEnum("review_status", [
	"published",
	"hidden",
	"removed",
]);

export const claimStatus = pgEnum("claim_status", [
	"pending",
	"approved",
	"rejected",
]);

export const anomalyKind = pgEnum("anomaly_kind", [
	"rating_outlier",
	"review_burst",
]);

export const anomalyStatus = pgEnum("anomaly_status", [
	"open",
	"dismissed",
	"confirmed",
]);

export const oauthProvider = pgEnum("oauth_provider", ["google"]);

/** Where a media row is allowed to be attached. */
export const mediaPurpose = pgEnum("media_purpose", [
	"place_photo",
	"review_photo",
	"claim_document",
]);

/** pending = signed URL issued, not yet verified; ready = sniffed + copied. */
export const mediaStatus = pgEnum("media_status", ["pending", "ready"]);

export const contributionAction = pgEnum("contribution_action", [
	"add_place",
	"write_review",
	"add_photo",
	"update_info",
]);
