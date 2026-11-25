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
