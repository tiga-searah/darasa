/**
 * End-to-end smoke against real Postgres + RustFS.
 * Run: `bun run smoke` with the S3_* and DATABASE_URL env vars set.
 * Exits non-zero on the first failed step.
 */
import { createApp } from "../src/app";

const STEPS: string[] = [];

function fail(step: string, detail: unknown): never {
	STEPS.push(`FAIL ${step}: ${String(detail)}`);
	for (const line of STEPS) console.log(line);
	process.exit(1);
}

const app = createApp().listen(0);
const base = `http://127.0.0.1:${app.server?.port}`;

const cookieJar = new Map<string, string>();
const remember = (res: Response) => {
	const raw = res.headers.get("set-cookie");
	if (!raw) return;
	const pair = raw.split(";")[0];
	const name = pair.slice(0, pair.indexOf("="));
	cookieJar.set(name, pair.slice(pair.indexOf("=") + 1));
};
const cookieHeader = () =>
	[...cookieJar].map(([k, v]) => `${k}=${v}`).join("; ");

async function call(path: string, init: RequestInit = {}) {
	const res = await fetch(base + path, {
		...init,
		headers: { ...(init.headers ?? {}), cookie: cookieHeader() },
	});
	remember(res);
	return res;
}

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

try {
	// 1. register
	const reg = await call("/api/auth/register", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			name: "Smoke Test",
			email: `smoke-${Date.now()}@darasa.test`,
			password: "min8chars",
		}),
	});
	if (reg.status !== 201) fail("register", `${reg.status} ${await reg.text()}`);
	STEPS.push("ok   register -> 201 + session cookie");

	// 2. presign
	const up = await call("/api/media/uploads", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: PNG.length,
		}),
	});
	const upBody = (await up.json()) as {
		data: { id: string; uploadUrl: string };
	};
	if (up.status !== 201)
		fail("presign", `${up.status} ${JSON.stringify(upBody)}`);
	const { id, uploadUrl } = upBody.data;
	STEPS.push("ok   presign -> 201 with uploadUrl");

	// 3. real PUT to RustFS
	const put = await fetch(uploadUrl, {
		method: "PUT",
		body: PNG,
		headers: { "Content-Type": "image/png" },
	});
	if (!put.ok) fail("PUT upload", `${put.status} ${put.statusText}`);
	STEPS.push("ok   presigned PUT -> 200");

	// 4. commit
	const commit = await call(`/api/media/${id}/commit`, { method: "POST" });
	const commitBody = (await commit.json()) as {
		data: { mime: string; sizeBytes: number; url: string };
	};
	if (commit.status !== 200)
		fail("commit", `${commit.status} ${JSON.stringify(commitBody)}`);
	if (commitBody.data.mime !== "image/png")
		fail("commit mime", commitBody.data.mime);
	if (commitBody.data.sizeBytes !== PNG.length)
		fail("commit size", commitBody.data.sizeBytes);
	STEPS.push("ok   commit -> 200, mime image/png, size matches");

	// 5. public URL serves without auth
	const pub = await fetch(commitBody.data.url);
	if (pub.status !== 200)
		fail("public GET", `${pub.status} — bucket policy missing?`);
	STEPS.push("ok   public URL -> 200 unauthenticated");

	// 6. spoofed upload rejected
	const spoof = await call("/api/media/uploads", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: 31,
		}),
	});
	const spoofBody = (await spoof.json()) as {
		data: { id: string; uploadUrl: string };
	};
	const spoofPut = await fetch(spoofBody.data.uploadUrl, {
		method: "PUT",
		body: new TextEncoder().encode("<html><script>alert(1)</script>"),
		headers: { "Content-Type": "image/png" },
	});
	if (!spoofPut.ok) fail("spoof PUT", `${spoofPut.status}`);
	const spoofCommit = await call(`/api/media/${spoofBody.data.id}/commit`, {
		method: "POST",
	});
	if (spoofCommit.status !== 415)
		fail("spoof commit", `expected 415, got ${spoofCommit.status}`);
	STEPS.push("ok   HTML masquerading as image -> 415");

	// 7. claim evidence goes to the private bucket from the first byte
	const PDF = new TextEncoder().encode("%PDF-1.7 smoke claim document");
	const claim = await call("/api/media/uploads", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			purpose: "claim_document",
			mime: "application/pdf",
			sizeBytes: PDF.length,
		}),
	});
	const claimBody = (await claim.json()) as {
		data: { id: string; uploadUrl: string };
	};
	if (claim.status !== 201)
		fail("claim presign", `${claim.status} ${JSON.stringify(claimBody)}`);
	if (!claimBody.data.uploadUrl.includes("/darasa-private/claims/tmp/"))
		fail("claim bucket", claimBody.data.uploadUrl);
	STEPS.push("ok   claim presign -> private bucket claims/tmp/ key");

	const claimPut = await fetch(claimBody.data.uploadUrl, {
		method: "PUT",
		body: PDF,
		headers: { "Content-Type": "application/pdf" },
	});
	if (!claimPut.ok) fail("claim PUT", `${claimPut.status}`);
	const claimCommit = await call(`/api/media/${claimBody.data.id}/commit`, {
		method: "POST",
	});
	const claimDone = (await claimCommit.json()) as {
		data: { url: string };
	};
	if (claimCommit.status !== 200)
		fail("claim commit", `${claimCommit.status} ${JSON.stringify(claimDone)}`);
	// A private object must never be readable unauthenticated: drop the signature.
	const claimPath = new URL(claimDone.data.url).pathname;
	const leaked = await fetch(`http://localhost:9000${claimPath}`);
	if (leaked.status === 200) fail("claim leak", `unsigned GET ${claimPath}`);
	STEPS.push("ok   claim commit -> 200, presigned URL, bucket not public");

	// 8. logout then me
	const out = await call("/api/auth/logout", { method: "POST" });
	if (out.status !== 204) fail("logout", `${out.status}`);
	const me = await call("/api/auth/me");
	if (me.status !== 401)
		fail("me after logout", `expected 401, got ${me.status}`);
	STEPS.push("ok   logout -> 204, /auth/me -> 401");
} catch (error) {
	fail("unexpected", error instanceof Error ? error.message : error);
}

app.stop();
for (const line of STEPS) console.log(line);
console.log("SMOKE OK");
process.exit(0);
