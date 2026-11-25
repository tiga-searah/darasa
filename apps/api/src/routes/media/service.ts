import { eq } from "drizzle-orm";
import { db } from "../../database";
import { schema } from "../../database/schema";
import type { Storage } from "../../lib/ports";
import { ApiError, notFound, sniffMime } from "../../utils";

export const MEDIA_LIMITS = {
	image: 5 * 1024 * 1024,
	document: 10 * 1024 * 1024,
} as const;

const UPLOAD_EXPIRES_IN = 600;

const EXTENSIONS = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"application/pdf": "pdf",
} as const;

type Purpose = "place_photo" | "review_photo" | "claim_document";
type Mime = keyof typeof EXTENSIONS;

const IMAGE_MIMES: Mime[] = ["image/jpeg", "image/png", "image/webp"];

const FINAL_PREFIX: Record<Purpose, string> = {
	place_photo: "places",
	review_photo: "reviews",
	claim_document: "claims",
};

const limitsFor = (purpose: Purpose) =>
	purpose === "claim_document" ? MEDIA_LIMITS.document : MEDIA_LIMITS.image;

const allowedMimes = (purpose: Purpose): Mime[] =>
	purpose === "claim_document"
		? [...IMAGE_MIMES, "application/pdf"]
		: IMAGE_MIMES;

const unsupported = () =>
	new ApiError(
		"UNSUPPORTED_MEDIA_TYPE",
		415,
		"Only JPEG, PNG and WebP images are accepted (PDF for documents)",
	);

const tooLarge = (limit: number) =>
	new ApiError(
		"PAYLOAD_TOO_LARGE",
		413,
		`File exceeds the ${limit} byte limit`,
	);

export async function beginUpload(
	storage: Storage,
	input: { userId: string; purpose: Purpose; mime: string; sizeBytes: number },
) {
	const { userId, purpose, mime, sizeBytes } = input;
	const limit = limitsFor(purpose);
	if (!(allowedMimes(purpose) as string[]).includes(mime)) throw unsupported();
	if (sizeBytes > limit) throw tooLarge(limit);

	const id = crypto.randomUUID();
	const key = `tmp/${userId}/${id}.${EXTENSIONS[mime as Mime]}`;
	await db.insert(schema.media).values({
		id,
		ownerId: userId,
		purpose,
		status: "pending",
		isPrivate: purpose === "claim_document",
		key,
	});

	return {
		id,
		uploadUrl: await storage.presignPut(key, UPLOAD_EXPIRES_IN),
		method: "PUT" as const,
		// Advisory only: the signature covers `host`, not this header.
		headers: { "Content-Type": mime },
		expiresIn: UPLOAD_EXPIRES_IN,
	};
}

/** The browser already uploaded to `row.key`; verify it and move it into place. */
export async function commitUpload(
	storage: Storage,
	input: { userId: string; id: string },
) {
	const row = await db.query.media.findFirst({ where: { id: input.id } });
	if (!row) throw notFound("Upload");
	if (row.ownerId !== input.userId)
		throw new ApiError("FORBIDDEN", 403, "Not your upload");
	if (row.status !== "pending")
		throw new ApiError("CONFLICT", 409, "Upload already committed");

	const head = await storage.stat(row.key);
	if (!head) throw notFound("Uploaded object");

	const bytes = await storage.get(row.key);
	if (!bytes) throw notFound("Uploaded object");

	const purpose = row.purpose as Purpose;
	const sniffed = sniffMime(bytes);
	// Client-declared type is a hint. A mismatch means the object was not what the
	// row was issued for, so drop it and leave the row pending for a retry.
	if (!sniffed || !allowedMimes(purpose).includes(sniffed)) {
		await storage.delete(row.key);
		throw unsupported();
	}

	const limit = limitsFor(purpose);
	if (bytes.length > limit) {
		await storage.delete(row.key);
		throw tooLarge(limit);
	}

	const finalKey = `${FINAL_PREFIX[purpose]}/${input.userId}/${input.id}.${EXTENSIONS[sniffed]}`;
	await storage.put(finalKey, bytes, sniffed);
	await storage.delete(row.key);
	await db
		.update(schema.media)
		.set({
			status: "ready",
			key: finalKey,
			mime: sniffed,
			sizeBytes: bytes.length,
		})
		.where(eq(schema.media.id, input.id));

	return {
		id: input.id,
		url: await mediaUrl(storage, finalKey),
		mime: sniffed,
		sizeBytes: bytes.length,
	};
}

const mediaUrl = (storage: Storage, key: string) =>
	// Private objects have no public URL; a short-lived signature is the only way in.
	storage.publicUrl(key) ?? storage.presignGet(key, UPLOAD_EXPIRES_IN);

/** 404 rather than 403 for strangers: an id must not confirm that media exists. */
export async function getMediaUrl(
	storage: Storage,
	input: { userId: string; id: string },
) {
	const row = await db.query.media.findFirst({ where: { id: input.id } });
	if (!row || row.ownerId !== input.userId) throw notFound("Media");
	return { url: await mediaUrl(storage, row.key) };
}

export async function deleteUpload(
	storage: Storage,
	input: { userId: string; isAdmin: boolean; id: string },
) {
	const row = await db.query.media.findFirst({ where: { id: input.id } });
	if (!row || (!input.isAdmin && row.ownerId !== input.userId))
		throw notFound("Media");
	await storage.delete(row.key);
	await db.delete(schema.media).where(eq(schema.media.id, input.id));
}
