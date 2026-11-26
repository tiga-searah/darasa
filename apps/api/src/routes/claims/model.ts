import { t } from "elysia";

export const ClaimEvidenceSchema = t.Object({
	note: t.String({ minLength: 1, maxLength: 2000 }),
	documentMediaIds: t.Array(t.String({ format: "uuid" }), {
		maxItems: 5,
		uniqueItems: true,
	}),
	contactPhone: t.String({ minLength: 1, maxLength: 40 }),
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
	note: t.String({ minLength: 5, maxLength: 500 }),
});
