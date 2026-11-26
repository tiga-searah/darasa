import { env } from "../env";
import type { Storage } from "./ports";

/**
 * Private objects live under `claims/` and are only ever served via presigned
 * GET; everything else is public. The key itself is the routing decision so a
 * single `Storage` can span both buckets.
 */
const isPrivateKey = (key: string) => key.startsWith("claims/");

const clientFor = (bucket: string) => {
	if (!env.s3Endpoint || !env.s3AccessKey || !env.s3SecretKey)
		throw new Error("S3 endpoint and credentials are not configured");
	return new Bun.S3Client({
		endpoint: env.s3Endpoint,
		region: env.s3Region,
		accessKeyId: env.s3AccessKey,
		secretAccessKey: env.s3SecretKey,
		bucket,
	});
};

/** True when the S3 error means the object is simply absent. */
const isMissing = (error: unknown): boolean => {
	const name = (error as { name?: string; code?: string } | undefined)?.name;
	const code = (error as { code?: string } | undefined)?.code;
	return name === "NoSuchKey" || code === "NoSuchKey" || code === "NotFound";
};

export function s3Storage(): Storage {
	let publicClient: Bun.S3Client | undefined;
	let privateClient: Bun.S3Client | undefined;
	const client = (key: string) => {
		if (isPrivateKey(key)) {
			privateClient ??= clientFor(env.s3BucketPrivate);
			return privateClient;
		}
		publicClient ??= clientFor(env.s3BucketPublic);
		return publicClient;
	};

	return {
		/**
		 * LIMITATION: presign signs only `host` (X-Amz-SignedHeaders=host), so the
		 * URL cannot constrain `Content-Type`. A presigned PUT can store anything
		 * under any key — which is why `commit` reads the object back, sniffs the
		 * magic bytes and re-writes it with a server-chosen type.
		 */
		presignPut: async (key, expiresIn) =>
			client(key).presign(key, { method: "PUT", expiresIn }),
		presignGet: async (key, expiresIn) =>
			client(key).presign(key, { method: "GET", expiresIn }),
		put: async (key, bytes, contentType) => {
			await client(key).write(key, bytes, { type: contentType });
		},
		get: async (key) => {
			try {
				return new Uint8Array(await client(key).file(key).arrayBuffer());
			} catch (error) {
				if (isMissing(error)) return null;
				throw error;
			}
		},
		stat: async (key) => {
			try {
				const { size, type } = await client(key).stat(key);
				return { size, type };
			} catch (error) {
				if (isMissing(error)) return null;
				throw error;
			}
		},
		delete: async (key) => {
			try {
				await client(key).delete(key);
			} catch (error) {
				if (!isMissing(error)) throw error;
			}
		},
		publicUrl: (key) =>
			isPrivateKey(key) || !env.mediaPublicBaseUrl
				? null
				: `${env.mediaPublicBaseUrl}/${key}`,
	};
}

/** In-memory double for tests: never touches RustFS or the network. */
export function memoryStorage(): Storage {
	const objects = new Map<string, { bytes: Uint8Array; type: string }>();
	return {
		presignPut: async (key) => `memory://${key}?sig=test`,
		// Distinct from `publicUrl` so a test can prove a private read is signed.
		presignGet: async (key) => `memory://${key}?sig=test&presigned=1`,
		put: async (key, bytes, contentType) => {
			objects.set(key, { bytes, type: contentType });
		},
		get: async (key) => objects.get(key)?.bytes ?? null,
		stat: async (key) => {
			const object = objects.get(key);
			return object ? { size: object.bytes.length, type: object.type } : null;
		},
		delete: async (key) => {
			objects.delete(key);
		},
		publicUrl: (key) => (isPrivateKey(key) ? null : `memory://${key}`),
	};
}
