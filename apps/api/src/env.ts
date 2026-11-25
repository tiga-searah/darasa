const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is not set");

export const env = Object.freeze({
	databaseUrl,
	webAppUrl: process.env.WEB_APP_URL ?? "http://localhost:5173",
	sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === "true",
	googleClientId: process.env.GOOGLE_CLIENT_ID,
	googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
	googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
	s3Endpoint: process.env.S3_ENDPOINT,
	s3Region: process.env.S3_REGION ?? "us-east-1",
	s3AccessKey: process.env.S3_ACCESS_KEY,
	s3SecretKey: process.env.S3_SECRET_KEY,
	s3BucketPublic: process.env.S3_BUCKET_PUBLIC ?? "darasa-public",
	s3BucketPrivate: process.env.S3_BUCKET_PRIVATE ?? "darasa-private",
	mediaPublicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL,
});
