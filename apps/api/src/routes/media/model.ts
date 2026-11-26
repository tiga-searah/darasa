import { t } from "elysia";

export const UploadBody = t.Object({
	purpose: t.Union([
		t.Literal("place_photo"),
		t.Literal("review_photo"),
		t.Literal("claim_document"),
	]),
	mime: t.String({ minLength: 1, maxLength: 100 }),
	sizeBytes: t.Integer({ minimum: 1 }),
});

export const UploadResponse = t.Object({
	id: t.String(),
	uploadUrl: t.String(),
	method: t.Literal("PUT"),
	headers: t.Record(t.String(), t.String()),
	expiresIn: t.Integer(),
});

export const CommitResponse = t.Object({
	id: t.String(),
	url: t.String(),
	mime: t.String(),
	sizeBytes: t.Integer(),
});

export const UrlResponse = t.Object({
	url: t.String(),
});
