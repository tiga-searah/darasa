import { t } from "elysia";

export const ClaimEvidenceSchema = t.Object({
	note: t.String({ minLength: 1, maxLength: 2000 }),
	documentMediaIds: t.Array(t.String({ format: "uuid" }), {
		maxItems: 5,
		uniqueItems: true,
	}),
	contactPhone: t.String({ minLength: 1, maxLength: 40 }),
	businessRole: t.Optional(t.String({ maxLength: 100 })),
});

export const SubmitClaimBody = t.Object({
	evidence: ClaimEvidenceSchema,
});

export const AdminClaimsQuery = t.Object({
	status: t.Optional(
		t.Union([
			t.Literal("pending"),
			t.Literal("approved"),
			t.Literal("rejected"),
		]),
	),
	page: t.Optional(t.Integer({ minimum: 1 })),
	limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
});

export const ApproveClaimBody = t.Object({
	note: t.Optional(t.String({ maxLength: 500 })),
});

export const RejectClaimBody = t.Object({
	note: t.Optional(t.String({ maxLength: 500 })),
});

export const ClaimStatusSchema = t.Union([
	t.Literal("pending"),
	t.Literal("approved"),
	t.Literal("rejected"),
]);

export const ClaimItem = t.Object({
	id: t.String(),
	placeId: t.String(),
	claimantId: t.String(),
	status: ClaimStatusSchema,
	evidence: ClaimEvidenceSchema,
	reviewedById: t.Nullable(t.String()),
	reviewedAt: t.Nullable(t.Date()),
	decisionNote: t.Nullable(t.String()),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export const ClaimResponse = t.Object({
	data: ClaimItem,
});

export const MyClaimItem = t.Object({
	id: t.String(),
	placeId: t.String(),
	placeName: t.String(),
	claimantName: t.String(),
	status: ClaimStatusSchema,
	evidence: ClaimEvidenceSchema,
	decisionNote: t.Nullable(t.String()),
	reviewedAt: t.Nullable(t.Date()),
	createdAt: t.Date(),
	place: t.Nullable(
		t.Object({
			id: t.String(),
			slug: t.String(),
			name: t.String(),
			coverUrl: t.Nullable(t.String()),
		}),
	),
});

export const MyClaimsResponse = t.Object({
	data: t.Array(MyClaimItem),
});

export const AdminClaimItem = t.Object({
	id: t.String(),
	placeId: t.String(),
	claimantId: t.String(),
	status: ClaimStatusSchema,
	evidence: ClaimEvidenceSchema,
	reviewedById: t.Nullable(t.String()),
	reviewedAt: t.Nullable(t.Date()),
	decisionNote: t.Nullable(t.String()),
	createdAt: t.Date(),
	updatedAt: t.Date(),
	claimant: t.Nullable(
		t.Object({
			id: t.String(),
			name: t.String(),
			email: t.String(),
		}),
	),
	place: t.Nullable(
		t.Object({
			id: t.String(),
			slug: t.String(),
			name: t.String(),
		}),
	),
});

export const AdminClaimsResponse = t.Object({
	data: t.Array(AdminClaimItem),
	meta: t.Object({
		page: t.Number(),
		limit: t.Number(),
		total: t.Number(),
		totalPages: t.Number(),
	}),
});
