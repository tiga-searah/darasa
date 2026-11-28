# Darasa API — Foundation, Auth & Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a running Darasa API whose auth (password + Google) and media (RustFS presigned upload) paths work end to end, with the error envelope and session guard every later module depends on.

**Architecture:** Elysia 2 app assembled by a `createApp(deps)` factory so tests get a fresh instance with injected fakes (Google client, object storage) and no network. Postgres via Drizzle (`bun-sql` driver) with schema already in place. Auth is a server-side session row + HttpOnly cookie; Google tokens are consumed once and discarded.

**Tech Stack:** Bun 1.4.4, Elysia 2.0.0-rc.3, Drizzle ORM 1.0.0-rc.5, Postgres, `arctic@3` (new dep), `Bun.S3Client` (built in), `Bun.password` (built in), `bun test`.

**Spec:** `apps/api/API.md` (authoritative for contracts), `PRD.md` (product requirements)

## File Layout (ruling, pre-flight)

`AGENTS.md` mandates `plugins/` for Elysia plugins, `routes/<feature>/` with `index.ts` + `model.ts` + `service.ts` for features, and `utils.ts` for global helpers. This plan follows it:

```
apps/api/src/
  index.ts              # listen only
  app.ts                # createApp(deps) factory
  env.ts                # config parsing
  utils.ts              # ApiError, hashPassword, verifyPassword, sniffMime
  plugins/
    errors.ts           # onError -> { error: { code, message, fields? } }
    guard.ts            # requireAuth, requireAdmin
  lib/
    ports.ts            # Storage, GoogleClient types (Task 1)
    session.ts          # session create/resolve/destroy/cookie
    storage.ts          # s3Storage(), memoryStorage()
    google.ts           # googleClient()
  routes/
    auth/{index,model,service,oauth}.ts
    media/{index,model,service}.ts
  database/             # existing
apps/api/test/          # bun test files
apps/api/scripts/smoke.ts
```

`app.ts` (factory) and `env.ts` are additions to the AGENTS sketch, needed so tests can build an app without binding a port or reading a live `.env`.

## Global Constraints

- **Route order in Elysia 2 is `(path, hook, handler)`.** `.get(path, handler, hook)` throws `[Elysia] .get(...) is a legacy order`. Every route in this plan uses the new order.
- **Do not use Elysia macros.** In `2.0.0-rc.3` both `.macro({ name: { resolve } })` and `.macro({ name: () => ({ resolve }) })` silently never fire — the route still returns `200`, so an auth macro fails open. Use the plugin pattern in Task 3. (Verified.)
- **`onError` receives `code: undefined`** for validation and 404 in this RC. Branch on `error instanceof ValidationError`, `error instanceof NotFound`, `error instanceof ApiError` — never on `code`. (Verified.)
- Scope keyword is `"plugin"`, not `"scoped"` (1.x name). `"scoped"` throws.
- Tabs, double quotes, Biome (`bunx biome check --write`). `bun check` for types.
- All ids are UUIDv4. All timestamps are ISO 8601 UTC strings in responses.
- Success envelope `{ data }`; errors `{ error: { code, message, fields? } }`. Codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `OAUTH_ONLY_ACCOUNT`, `LAST_CREDENTIAL`, `INTERNAL_ERROR`.
- Session cookie: name `darasa_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when `SESSION_COOKIE_SECURE=true`.
- Only `sha256(token)` is stored. The raw token never touches the database or logs.
- Password hashing is `Bun.password.hash` / `.verify` (argon2id, ~110 ms — do not lower the cost).
- New dependencies allowed: **`arctic` only**. No AWS SDK (use `Bun.S3Client`), no `jsonwebtoken`, no `bcrypt`, no `zod` (TypeBox `t` from Elysia).
- `Bun.S3Client.presign` signs only `host`, so it cannot constrain `Content-Type`. Never trust a client-declared MIME type; `commit` must re-write the object with a server-chosen type.
- Object storage, Google, and mail must never be called from unit tests. Inject fakes through `createApp`.

## Review Focus

1. **An OAuth-only account (`password_hash IS NULL`) submitting `POST /auth/login`.** Expected: `401` with `code: "OAUTH_ONLY_ACCOUNT"`, never a 500 from `Bun.password.verify(null, ...)` and never a successful login. — test in Task 2.
2. **A valid session cookie whose `user_id` row was deleted.** Expected: `401`, not a 500 and not a request proceeding with `userId: undefined`. — test in Task 3.
3. **A callback hit with a `state` cookie minted in a different browser.** Expected: redirect to `/login?error=oauth_state`, no session created. — test in Task 5.
4. **An upload whose bytes are HTML but whose declared MIME is `image/webp`.** Expected: `415`, object deleted, no `media` row reaches `ready`. — test in Task 6.
5. **A zero-byte or 3-byte upload.** Expected: `415` (magic sniff returns `null`), not an unhandled read error. — test in Task 6.

---

## Task 1: App factory, error envelope, test harness

**Files:**

- Create: `apps/api/src/utils.ts`
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/lib/ports.ts`
- Create: `apps/api/src/plugins/errors.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/test/helpers.ts`
- Create: `apps/api/test/app.test.ts`
- Modify: `apps/api/src/index.ts` (whole file — becomes a thin server entry)
- Modify: `apps/api/package.json` (add `"test": "bun test"`)

**Interfaces:**

- Consumes: `apps/api/src/database/index.ts` (`db`), `apps/api/src/database/schema.ts` (`schema`)
- Produces:
  - `class ApiError extends Error { constructor(code: ApiErrorCode, status: number, message: string, fields?: Record<string, string>) }`
  - `type ApiErrorCode = "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "OAUTH_ONLY_ACCOUNT" | "LAST_CREDENTIAL"`
  - `src/lib/ports.ts`:

    ```ts
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
      createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL;
      validateAuthorizationCode(code: string, codeVerifier: string): Promise<{ idToken(): string }>;
    };
    ```

    Declared here, in Task 1, because `AppDeps` names both. Tasks 5 and 6 supply the implementations; neither redefines the types.
  - `type AppDeps = { storage?: Storage; google?: GoogleClient }` — both optional, defaults built from env
  - `createApp(deps?: AppDeps): Elysia`
  - `test/helpers.ts`: `freshApp(deps?: AppDeps): Elysia`, `resetDb(): Promise<void>`, `json(res: Response): Promise<any>`, `cookieOf(res: Response): string | undefined`

- [ ] **Step 1: Write the failing test**

`apps/api/test/app.test.ts`:

```ts
import { describe, expect, test, beforeEach } from "bun:test";
import { freshApp, json, resetDb } from "./helpers";

describe("app shell", () => {
	beforeEach(resetDb);

	test("health returns data envelope", async () => {
		const res = await freshApp().handle(new Request("http://test/api/health"));
		expect(res.status).toBe(200);
		expect(await json(res)).toEqual({ data: { ok: true } });
	});

	test("unknown route returns NOT_FOUND envelope", async () => {
		const res = await freshApp().handle(new Request("http://test/api/nope"));
		expect(res.status).toBe(404);
		expect(await json(res)).toEqual({
			error: { code: "NOT_FOUND", message: "Route not found" },
		});
	});

	test("validation failure returns VALIDATION_ERROR with fields", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/echo", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ n: "not-a-number" }),
			}),
		);
		expect(res.status).toBe(422);
		const body = await json(res);
		expect(body.error.code).toBe("VALIDATION_ERROR");
		expect(body.error.fields["/n"]).toContain("must be number");
	});

	test("ApiError thrown in a handler maps to its status", async () => {
		const res = await freshApp().handle(new Request("http://test/api/boom"));
		expect(res.status).toBe(409);
		expect(await json(res)).toEqual({
			error: { code: "CONFLICT", message: "Already reviewed" },
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/app.test.ts`
Expected: FAIL — `Cannot find module "./helpers"`.

- [ ] **Step 3: Implement the error type**

`apps/api/src/utils.ts` — `ApiErrorCode` union above; `ApiError` carries `code`, `status`, `message`, optional `fields`. Also export `notFound(what: string)`, `forbidden(what: string)`, `conflict(message: string, fields?)` helpers returning a new `ApiError` with the matching status (404/403/409). Tasks 2 and 6 append `hashPassword` / `verifyPassword` / `sniffMime` to this same file.

- [ ] **Step 4: Implement env parsing**

`apps/api/src/env.ts` — read `process.env` once at import into a frozen object `env` with: `databaseUrl` (required, throw `Error("DATABASE_URL is not set")`), `webAppUrl` (default `http://localhost:5173`), `sessionCookieSecure` (boolean from `"true"`), `googleClientId`, `googleClientSecret`, `googleRedirectUri`, `s3Endpoint`, `s3Region` (default `us-east-1`), `s3AccessKey`, `s3SecretKey`, `s3BucketPublic` (default `darasa-public`), `s3BucketPrivate` (default `darasa-private`), `mediaPublicBaseUrl`.

- [ ] **Step 5: Implement `createApp` with the error handler**

`apps/api/src/plugins/errors.ts` exports `errorPlugin: Elysia` holding the `.onError` handler. `apps/api/src/app.ts` assembles `new Elysia({ prefix: "/api" })` with, in this order:

1. `.use(cors({ origin: env.webAppUrl, credentials: true }))` from `@elysia/cors`
2. `.use(openapi({ path: "/docs", documentation: { info: { title: "Darasa API", version: "1.0.0" } } }))`
3. `.use(errorPlugin)` — its `onError` branches in this order: `error instanceof ApiError` → `set.status = error.status`, return `{ error: { code, message, fields? } }`; `error instanceof ValidationError` → `set.status = 422`, return `{ error: { code: "VALIDATION_ERROR", message: "Invalid input", fields } }` where `fields` maps each `error.errors[i].instancePath` to its `message`; `error instanceof NotFound` → `set.status = 404`, `{ error: { code: "NOT_FOUND", message: "Route not found" } }`; `error instanceof ParseError` → `set.status = 400`, `{ error: { code: "VALIDATION_ERROR", message: "Malformed request body" } }`; `error instanceof ElysiaStatus` → `set.status = error.status`, `{ error: { code: "VALIDATION_ERROR", message: error.message } }` (this is how Elysia reports an unsupported content type as 415); anything else → log the error and `set.status = 500`, `{ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }`
4. `.get("/health", () => ({ data: { ok: true } }))`
5. `.post("/echo", { body: t.Object({ n: t.Number() }) }, ({ body }) => ({ data: body }))` — temporary route that exists so Task 1 can prove validation mapping; **delete it in Task 2's commit**
6. `.get("/boom", () => { throw new ApiError("CONFLICT", 409, "Already reviewed"); })` — temporary, also deleted in Task 2

`createApp` accepts `deps: AppDeps = {}` and stores it for later tasks; Tasks 3–6 read from it. The function must be callable many times in one process.

- [ ] **Step 6: Make `src/index.ts` a thin entry**

`apps/api/src/index.ts` becomes:

```ts
import { createApp } from "./app";

const app = createApp().listen(Number(process.env.PORT ?? 3000));
console.log(`Darasa API on ${app.server?.hostname}:${app.server?.port}`);
```

- [ ] **Step 7: Implement test helpers**

`apps/api/test/helpers.ts`:

- `resetDb()` — `TRUNCATE` every table in `public` (`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`, join as `"public"."name"`, then `TRUNCATE ... RESTART IDENTITY CASCADE` via `db.execute(sql.unsafe(...))`). Verified working.
- `freshApp(deps?)` — `createApp(deps)`
- `json(res)` — `res.json()`
- `cookieOf(res)` — first `name=value` pair of `res.headers.get("set-cookie")`

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd apps/api && bun test test/app.test.ts`
Expected: 4 passing.

- [ ] **Step 9: Typecheck and lint**

Run: `cd apps/api && bun check && cd ../.. && bunx biome check --write apps/api`
Expected: no type errors, no lint errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/utils.ts apps/api/src/env.ts apps/api/src/lib/ports.ts \
  apps/api/src/plugins/errors.ts apps/api/src/app.ts apps/api/src/index.ts \
  apps/api/test/helpers.ts apps/api/test/app.test.ts apps/api/package.json
git commit -m "feat(api): app factory, error envelope, test harness"
```

---

## Task 2: Sessions and password authentication

**Files:**

- Create: `apps/api/src/lib/session.ts`
- Create: `apps/api/src/routes/auth/model.ts`
- Create: `apps/api/src/routes/auth/service.ts`
- Create: `apps/api/src/routes/auth/index.ts`
- Create: `apps/api/test/auth.test.ts`
- Modify: `apps/api/src/app.ts` (mount `authRoutes`, delete `/echo` and `/boom`)
- Modify: `apps/api/test/app.test.ts` (drop the two tests for the deleted routes)

**Interfaces:**

- Consumes: `createApp`, `ApiError`, `db`, `schema`, `env`
- Produces:
  - `src/utils.ts` also exports `hashPassword(plain: string): Promise<string>` and `verifyPassword(plain: string, hash: string | null): Promise<boolean>` (returns `false` for `null`)
  - `src/lib/session.ts`:
    - `SESSION_COOKIE = "darasa_session"`
    - `SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000`, `SESSION_ABSOLUTE_MS = 180 * 24 * 60 * 60 * 1000`
    - `createSession(userId: string): Promise<{ token: string; expiresAt: Date }>` — 32 random bytes base64url, stores `sha256(token)`
    - `resolveSession(token: string): Promise<{ user: SessionUser; expiresAt: Date } | null>`
    - `destroySession(token: string): Promise<void>`
    - `setSessionCookie(cookie: any, token: string, expiresAt: Date): void`
    - `clearSessionCookie(cookie: any): void`
    - `type SessionUser = { id: string; name: string; email: string; role: "user" | "owner" | "admin"; avatarUrl: string | null; hasPassword: boolean }`
  - `src/routes/auth/index.ts`: `authRoutes: Elysia` — mounted at `/api/auth`

- [ ] **Step 1: Write the failing test**

`apps/api/test/auth.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

const app = () => freshApp();
const register = (body: unknown) =>
	app().handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);

describe("register", () => {
	beforeEach(resetDb);

	test("creates a user and sets a session cookie", async () => {
		const res = await register({
			name: "Arya",
			email: "Arya@Example.com",
			password: "min8chars",
		});
		expect(res.status).toBe(201);
		const body = await json(res);
		expect(body.data.email).toBe("arya@example.com");
		expect(body.data.role).toBe("user");
		expect(body.data.hasPassword).toBe(true);
		expect(body.data.linkedProviders).toEqual([]);
		expect(body.data).not.toHaveProperty("passwordHash");
		expect(cookieOf(res)).toStartWith("darasa_session=");
	});

	test("rejects a duplicate email with 409", async () => {
		await register({ name: "Arya", email: "a@b.test", password: "min8chars" });
		const res = await register({
			name: "Other",
			email: "a@b.test",
			password: "min8chars",
		});
		expect(res.status).toBe(409);
		expect((await json(res)).error.code).toBe("CONFLICT");
	});

	test("rejects a 7-character password with 422", async () => {
		const res = await register({
			name: "Arya",
			email: "a@b.test",
			password: "1234567",
		});
		expect(res.status).toBe(422);
		expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
	});
});

describe("login and session", () => {
	beforeEach(async () => {
		await resetDb();
		await register({ name: "Arya", email: "a@b.test", password: "min8chars" });
	});

	test("logs in with the right password", async () => {
		const res = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "a@b.test", password: "min8chars" }),
			}),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.email).toBe("a@b.test");
		expect(cookieOf(res)).toStartWith("darasa_session=");
	});

	test("rejects a wrong password with the same message as unknown email", async () => {
		const wrong = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "a@b.test", password: "wrongpass" }),
			}),
		);
		const unknown = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "nobody@b.test", password: "wrongpass" }),
			}),
		);
		expect(wrong.status).toBe(401);
		expect(unknown.status).toBe(401);
		expect((await json(wrong)).error.message).toBe(
			(await json(unknown)).error.message,
		);
	});

	test("refuses password login for an OAuth-only account", async () => {
		await db.insert(schema.users).values({
			name: "Google Only",
			email: "gonly@b.test",
			passwordHash: null,
		});
		const res = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "gonly@b.test", password: "min8chars" }),
			}),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("OAUTH_ONLY_ACCOUNT");
		expect(res.headers.get("set-cookie") ?? "").not.toContain(
			"darasa_session=",
		);
	});

	test("/auth/me returns the user for a live session and 401 without one", async () => {
		const login = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "a@b.test", password: "min8chars" }),
			}),
		);
		const cookie = cookieOf(login)!;
		const me = await app().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(me.status).toBe(200);
		expect((await json(me)).data.email).toBe("a@b.test");

		const anon = await app().handle(new Request("http://test/api/auth/me"));
		expect(anon.status).toBe(401);
		expect((await json(anon)).error.code).toBe("UNAUTHENTICATED");
	});

	test("logout invalidates the session", async () => {
		const login = await app().handle(
			new Request("http://test/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "a@b.test", password: "min8chars" }),
			}),
		);
		const cookie = cookieOf(login)!;
		const out = await app().handle(
			new Request("http://test/api/auth/logout", {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(out.status).toBe(204);
		const me = await app().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		expect(me.status).toBe(401);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/auth.test.ts`
Expected: FAIL — `/api/auth/register` returns 404.

- [ ] **Step 3: Implement password and session helpers**

`password.ts` — thin wrappers over `Bun.password`, so call sites never pass `null` into it.

`session.ts` — `createSession` inserts a row with `tokenHash = new Bun.CryptoHasher("sha256").update(token).digest("hex")` and `expiresAt = now + SESSION_IDLE_MS`. `resolveSession` selects by `tokenHash` joined to `users` (`db.query.sessions.findFirst({ where: { tokenHash }, with: { user: true } })`) and returns `null` when absent or `expiresAt <= new Date()`. Cookie helpers set `httpOnly`, `sameSite: "lax"`, `path: "/"`, `maxAge` in seconds, `secure: env.sessionCookieSecure`.

- [ ] **Step 4: Implement the auth module**

`model.ts` — TypeBox objects: `RegisterBody` (`name` 2–80, `email` `t.String({ format: "email" })`, `password` 8–72), `LoginBody`, `UserResponse`.

`service.ts` — `registerUser({ name, email, password })`, `authenticate({ email, password })`, `publicUser(user, session?)` (strips `passwordHash`, adds `hasPassword`, `linkedProviders: []` for now). `registerUser` lowercases the email, checks for an existing row → `ApiError("CONFLICT", 409, "Email already registered")`, hashes, inserts, returns the user. `authenticate` looks up by lowercased email; when missing, still run `verifyPassword(password, DUMMY_HASH)` (a module-level constant argon2id hash of a random string, computed once at import) before throwing `ApiError("UNAUTHENTICATED", 401, "Invalid email or password")` so timing does not leak existence; when `passwordHash === null` throw `ApiError("OAUTH_ONLY_ACCOUNT", 401, "This account uses Google sign-in")` **before** verifying.

`index.ts` — `authRoutes` with `POST /register` (201), `POST /login`, `POST /logout` (204), `GET /me`. Each sets or clears the cookie via the session helpers. All routes use the `(path, hook, handler)` order.

- [ ] **Step 5: Mount the module and delete the temporary routes**

In `app.ts`: add `.use(authRoutes)`, delete `/echo` and `/boom`. In `test/app.test.ts`: delete the `validation failure` and `ApiError thrown` tests (they now live in `auth.test.ts` as the 422/401 cases).

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/api && bun test`
Expected: `app.test.ts` 2 passing, `auth.test.ts` 8 passing.

- [ ] **Step 7: Typecheck and lint, then commit**

Run: `cd apps/api && bun check && cd ../.. && bunx biome check --write apps/api`

```bash
git add apps/api/src/utils.ts apps/api/src/lib/session.ts \
  apps/api/src/routes/auth apps/api/src/app.ts apps/api/test
git commit -m "feat(api): password auth with server-side sessions"
```

---

## Task 3: Session guard plugin

**Files:**

- Create: `apps/api/src/plugins/guard.ts`
- Create: `apps/api/test/guard.test.ts`
- Modify: `apps/api/src/app.ts` (add a `GET /api/me/profile`-style guarded probe route **for the duration of this task only**; deleted in Step 6)

**Interfaces:**

- Consumes: `resolveSession`, `SESSION_COOKIE`, `ApiError`
- Produces:
  - `requireAuth: Elysia` — a named plugin whose `.use()` inside `.group()` yields `sessionUser: SessionUser` in the handler context
  - `requireAdmin: Elysia` — same, plus a role check
  - Both are consumed by Tasks 4–6 and every later plan.

- [ ] **Step 1: Write the failing test**

`apps/api/test/guard.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function registerAndLogin() {
	const app = freshApp();
	const res = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Arya",
				email: "g@b.test",
				password: "min8chars",
			}),
		}),
	);
	return cookieOf(res)!;
}

describe("requireAuth", () => {
	beforeEach(resetDb);

	test("401 without a cookie", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me"),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
	});

	test("exposes sessionUser with a live cookie", async () => {
		const cookie = await registerAndLogin();
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.email).toBe("g@b.test");
	});

	test("401 for a forged token", async () => {
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me", {
				headers: { cookie: "darasa_session=forged" },
			}),
		);
		expect(res.status).toBe(401);
	});

	test("401 when the session's user row was deleted", async () => {
		const cookie = await registerAndLogin();
		await resetDb(); // truncates users + sessions, cookie still present client-side
		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/guard.test.ts`
Expected: FAIL — probe route 404s.

- [ ] **Step 3: Implement the plugin**

`apps/api/src/plugins/guard.ts`:

```ts
export const requireAuth = new Elysia({ name: "require-auth" })
	.derive("plugin", async ({ cookie }: any) => {
		const token = cookie[SESSION_COOKIE]?.value as string | undefined;
		const resolved = token ? await resolveSession(token) : null;
		return { sessionUser: resolved?.user ?? null };
	})
	.onBeforeHandle("plugin", ({ sessionUser }: any) => {
		if (!sessionUser)
			throw new ApiError("UNAUTHENTICATED", 401, "Sign in required");
	});
```

`requireAdmin` reuses `requireAuth` and adds a second `onBeforeHandle("plugin")` throwing `ApiError("FORBIDDEN", 403, "Administrator access required")` when `sessionUser.role !== "admin"`.

The `"plugin"` scope keyword is required — `"scoped"` throws. (Verified.)

- [ ] **Step 4: Add the temporary probe route**

In `app.ts`, mount `.group("/_probe", (g) => g.use(requireAuth).get("/me", ({ sessionUser }) => ({ data: sessionUser })))`. Task 4's commit deletes this group.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && bun test`
Expected: all green, including the deleted-user case returning 401 rather than 500.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/plugins/guard.ts apps/api/src/app.ts apps/api/test/guard.test.ts
git commit -m "feat(api): session guard plugin"
```

---

## Task 4: Sliding session expiry

**Files:**

- Modify: `apps/api/src/lib/session.ts` (`resolveSession` gains rotation; add `slideSession`)
- Modify: `apps/api/test/guard.test.ts` (add expiry tests)
- Modify: `apps/api/src/routes/auth/index.ts` (`/auth/me` returns `session.expiresAt`)
- Modify: `apps/api/src/routes/auth/service.ts` (`publicUser` takes the session)

**Interfaces:**

- Consumes: `resolveSession`, `SESSION_IDLE_MS`, `SESSION_ABSOLUTE_MS`
- Produces: `resolveSession` now returns `{ user, expiresAt, renewedToken?: string }`; the guard re-issues the cookie when `renewedToken` is present. `GET /auth/me` returns `session: { expiresAt }`.

- [ ] **Step 1: Write the failing test**

Append to `apps/api/test/guard.test.ts`:

Move these to the **top** of `guard.test.ts` alongside its existing imports (do not leave imports mid-file):

```ts
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { eq } from "drizzle-orm";
```

Then append:

```ts
const DAY = 24 * 60 * 60 * 1000;

async function sessionRowFor(cookie: string) {
	const token = cookie.split("=")[1];
	const hash = new Bun.CryptoHasher("sha256").update(token).digest("hex");
	return db.query.sessions.findFirst({ where: { tokenHash: hash } });
}

describe("sliding session expiry", () => {
	beforeEach(resetDb);

	test("a fresh session is not rewritten", async () => {
		const cookie = await registerAndLogin();
		const before = await sessionRowFor(cookie);
		await freshApp().handle(
			new Request("http://test/api/_probe/me", { headers: { cookie } }),
		);
		const after = await sessionRowFor(cookie);
		expect(after!.expiresAt.getTime()).toBe(before!.expiresAt.getTime());
	});

	test("a session with 29 days left is pushed back to 30", async () => {
		const cookie = await registerAndLogin();
		const row = await sessionRowFor(cookie);
		const almost = new Date(Date.now() + 29 * DAY);
		await db
			.update(schema.sessions)
			.set({ expiresAt: almost })
			.where(eq(schema.sessions.id, row!.id));

		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me", { headers: { cookie } }),
		);
		expect(res.headers.get("set-cookie")).toContain("darasa_session=");

		const after = await sessionRowFor(cookie);
		expect(after!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29.9 * DAY);
	});

	test("never slides past createdAt + 180 days", async () => {
		const cookie = await registerAndLogin();
		const row = await sessionRowFor(cookie);
		const old = new Date(Date.now() - 175 * DAY);
		await db
			.update(schema.sessions)
			.set({ createdAt: old, expiresAt: new Date(Date.now() + 1 * DAY) })
			.where(eq(schema.sessions.id, row!.id));

		await freshApp().handle(
			new Request("http://test/api/_probe/me", { headers: { cookie } }),
		);
		const after = await sessionRowFor(cookie);
		const capped = old.getTime() + 180 * DAY;
		expect(Math.abs(after!.expiresAt.getTime() - capped)).toBeLessThan(10_000);
	});

	test("an expired session is deleted and returns 401", async () => {
		const cookie = await registerAndLogin();
		const row = await sessionRowFor(cookie);
		await db
			.update(schema.sessions)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(schema.sessions.id, row!.id));

		const res = await freshApp().handle(
			new Request("http://test/api/_probe/me", { headers: { cookie } }),
		);
		expect(res.status).toBe(401);
		expect(await sessionRowFor(cookie)).toBeUndefined();
	});

	test("/auth/me reports expiresAt", async () => {
		const cookie = await registerAndLogin();
		const res = await freshApp().handle(
			new Request("http://test/api/auth/me", { headers: { cookie } }),
		);
		const body = await json(res);
		expect(new Date(body.data.session.expiresAt).getTime()).toBeGreaterThan(
			Date.now() + 29 * DAY,
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/guard.test.ts`
Expected: FAIL — no rotation, `session` missing from `/auth/me`.

- [ ] **Step 3: Implement rotation in `resolveSession`**

Replace `resolveSession` internals:

```
1. hash token, find session row (with user)
2. missing row or expiresAt <= now -> delete row if present, return null
3. remaining = expiresAt - now
4. remaining <= 29 days -> next = min(now + 30d, createdAt + 180d);
   UPDATE sessions SET expires_at = next; return renewedToken = token
5. else -> return without renewal
```

`renewedToken` is the **same** token, not a new one: only the expiry moves, so the client's cookie stays valid and the hash lookup keeps working. In the guard, when `renewedToken` is present call `setSessionCookie` again with the new `expiresAt` so the browser's `Max-Age` matches.

- [ ] **Step 4: Surface `expiresAt` on `/auth/me`**

`publicUser` gains a second parameter `session?: { expiresAt: Date }`; `/auth/me` passes the resolved session so the response includes `session: { expiresAt: expiresAt.toISOString() }`. Other endpoints omit it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && bun test`
Expected: all green. The 180-day cap assertion allows 10 seconds of slack (`Math.abs(...) < 10_000`) because the row's `createdAt` is written by the database clock; the behavior under test is the cap, not clock precision.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/session.ts apps/api/src/plugins/guard.ts \
  apps/api/src/routes/auth apps/api/test/guard.test.ts
git commit -m "feat(api): sliding session expiry with absolute cap"
```

---

## Task 5: Google OAuth

**Files:**

- Create: `apps/api/src/lib/google.ts`
- Create: `apps/api/src/routes/auth/oauth.ts`
- Create: `apps/api/test/oauth.test.ts`
- Modify: `apps/api/src/routes/auth/index.ts` (mount the two routes)
- Modify: `apps/api/src/app.ts` (delete the `/_probe` group)
- Modify: `apps/api/package.json` (add `arctic`)
- Modify: `apps/api/.env.example` (already lists the Google vars — verify only)

**Interfaces:**

- Consumes: `env`, `createSession`, `setSessionCookie`, `ApiError`, `db`, `schema`
- Produces:
  - `src/lib/google.ts`: `googleClient(): GoogleClient` built from `env` (`GoogleClient` comes from `src/lib/ports.ts` — do not redeclare it)
  - `OAUTH_COOKIE = "darasa_oauth"`, `type OAuthHandshake = { state: string; verifier: string; redirectTo: string }`
  - `GET /api/auth/google`, `GET /api/auth/google/callback`

- [ ] **Step 1: Write the failing test**

`apps/api/test/oauth.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

function fakeGoogle(sub = "google-sub-1", email = "g@b.test") {
	const idToken = `x.${Buffer.from(JSON.stringify({ sub, email, name: "Arya", picture: "https://img/x.png" })).toString("base64url")}.y`;
	return {
		createAuthorizationURL: (
			state: string,
			verifier: string,
			scopes: string[],
		) => {
			const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
			u.searchParams.set("state", state);
			u.searchParams.set("code_challenge", verifier);
			u.searchParams.set("scope", scopes.join(" "));
			return u;
		},
		validateAuthorizationCode: async (code: string, verifier: string) => {
			if (code !== "good-code" || !verifier) throw new Error("bad code");
			return { idToken: () => idToken };
		},
	};
}

const start = (google: any, redirectTo?: string) =>
	freshApp({ google }).handle(
		new Request(
			`http://test/api/auth/google${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`,
		),
	);

describe("GET /auth/google", () => {
	beforeEach(resetDb);

	test("redirects to Google with state, PKCE and a handshake cookie", async () => {
		const res = await start(fakeGoogle());
		expect(res.status).toBe(307);
		const location = new URL(res.headers.get("location")!);
		expect(location.host).toBe("accounts.google.com");
		expect(location.searchParams.get("state")).toBeTruthy();
		expect(location.searchParams.get("code_challenge")).toBeTruthy();
		expect(location.searchParams.get("scope")).toBe("openid email profile");
		const setCookie = res.headers.get("set-cookie")!;
		expect(setCookie).toContain("darasa_oauth=");
		expect(setCookie).toContain("HttpOnly");
		expect(setCookie).toContain("Path=/api/auth");
		expect(setCookie).toContain("Max-Age=600");
	});

	test("rejects an absolute redirectTo (open redirect guard)", async () => {
		const res = await start(fakeGoogle(), "https://evil.example/");
		expect(res.status).toBe(307);
		const cookie = decodeURIComponent(cookieOf(res)!.split("=")[1]);
		expect(JSON.parse(cookie).redirectTo).toBe("/");
	});
});

describe("GET /auth/google/callback", () => {
	beforeEach(resetDb);

	async function begin() {
		const res = await start(fakeGoogle());
		const setCookie = res.headers.get("set-cookie")!;
		const pair = setCookie.split(";")[0];
		const state = new URL(res.headers.get("location")!).searchParams.get(
			"state",
		)!;
		return { pair, state };
	}

	test("creates the user, sets a session, and redirects to the app", async () => {
		const { pair, state } = await begin();
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				`http://test/api/auth/google/callback?code=good-code&state=${state}`,
				{
					headers: { cookie: pair },
				},
			),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe("http://localhost:5173/");
		expect(res.headers.get("set-cookie")).toContain("darasa_session=");

		const me = await freshApp({ google: fakeGoogle() }).handle(
			new Request("http://test/api/auth/me", {
				headers: { cookie: cookieOf(res)! },
			}),
		);
		expect((await json(me)).data.email).toBe("g@b.test");
		expect((await json(me)).data.hasPassword).toBe(false);
		expect((await json(me)).data.linkedProviders).toEqual(["google"]);
	});

	test("state mismatch redirects with oauth_state and creates no session", async () => {
		const { pair } = await begin();
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				"http://test/api/auth/google/callback?code=good-code&state=wrong",
				{
					headers: { cookie: pair },
				},
			),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe(
			"http://localhost:5173/login?error=oauth_state",
		);
		expect(res.headers.get("set-cookie") ?? "").not.toContain(
			"darasa_session=",
		);
	});

	test("missing handshake cookie redirects with oauth_state", async () => {
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				"http://test/api/auth/google/callback?code=good-code&state=abc",
			),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toContain("error=oauth_state");
	});

	test("provider error param redirects with oauth_denied", async () => {
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request("http://test/api/auth/google/callback?error=access_denied"),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toContain("error=oauth_denied");
	});

	test("exchange failure redirects with oauth_exchange", async () => {
		const { pair, state } = await begin();
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				`http://test/api/auth/google/callback?code=bad-code&state=${state}`,
				{
					headers: { cookie: pair },
				},
			),
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toContain("error=oauth_exchange");
	});

	test("second login with the same sub links to the same user", async () => {
		const { pair, state } = await begin();
		await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				`http://test/api/auth/google/callback?code=good-code&state=${state}`,
				{
					headers: { cookie: pair },
				},
			),
		);
		const again = await begin();
		const res = await freshApp({ google: fakeGoogle() }).handle(
			new Request(
				`http://test/api/auth/google/callback?code=good-code&state=${again.state}`,
				{
					headers: { cookie: again.pair },
				},
			),
		);
		expect(res.status).toBe(302);
		const rows = await db.select().from(schema.users);
		expect(rows.length).toBe(1);
		const linked = await db.select().from(schema.oauthAccounts);
		expect(linked.length).toBe(1);
	});
});
```

The file needs `import { db } from "../src/database";` and `import { schema } from "../src/database/schema";` at the top.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/oauth.test.ts`
Expected: FAIL — route 404, `arctic` not installed.

- [ ] **Step 3: Install `arctic`**

Run: `cd apps/api && bun add arctic`
Expected: `arctic@3.7.0` in `dependencies`. It is ESM-only and runtime-agnostic; it works under Bun unchanged.

- [ ] **Step 4: Implement the Google client wrapper**

`src/lib/google.ts` — `googleClient()` returns `new Google(env.googleClientId!, env.googleClientSecret!, env.googleRedirectUri!)` typed as `GoogleClient`. Throwing `Error("GOOGLE_CLIENT_ID is not set")` when missing keeps misconfiguration loud at boot, not at first sign-in. Scope list lives in `oauth.ts` as `const SCOPES = ["openid", "email", "profile"]`.

- [ ] **Step 5: Implement the two routes**

`src/routes/auth/oauth.ts`, exporting `oauthRoutes: Elysia` mounted into `authRoutes`:

`GET /google`:

- read `redirectTo` query (default `/`)
- sanitize: keep it only when `startsWith("/") && !startsWith("//")`, else `"/"`
- `state = generateState()`, `verifier = generateCodeVerifier()` from `arctic`
- set cookie `darasa_oauth` = `{ state, verifier, redirectTo }` with `httpOnly`, `sameSite: "lax"`, `path: "/api/auth"`, `maxAge: 600`, `secure: env.sessionCookieSecure` (Elysia serializes the object to URL-encoded JSON and parses it back — verified)
- return `redirect(url.toString(), 307)`

`GET /google/callback`:

1. `error` query present → clear handshake cookie, redirect `${env.webAppUrl}/login?error=oauth_denied`
2. handshake cookie missing, or `state` query `!==` `handshake.state` → clear cookie, redirect `.../login?error=oauth_state`
3. clear the handshake cookie **before** the exchange
4. `tokens = await google.validateAuthorizationCode(code, handshake.verifier)` inside try/catch → on throw redirect `.../login?error=oauth_exchange`
5. `claims = decodeIdToken(tokens.idToken())` from `arctic` (unverified decode is correct here: the token came from Google's token endpoint over TLS, never through the browser)
6. upsert: find `oauthAccounts` by `(provider: "google", providerAccountId: claims.sub)`; if found use its `userId`; else find `users` by lowercased `claims.email` and link, else create a user with `passwordHash: null`, `avatarUrl: claims.picture`, `name: claims.name`, then insert the `oauthAccounts` row
7. `createSession(userId)`, `setSessionCookie`
8. `redirect(`${env.webAppUrl}${handshake.redirectTo}`, 302)`

Both routes declare `response` schemas only for the JSON cases they can return; the redirects use `redirect()` from `elysia`.

- [ ] **Step 6: Delete the temporary probe route**

Remove the `/_probe` group from `app.ts`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd apps/api && bun test`
Expected: all green, including the state-mismatch and exchange-failure redirects.

- [ ] **Step 8: Typecheck, lint, commit**

Run: `cd apps/api && bun check && cd ../.. && bunx biome check --write apps/api`

```bash
git add apps/api/src/lib/google.ts apps/api/src/routes/auth apps/api/src/app.ts \
  apps/api/test/oauth.test.ts apps/api/package.json bun.lock
git commit -m "feat(api): Google OAuth with cookie-backed handshake"
```

---

## Task 6: Media presign, commit, delete

**Files:**

- Create: `apps/api/src/lib/storage.ts`
- Create: `apps/api/src/routes/media/model.ts`
- Create: `apps/api/src/routes/media/service.ts`
- Create: `apps/api/src/routes/media/index.ts`
- Create: `apps/api/test/mime.test.ts`
- Create: `apps/api/test/media.test.ts`
- Modify: `apps/api/src/app.ts` (mount `mediaRoutes`)

**Interfaces:**

- Consumes: `requireAuth`, `ApiError`, `db`, `schema`, `env`, `AppDeps.storage`
- Produces:
  - `src/utils.ts` also exports `sniffMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null`
  - `src/lib/storage.ts`:

    ```ts
    export type Storage = {
      presignPut(key: string, expiresIn: number): Promise<string>;
      presignGet(key: string, expiresIn: number): Promise<string>;
      put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
      get(key: string): Promise<Uint8Array | null>;
      stat(key: string): Promise<{ size: number; type: string } | null>;
      delete(key: string): Promise<void>;
      publicUrl(key: string): string | null;
    };
    export function s3Storage(): Storage;
    export function memoryStorage(): Storage; // test double
    ```
  - `MEDIA_LIMITS: { image: 5 * 1024 * 1024; document: 10 * 1024 * 1024 }`
  - `mediaRoutes: Elysia` — `POST /media/uploads`, `POST /media/:id/commit`, `GET /media/:id/url`, `DELETE /media/:id`

- [ ] **Step 1: Write the failing MIME test**

`apps/api/test/mime.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { sniffMime } from "../src/utils";

const enc = (s: string) => new TextEncoder().encode(s);
const bytes = (...n: number[]) => new Uint8Array(n);

describe("sniffMime", () => {
	test("recognises the four allowed types", () => {
		expect(
			sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0)),
		).toBe("image/jpeg");
		expect(
			sniffMime(
				bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0),
			),
		).toBe("image/png");
		expect(
			sniffMime(
				new Uint8Array([...enc("RIFF"), 0, 0, 0, 0, ...enc("WEBPVP8 ")]),
			),
		).toBe("image/webp");
		expect(sniffMime(enc("%PDF-1.7 something"))).toBe("application/pdf");
	});

	test("rejects html, svg and short input", () => {
		expect(sniffMime(enc("<html><body>x"))).toBeNull();
		expect(sniffMime(enc("<svg xmlns="))).toBeNull();
		expect(sniffMime(new Uint8Array(0))).toBeNull();
		expect(sniffMime(bytes(0x89, 0x50, 0x4e))).toBeNull();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && bun test test/mime.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `sniffMime`**

`src/utils.ts` (append) — return `null` when `bytes.length < 12` **except** for PDF, which needs only the 4-byte `%PDF` prefix (a 5-byte PDF must still be rejected as too short by the caller's size check, not by the sniffer). Implementation is four prefix comparisons, no dependency.

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/api && bun test test/mime.test.ts`
Expected: 2 passing.

- [ ] **Step 5: Write the failing media test**

`apps/api/test/media.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { cookieOf, freshApp, json, resetDb } from "./helpers";
import { memoryStorage } from "../src/lib/storage";

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

async function login(): Promise<string> {
	const res = await freshApp().handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Arya",
				email: "m@b.test",
				password: "min8chars",
			}),
		}),
	);
	return cookieOf(res)!;
}

function presign(cookie: string, body: unknown) {
	return freshApp({ storage: memoryStorage() }).handle(
		new Request("http://test/api/media/uploads", {
			method: "POST",
			headers: { "content-type": "application/json", cookie },
			body: JSON.stringify(body),
		}),
	);
}

describe("POST /media/uploads", () => {
	beforeEach(resetDb);

	test("returns a presigned URL and a pending row", async () => {
		const cookie = await login();
		const res = await presign(cookie, {
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: 12,
		});
		expect(res.status).toBe(201);
		const body = await json(res);
		expect(body.data.uploadUrl).toContain("memory://");
		expect(body.data.method).toBe("PUT");
		expect(body.data.headers["Content-Type"]).toBe("image/png");
		expect(body.data.expiresIn).toBe(600);
	});

	test("rejects a disallowed mime with 415", async () => {
		const cookie = await login();
		const res = await presign(cookie, {
			purpose: "place_photo",
			mime: "text/html",
			sizeBytes: 12,
		});
		expect(res.status).toBe(415);
		expect((await json(res)).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
	});

	test("rejects an oversize image with 413", async () => {
		const cookie = await login();
		const res = await presign(cookie, {
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: 6 * 1024 * 1024,
		});
		expect(res.status).toBe(413);
	});

	test("requires a session", async () => {
		const res = await presign("", {
			purpose: "place_photo",
			mime: "image/png",
			sizeBytes: 12,
		});
		expect(res.status).toBe(401);
	});
});

describe("POST /media/:id/commit", () => {
	beforeEach(resetDb);

	async function uploaded(storage = memoryStorage()) {
		const cookie = await login();
		const app = freshApp({ storage });
		const created = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					purpose: "place_photo",
					mime: "image/png",
					sizeBytes: 12,
				}),
			}),
		);
		const { id } = (await json(created)).data;
		return { app, cookie, id, storage };
	}

	test("commits real PNG bytes and rewrites the content type", async () => {
		const storage = memoryStorage();
		const { app, cookie, id } = await uploaded(storage);
		// the browser "uploads" then the API commits
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(row!.key, PNG, "application/octet-stream");

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.mime).toBe("image/png");
		expect(body.data.sizeBytes).toBe(12);
		expect(body.data.url).toContain("memory://");
		expect(await storage.stat(row!.key)).toBeNull(); // tmp key cleaned
	});

	test("rejects HTML masquerading as an image with 415 and deletes it", async () => {
		const storage = memoryStorage();
		const { app, cookie, id } = await uploaded(storage);
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(
			row!.key,
			new TextEncoder().encode("<html><script>alert(1)</script>"),
			"image/png",
		);

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(415);
		expect(await storage.stat(row!.key)).toBeNull();
		const after = await db.query.media.findFirst({ where: { id } });
		expect(after!.status).toBe("pending");
	});

	test("rejects a 3-byte upload with 415", async () => {
		const storage = memoryStorage();
		const { app, cookie, id } = await uploaded(storage);
		const row = await db.query.media.findFirst({ where: { id } });
		await storage.put(row!.key, new Uint8Array([1, 2, 3]), "image/png");

		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(415);
	});

	test("403 when committing someone else's upload", async () => {
		const { app, id } = await uploaded();
		const other = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "B",
					email: "b@b.test",
					password: "min8chars",
				}),
			}),
		);
		const otherCookie = cookieOf(other)!;
		const res = await app.handle(
			new Request(`http://test/api/media/${id}/commit`, {
				method: "POST",
				headers: { cookie: otherCookie },
			}),
		);
		expect(res.status).toBe(403);
	});
});

describe("GET /media/:id/url", () => {
	beforeEach(resetDb);

	test("404 for a stranger, presigned URL for the owner", async () => {
		const cookie = await login();
		const app = freshApp({ storage: memoryStorage() });
		const created = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					purpose: "claim_document",
					mime: "application/pdf",
					sizeBytes: 100,
				}),
			}),
		);
		const { id } = (await json(created)).data;

		const owner = await app.handle(
			new Request(`http://test/api/media/${id}/url`, { headers: { cookie } }),
		);
		expect(owner.status).toBe(200);
		expect((await json(owner)).data.url).toContain("memory://");

		const stranger = await app.handle(
			new Request(`http://test/api/media/${id}/url`),
		);
		expect(stranger.status).toBe(404);
	});
});
```

Add `import { db } from "../src/database";` at the top of the file.

- [ ] **Step 6: Run it to verify it fails**

Run: `cd apps/api && bun test test/media.test.ts`
Expected: FAIL — route 404.

- [ ] **Step 7: Implement the storage interface and S3 adapter**

`src/lib/storage.ts`:

- `s3Storage()` builds one `Bun.S3Client` per bucket (public and private are different clients, same credentials) and dispatches on a `private` flag threaded through the key: keep it simple by prefixing private keys with `claims/` and choosing the client from that prefix. Methods:
  - `presignPut` → `client.presign(key, { method: "PUT", expiresIn })`. A comment must record the limitation: **this signs only `host`, so the URL cannot constrain `Content-Type`; that is why `commit` re-writes the object.**
  - `presignGet` → `client.presign(key, { method: "GET", expiresIn })`
  - `put` → `client.write(key, bytes, { type: contentType })`
  - `get` → `client.file(key).arrayBuffer()` wrapped in try/catch returning `null` on `NoSuchKey`
  - `stat` → `client.stat(key)` mapped to `{ size, type }`, `null` on `NoSuchKey`
  - `delete` → `client.delete(key)`, swallowing `NoSuchKey`
  - `publicUrl` → `${env.mediaPublicBaseUrl}/${key}` for non-`claims/` keys, `null` otherwise
- `memoryStorage()` — a `Map<string, { bytes: Uint8Array; type: string }>` behind the same interface; `presignPut`/`presignGet` return `memory://${key}?sig=test`; `publicUrl` returns `memory://${key}`.

- [ ] **Step 8: Implement the media module**

`model.ts` — `UploadBody` (`purpose` union of `place_photo | review_photo | claim_document`, `mime` string, `sizeBytes` int ≥ 1).

`service.ts`:

- `limitsFor(purpose)` → document limits for `claim_document`, image limits otherwise
- `beginUpload({ userId, purpose, mime, sizeBytes })` — validate mime against `["image/jpeg","image/png","image/webp"]` plus `application/pdf` only for `claim_document`; validate `sizeBytes` against the limit; insert `media` with `status: "pending"`, `isPrivate: purpose === "claim_document"`, `key: \`tmp/${userId}/${id}.${ext}\``; return the presigned URL and headers
- `commitUpload({ userId, id })` — load row, 404 if missing, 403 if `ownerId !== userId`, 409 if `status !== "pending"`; `stat` the tmp key (404 if absent — the browser never uploaded); read bytes; `sniffMime` → `415` (delete object, leave row pending) on mismatch or null; check size against the limit → `413` + delete; write the bytes to the final key with the **sniffed** MIME (`places/{ownerId}/{id}.ext` for place photos, `reviews/{ownerId}/{id}.ext` for review photos, `claims/{ownerId}/{id}.ext` for documents — the real place/review id is bound at attach time in the next plan), delete the tmp key, update `status: "ready"`, `mime`, `sizeBytes`, return `{ id, url, mime, sizeBytes }`
- `deleteUpload({ userId, id })` — owner or admin; delete object, delete row

`index.ts` — mount all four routes behind `.group("/media", (g) => g.use(requireAuth)...)`; the `GET /:id/url` handler returns 404 (not 403) for non-owners so ids do not leak.

- [ ] **Step 9: Mount in `app.ts`**

`deps.storage` defaults to `s3Storage()`; tests pass `memoryStorage()`.

- [ ] **Step 10: Run tests to verify they pass**

Run: `cd apps/api && bun test`
Expected: `mime` 2, `media` 9, plus the earlier suites — all green.

- [ ] **Step 11: Typecheck, lint, commit**

Run: `cd apps/api && bun check && cd ../.. && bunx biome check --write apps/api`

```bash
git add apps/api/src/utils.ts apps/api/src/lib/storage.ts \
  apps/api/src/routes/media apps/api/src/app.ts apps/api/test
git commit -m "feat(api): presigned media upload with server-side type validation"
```

---

## Task 7: Manual smoke against real RustFS and Postgres

Automated tests use a memory double. This task proves the real adapters work.

**Files:**

- Create: `apps/api/scripts/smoke.ts`
- Modify: `apps/api/package.json` (add `"smoke": "bun run scripts/smoke.ts"`)

**Interfaces:**

- Consumes: the running app, `s3Storage()`, `db`
- Produces: nothing importable — a script that exits non-zero on failure

- [ ] **Step 1: Write the smoke script**

`apps/api/scripts/smoke.ts` must, against real services:

1. `POST /api/auth/register` → 201, capture cookie
2. `POST /api/media/uploads` (`place_photo`, `image/png`, 12) → 201
3. `PUT` the returned `uploadUrl` with a real 12-byte PNG header and `Content-Type: image/png` → 200
4. `POST /api/media/:id/commit` → 200 with `mime === "image/png"`
5. `GET` `publicUrl` unauthenticated → 200 (bucket policy applied)
6. upload HTML bytes under `image/png`, commit → 415
7. `POST /api/auth/logout` → 204, then `GET /api/auth/me` with the same cookie → 401
8. print `SMOKE OK` and `process.exit(0)`; on any failure print the step and `process.exit(1)`

It reads the same env as the app and starts the app with `createApp().listen(0)` so it uses a real port.

- [ ] **Step 2: Run it against real services**

Run:

```bash
docker run -d --name rustfs -p 9000:9000 -p 9001:9001 \
  -e RUSTFS_ACCESS_KEY=rustfsadmin -e RUSTFS_SECRET_KEY=rustfsadmin \
  -e RUSTFS_CORS_ALLOWED_ORIGINS=http://localhost:5173 rustfs/rustfs:latest
cd apps/api && bun run smoke
```
Expected: `SMOKE OK`. If step 5 fails with 403, the `darasa-public` bucket policy is missing — apply it (see `API.md` §6) and rerun.

- [ ] **Step 3: Commit**

```bash
git add apps/api/scripts/smoke.ts apps/api/package.json
git commit -m "test(api): end-to-end smoke against RustFS and Postgres"
```

---

## Later plans (not detailed here)

This plan stops at a working auth + media core. Two more plans cover the rest of `API.md`, each producing working software on its own:

- **Plan 2 — Discovery & Reviews:** `categories`, `GET /places`, `GET /places/hidden-gems`, `GET /places/:slug`, `POST /places/:id/view`, `POST /places`, `PATCH /places/:id`, photos, reviews CRUD, the ranking service (`exploreScore`, `hiddenGemScore`), and z-score anomaly flagging.
- **Plan 3 — Claims, Owner & Admin:** `POST /places/:id/claims`, `GET /claims/mine`, admin claim approval/rejection, owner dashboard (places, editable fields, replies, stats), admin moderation and the anomaly queue.

Shared groundwork they need is all in this plan: `createApp`, `ApiError`, `requireAuth` / `requireAdmin`, `Storage`, `sniffMime`, and the test harness.

## Self-Review

- **Spec coverage:** `API.md` §1 conventions → Task 1; §4 Auth (register/login/logout/me/sessions) → Tasks 2, 4; Google OAuth → Task 5; §4 Media → Tasks 6, 7; session lifetime → Task 4. Discovery, contributions, claims, owner, admin → deferred to Plans 2–3, stated explicitly. `API.md` §6 configuration → Task 1 env + Task 7 smoke.
- **Step scan:** every step names a file and a checkable result; no "handle edge cases" or TBD. Two temporary routes (`/echo`, `/boom`) and the `/_probe` group are created with an explicit deletion step, so they cannot drift into the product.
- **Type consistency:** `SessionUser` is defined once in `session.ts` and consumed by `guard.ts`, `auth/service.ts`, and every later module. `Storage` is defined once in `storage.ts`; `AppDeps.storage` is the only injection point. `sniffMime` returns the exact four-type union used by `MEDIA_LIMITS` keys.
- **Review Focus:** all five items have an owning task and a test — (1) Task 2 "refuses password login for an OAuth-only account" asserts `OAUTH_ONLY_ACCOUNT` and no cookie; (2) Task 3 deleted-user test; (3) Task 5 state-mismatch test; (4) Task 6 HTML-masquerade test; (5) Task 6 3-byte test.
- **Proportion:** the plan carries decisions and assertions, not bodies. The only algorithm spelled out is the session rotation, which the tests do not determine.
