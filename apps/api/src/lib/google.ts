import { Google } from "arctic";
import { env } from "../env";
import type { GoogleClient } from "./ports";

/**
 * Built lazily so a missing config is loud at the first auth attempt instead of
 * breaking every unrelated route (and every test) at import time.
 */
export function googleClient(): GoogleClient {
	if (!env.googleClientId) throw new Error("GOOGLE_CLIENT_ID is not set");
	if (!env.googleClientSecret)
		throw new Error("GOOGLE_CLIENT_SECRET is not set");
	if (!env.googleRedirectUri) throw new Error("GOOGLE_REDIRECT_URI is not set");
	return new Google(
		env.googleClientId,
		env.googleClientSecret,
		env.googleRedirectUri,
	);
}
