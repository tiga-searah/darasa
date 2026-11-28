export type ApiErrorCode =
	| "VALIDATION_ERROR"
	| "UNAUTHENTICATED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "RATE_LIMITED"
	| "PAYLOAD_TOO_LARGE"
	| "UNSUPPORTED_MEDIA_TYPE"
	| "OAUTH_ONLY_ACCOUNT"
	| "LAST_CREDENTIAL"
	| "INTERNAL_ERROR";

export class ApiError extends Error {
	readonly code: ApiErrorCode;
	readonly status: number;
	readonly fields?: Record<string, string>;

	constructor(
		code: ApiErrorCode,
		status: number,
		message: string,
		fields?: Record<string, string>,
	) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = status;
		this.fields = fields;
	}
}

export const notFound = (what: string) =>
	new ApiError("NOT_FOUND", 404, `${what} not found`);

export const forbidden = (what: string) =>
	new ApiError("FORBIDDEN", 403, `Not allowed to ${what}`);

export const conflict = (message: string, fields?: Record<string, string>) =>
	new ApiError("CONFLICT", 409, message, fields);

export const hashPassword = (plain: string) =>
	Bun.password.hash(plain, { algorithm: "argon2id" });

export type SniffedMime =
	| "image/jpeg"
	| "image/png"
	| "image/webp"
	| "application/pdf";

const startsWith = (bytes: Uint8Array, offset: number, prefix: string) => {
	for (let i = 0; i < prefix.length; i++) {
		if (bytes[offset + i] !== prefix.charCodeAt(i)) return false;
	}
	return true;
};

/**
 * Magic-byte check for the only four types we accept. The client's declared MIME
 * is a hint; this is the fact. Anything unrecognised (HTML, SVG, empty, truncated)
 * returns null, so a presigned PUT cannot smuggle a script into the public bucket.
 */
export const sniffMime = (bytes: Uint8Array): SniffedMime | null => {
	// JPEG/PNG/WEBP all need 12 bytes to be sure; PDF needs only its 4-byte prefix.
	if (bytes.length >= 4 && startsWith(bytes, 0, "%PDF"))
		return "application/pdf";
	if (bytes.length < 12) return null;
	if (startsWith(bytes, 0, "\xff\xd8\xff")) return "image/jpeg";
	if (startsWith(bytes, 0, "\x89PNG\r\n\x1a\n")) return "image/png";
	if (startsWith(bytes, 0, "RIFF") && startsWith(bytes, 8, "WEBP"))
		return "image/webp";
	return null;
};

/** A corrupt stored hash must fail the login, never 500 the request. */
export const verifyPassword = async (
	plain: string,
	hash: string | null,
): Promise<boolean> => {
	if (hash === null) return false;
	try {
		return await Bun.password.verify(plain, hash);
	} catch {
		return false;
	}
};

/** Postgres unique_violation, wrapped by drizzle in `DrizzleQueryError`. */
export function isUniqueViolation(error: unknown): boolean {
	let cause = (error as { cause?: unknown } | undefined)?.cause as
		| { code?: string; errno?: string; cause?: unknown }
		| undefined;
	while (cause) {
		if (cause.code === "23505" || cause.errno === "23505") return true;
		cause = cause.cause as typeof cause;
	}
	return false;
}

export const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function paginationMeta(page: number, limit: number, total: number) {
	return {
		page,
		limit,
		total,
		totalPages: Math.max(1, Math.ceil(total / limit)),
	};
}

/** Formats a Date as a YYYYMMDD integer in Asia/Jakarta (WIB). */
export function toJakartaDayInt(date = new Date()): number {
	const formatted = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Jakarta",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
	return Number(formatted.replace(/-/g, ""));
}
