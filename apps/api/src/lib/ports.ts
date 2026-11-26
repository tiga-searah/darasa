export type Storage = {
	presignPut(key: string, expiresIn: number): Promise<string>;
	presignGet(key: string, expiresIn: number): Promise<string>;
	put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
	get(key: string): Promise<Uint8Array | null>;
	stat(key: string): Promise<{ size: number; type: string } | null>;
	delete(key: string): Promise<void>;
	publicUrl(key: string): string | null;
};

export type GoogleClient = {
	createAuthorizationURL(
		state: string,
		codeVerifier: string,
		scopes: string[],
	): URL;
	validateAuthorizationCode(
		code: string,
		codeVerifier: string,
	): Promise<{ idToken(): string }>;
};
