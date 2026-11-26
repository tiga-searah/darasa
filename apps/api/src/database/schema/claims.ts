import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { users } from "./auth";
import { claimStatus } from "./enums";
import { places } from "./places";

export type ClaimEvidence = {
	/** Free-text proof: business registration no., NIB, social handle, etc. */
	note: string;
	/** media ids with purpose='claim_document', private bucket. */
	documentMediaIds: string[];
	contactPhone: string;
};

export const businessClaims = pgTable(
	"business_claims",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		placeId: uuid("place_id")
			.notNull()
			.references(() => places.id, { onDelete: "cascade" }),
		claimantId: uuid("claimant_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		status: claimStatus("status").notNull().default("pending"),
		evidence: jsonb("evidence").$type<ClaimEvidence>().notNull(),
		reviewedById: uuid("reviewed_by_id").references(() => users.id, {
			onDelete: "set null",
		}),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		decisionNote: text("decision_note"),
		...timestamps(),
	},
	(t) => [
		// At most one live claim per place; rejected claims free the slot.
		uniqueIndex("business_claims_active_place_uq")
			.on(t.placeId)
			.where(sql`${t.status} in ('pending', 'approved')`),
		index("business_claims_status_idx").on(t.status, t.createdAt),
		index("business_claims_claimant_idx").on(t.claimantId),
	],
);
