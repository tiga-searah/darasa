# Darasa API — Claims, Owner & Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement business profile claiming, the approved-owner dashboard (profile edits, review replies, view statistics), and administrator moderation (places, claims, verification flags, review status, anomaly queue).

**Architecture:** Three feature route modules (`routes/claims/`, `routes/owner/`, `routes/admin/`) plus admin place mutation routes (`PATCH/DELETE /places/:id`). Per-place owner authorization is always verified against an `approved` `business_claims` row (or `role === "admin"`), never from `user.role === "owner"` alone. Claim approvals, verification changes, and review moderation all call `recomputePlaceStats` inside the same database transaction.

**Tech Stack:** Bun 1.4.4, Elysia 2.0.0-rc.3, Drizzle ORM 1.0.0-rc.5, Postgres, `bun test`.

**Spec:** `apps/api/API.md` (authoritative for contracts), `AGENTS.md` (PRD requirements).

## Global Constraints

- **Route order in Elysia 2 is `(path, hook, handler)`.** Never use `.get(path, handler, hook)`.
- **Do not use Elysia macros.** Use `requireAuth` and `requireAdmin` from `plugins/guard.ts`.
- Tabs, double quotes, Biome (`bunx biome check --write`). `bun check` for types.
- All ids are UUIDv4. All timestamps are ISO 8601 UTC strings in responses.
- Success envelope `{ data }`, paginated lists `{ data, meta: { page, limit, total, totalPages } }`.
- `owner` role is granted on first approved claim (`admin` stays `admin`); per-place authority always checks `business_claims` (`status = 'approved'`).
- Claim evidence (`documentMediaIds`) lives in the private bucket (`purpose = 'claim_document'`); claim responses return only `documentMediaIds`, never URLs.
- Resolving an anomaly flag never alters the review or place scores.

## Review Focus

1. **`POST /places/:id/claims` on a `pending` place, or when a `pending`/`approved` claim already exists.** Expected: `404` for non-published place; `409 CONFLICT` when a live claim exists (whereas a `rejected` claim frees the slot for a new claim). — test in Task 1.
2. **`PATCH /owner/places/:id` by a user with `role = "owner"` (from owning Place A) attempting to edit Place B.** Expected: `403 FORBIDDEN`, because per-place authority comes from `business_claims`, not `role`. — test in Task 2.
3. **`PATCH /owner/places/:id` attempting to change `name`, `categoryId`, `latitude`, `longitude`, or `status`.** Expected: `403 FORBIDDEN` with `error.fields` listing the disallowed fields, never silently ignored or applied. — test in Task 2.
4. **`PATCH /admin/places/:id/verification` setting `ownerVerified: false` while an `approved` claim exists.** Expected: `409 CONFLICT`. — test in Task 4.
5. **`PATCH /places/:id` (admin) attempting an invalid status transition (e.g. `rejected -> published` or `pending -> archived`).** Expected: `409 CONFLICT`. — test in Task 4.

---

## Task 1: Business claims (submit, list mine, admin list/approve/reject)

**Files:**

- Create: `apps/api/src/routes/claims/model.ts`
- Create: `apps/api/src/routes/claims/service.ts`
- Create: `apps/api/src/routes/claims/index.ts`
- Create: `apps/api/test/claims.test.ts`
- Modify: `apps/api/src/app.ts` (mount `claimRoutes`)

**Interfaces:**

- Consumes: `requireAuth`, `requireAdmin`, `assertOwnedReadyMedia`, `recomputePlaceStats`, `resolveMediaUrl`, `ApiError`, `notFound`, `conflict`
- Produces:
  - `claimRoutes: Elysia`:
    - `POST /places/:id/claims` (`201`, session)
    - `GET /claims/mine` (`200`, session)
    - `GET /admin/claims` (`200`, admin; query `status=pending|approved|rejected`, `page`, `limit`)
    - `POST /admin/claims/:id/approve` (`200`, admin; body `{ note? }`)
    - `POST /admin/claims/:id/reject` (`200`, admin; body `{ note }` 5..500 chars)

- [ ] **Step 1: Write the failing test**

`apps/api/test/claims.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function registerAs(email: string, role: "user" | "admin" = "user") {
	const app = freshApp({ storage: memoryStorage() });
	const res = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: email, email, password: "min8chars" }),
		}),
	);
	if (role === "admin") {
		await db
			.update(schema.users)
			.set({ role: "admin" })
			.where(eq(schema.users.email, email));
	}
	return cookieOf(res)!;
}

async function seedPlace(status: "published" | "pending" = "published") {
	const [cat] = await db
		.insert(schema.categories)
		.values({
			name: "Warung",
			slug: `w-${crypto.randomUUID().slice(0, 6)}`,
			sortOrder: 1,
		})
		.returning();
	const [place] = await db
		.insert(schema.places)
		.values({
			slug: `p-${crypto.randomUUID().slice(0, 6)}`,
			name: "Warung Klaim",
			categoryId: cat.id,
			latitude: -6.91,
			longitude: 109.73,
			status,
		})
		.returning();
	return place;
}

describe("business claims", () => {
	beforeEach(resetDb);

	test("submit claim, reject frees slot, re-submit and approve promotes owner", async () => {
		const place = await seedPlace("published");
		const pendingPlace = await seedPlace("pending");
		const userCookie = await registerAs("owner@b.test");
		const adminCookie = await registerAs("admin@b.test", "admin");
		const app = freshApp({ storage: memoryStorage() });

		// 404 on non-published place
		const onPending = await app.handle(
			new Request(`http://test/api/places/${pendingPlace.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "Pemilik",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(onPending.status).toBe(404);

		// submit valid claim
		const c1 = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB 123",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(c1.status).toBe(201);
		const claim1Id = (await json(c1)).data.id;

		// duplicate live claim -> 409
		const dup = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB 123",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(dup.status).toBe(409);

		// reject claim -> frees slot
		const rej = await app.handle(
			new Request(`http://test/api/admin/claims/${claim1Id}/reject`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: adminCookie },
				body: JSON.stringify({ note: "Dokumen kurang jelas" }),
			}),
		);
		expect(rej.status).toBe(200);
		expect((await json(rej)).data.status).toBe("rejected");

		// re-submit and approve
		const c2 = await app.handle(
			new Request(`http://test/api/places/${place.id}/claims`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: userCookie },
				body: JSON.stringify({
					evidence: {
						note: "NIB jelas",
						documentMediaIds: [],
						contactPhone: "+62812",
					},
				}),
			}),
		);
		expect(c2.status).toBe(201);
		const claim2Id = (await json(c2)).data.id;

		const appRes = await app.handle(
			new Request(`http://test/api/admin/claims/${claim2Id}/approve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: adminCookie },
				body: JSON.stringify({ note: "Terverifikasi" }),
			}),
		);
		expect(appRes.status).toBe(200);

		const updatedPlace = await db.query.places.findFirst({
			where: { id: place.id },
		});
		expect(updatedPlace!.ownerVerified).toBe(true);
		expect(updatedPlace!.exploreScore).toBeGreaterThan(0);

		const [ownerUser] = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, "owner@b.test"));
		expect(ownerUser.role).toBe("owner");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/claims.test.ts`
Expected: FAIL — `404` route not found.

- [ ] **Step 3: Implement `routes/claims/{model,service,index}.ts` and mount in `app.ts`**

- `submitClaim`: verify place exists and `status === "published"` (else `notFound("Place")`), check `documentMediaIds` (max 5) via `assertOwnedReadyMedia(tx, userId, ids, "claim_document")`, insert into `businessClaims` catching Postgres unique violation `23505` (or pre-checking live claim) -> `conflict("An active claim already exists for this place")`.
- `listMyClaims`: query `businessClaims` where `claimantId = userId` ordered `desc(createdAt)` with `place: { id, slug, name, coverUrl }`.
- `listAdminClaims`: filter by `status` (default `"pending"`), join claimant + place, paginate.
- `approveClaim`: inside `db.transaction`, verify `status === "pending"` (else `409`), update claim (`status: "approved"`, `reviewedById`, `reviewedAt`, `decisionNote`), set `places.ownerVerified = true`, call `recomputePlaceStats(tx, claim.placeId)`, promote claimant `role` from `"user"` to `"owner"` (`and(eq(users.id, claim.claimantId), eq(users.role, "user"))`).
- `rejectClaim`: verify `status === "pending"` (else `409`), update claim (`status: "rejected"`, `reviewedById`, `reviewedAt`, `decisionNote`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/claims.test.ts`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/claims apps/api/src/app.ts apps/api/test/claims.test.ts
git commit -m "feat(api): business profile claims and admin approval/rejection"
```

---

## Task 2: Owner dashboard — places, profile update, and stats

**Files:**

- Create: `apps/api/src/routes/owner/model.ts`
- Create: `apps/api/src/routes/owner/service.ts`
- Create: `apps/api/src/routes/owner/index.ts`
- Create: `apps/api/test/owner.test.ts`
- Modify: `apps/api/src/app.ts` (mount `ownerRoutes`)

**Interfaces:**

- Consumes: `requireAuth`, `getPlaceDetail`, `resolveMediaUrl`, `ApiError`, `notFound`, `forbidden`
- Produces:
  - `owner/service.ts`: `assertPlaceOwnerOrAdmin(user: SessionUser, placeId: string): Promise<void>`
  - `ownerRoutes: Elysia`:
    - `GET /owner/places`
    - `GET /owner/places/:id`
    - `PATCH /owner/places/:id`
    - `GET /owner/places/:id/stats`

- [ ] **Step 1: Write the failing test**

`apps/api/test/owner.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function seedOwnerSetup() {
	const app = freshApp({ storage: memoryStorage() });
	const reg = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Owner A",
				email: "ownA@b.test",
				password: "min8chars",
			}),
		}),
	);
	const cookie = cookieOf(reg)!;
	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, "ownA@b.test"));
	await db
		.update(schema.users)
		.set({ role: "owner" })
		.where(eq(schema.users.id, user.id));

	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", sortOrder: 1 })
		.returning();
	const [placeA, placeB] = await db
		.insert(schema.places)
		.values([
			{
				slug: "place-a",
				name: "Place A",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
				ownerVerified: true,
			},
			{
				slug: "place-b",
				name: "Place B",
				categoryId: cat.id,
				latitude: -6.92,
				longitude: 109.74,
				status: "published",
			},
		])
		.returning();
	await db.insert(schema.businessClaims).values({
		placeId: placeA.id,
		claimantId: user.id,
		status: "approved",
		evidence: { note: "NIB", documentMediaIds: [], contactPhone: "+628" },
	});
	return { app, cookie, user, placeA, placeB };
}

describe("owner dashboard places & stats", () => {
	beforeEach(resetDb);

	test("lists owned places, updates business info, rejects identity fields and other places", async () => {
		const { app, cookie, placeA, placeB } = await seedOwnerSetup();

		const list = await app.handle(
			new Request("http://test/api/owner/places", { headers: { cookie } }),
		);
		expect(list.status).toBe(200);
		expect((await json(list)).data.map((p: any) => p.id)).toEqual([placeA.id]);

		// owner role cannot touch Place B without approved claim
		const other = await app.handle(
			new Request(`http://test/api/owner/places/${placeB.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ address: "Hacked" }),
			}),
		);
		expect(other.status).toBe(403);

		// identity fields rejected with 403 + fields
		const identity = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ name: "New Name", status: "archived" }),
			}),
		);
		expect(identity.status).toBe(403);
		const idBody = await json(identity);
		expect(idBody.error.fields).toHaveProperty("name");
		expect(idBody.error.fields).toHaveProperty("status");

		// valid update
		const ok = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					address: "Jl. Baru 1",
					phone: "+628123",
				}),
			}),
		);
		expect(ok.status).toBe(200);
		expect((await json(ok)).data.address).toBe("Jl. Baru 1");
	});

	test("GET /owner/places/:id/stats returns daily views and unanswered count", async () => {
		const { app, cookie, placeA } = await seedOwnerSetup();
		await app.handle(
			new Request(`http://test/api/places/${placeA.id}/view`, {
				method: "POST",
			}),
		);
		const res = await app.handle(
			new Request(`http://test/api/owner/places/${placeA.id}/stats?days=7`, {
				headers: { cookie },
			}),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.days).toBe(7);
		expect(body.data.totalViews).toBe(1);
		expect(body.data.daily.length).toBe(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/owner.test.ts`
Expected: FAIL — `404` route not found.

- [ ] **Step 3: Implement `routes/owner/{model,service,index}.ts` and mount in `app.ts`**

- `assertPlaceOwnerOrAdmin(user, placeId)`: check place exists (`notFound("Place")`); if `user.role === "admin"`, return; else query `businessClaims` for `(placeId, claimantId: user.id, status: "approved")` — if missing, throw `forbidden("manage this place")`.
- `updateOwnerPlace`: accept optional `address, description, phone, openingHours, coverMediaId` plus optional `name, categoryId, latitude, longitude, status` in the TypeBox body so any presence of the 5 identity fields throws `new ApiError("FORBIDDEN", 403, "Identity fields require administrator approval", fields)`. If `coverMediaId` is provided (non-null), verify a `place_photos` row exists for `(placeId, coverMediaId)` (else `422 VALIDATION_ERROR`).
- `getOwnerPlaceStats`: query `placeStats` for `placeId` with `day >= cutoffDay` (Asia/Jakarta `YYYYMMDD`), sum `totalViews`, count published reviews without `ownerReplies`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/owner.test.ts`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/owner apps/api/src/app.ts apps/api/test/owner.test.ts
git commit -m "feat(api): owner dashboard places, profile updates, and stats"
```

---

## Task 3: Owner review replies

**Files:**

- Modify: `apps/api/src/routes/owner/model.ts` (add `OwnerReviewsQuery`, `UpsertReplyBody`)
- Modify: `apps/api/src/routes/owner/service.ts` (add `listOwnerReviews`, `upsertOwnerReply`, `deleteOwnerReply`)
- Modify: `apps/api/src/routes/owner/index.ts` (mount `GET /owner/places/:id/reviews`, `PUT /owner/reviews/:id/reply`, `DELETE /owner/reviews/:id/reply`)
- Modify: `apps/api/test/owner.test.ts` (add reply tests)

**Interfaces:**

- Consumes: `assertPlaceOwnerOrAdmin`, `resolveMediaUrl`, `notFound`
- Produces:
  - `GET /api/owner/places/:id/reviews` (`page`, `limit`, `unanswered=true`)
  - `PUT /api/owner/reviews/:id/reply` (`201` on create, `200` on update)
  - `DELETE /api/owner/reviews/:id/reply` (`204`)

- [ ] **Step 1: Write the failing test**

Append to `apps/api/test/owner.test.ts`:

```ts
describe("owner review replies", () => {
	beforeEach(resetDb);

	test("lists unanswered reviews, creates reply (201), updates reply (200), deletes reply (204)", async () => {
		const { app, cookie, placeA } = await seedOwnerSetup();
		const [reviewer] = await db
			.insert(schema.users)
			.values({ name: "Rev", email: "rev@b.test" })
			.returning();
		const [review] = await db
			.insert(schema.reviews)
			.values({
				placeId: placeA.id,
				userId: reviewer.id,
				rating: 5,
				body: "Mantap sekali rasanya!",
				status: "published",
			})
			.returning();

		const unanswered = await app.handle(
			new Request(
				`http://test/api/owner/places/${placeA.id}/reviews?unanswered=true`,
				{ headers: { cookie } },
			),
		);
		expect(unanswered.status).toBe(200);
		expect((await json(unanswered)).data.length).toBe(1);

		const createReply = await app.handle(
			new Request(`http://test/api/owner/reviews/${review.id}/reply`, {
				method: "PUT",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ body: "Terima kasih!" }),
			}),
		);
		expect(createReply.status).toBe(201);

		const updateReply = await app.handle(
			new Request(`http://test/api/owner/reviews/${review.id}/reply`, {
				method: "PUT",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ body: "Terima kasih banyak!" }),
			}),
		);
		expect(updateReply.status).toBe(200);
		expect((await json(updateReply)).data.body).toBe("Terima kasih banyak!");

		const afterReply = await app.handle(
			new Request(
				`http://test/api/owner/places/${placeA.id}/reviews?unanswered=true`,
				{ headers: { cookie } },
			),
		);
		expect((await json(afterReply)).data.length).toBe(0);

		const del = await app.handle(
			new Request(`http://test/api/owner/reviews/${review.id}/reply`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del.status).toBe(204);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/owner.test.ts`
Expected: FAIL — `404` on `/owner/reviews/:id/reply`.

- [ ] **Step 3: Implement `listOwnerReviews`, `upsertOwnerReply`, `deleteOwnerReply`**

- `upsertOwnerReply`: load review (`notFound("Review")`), call `assertPlaceOwnerOrAdmin(user, review.placeId)`. Check if `ownerReplies` row exists for `reviewId`; insert (`status = 201`) or update (`status = 200`), returning `{ id, body, authorName: user.name, createdAt, updatedAt }`.
- `deleteOwnerReply`: load `ownerReplies` row by `reviewId` (`notFound("Reply")`), call `assertPlaceOwnerOrAdmin(user, reply.placeId)`, delete row.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/owner.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/owner apps/api/test/owner.test.ts
git commit -m "feat(api): owner review list and reply upsert/delete"
```

---

## Task 4: Admin place management, verification, review moderation, and anomaly resolution

**Files:**

- Create: `apps/api/src/routes/admin/model.ts`
- Create: `apps/api/src/routes/admin/service.ts`
- Create: `apps/api/src/routes/admin/index.ts`
- Create: `apps/api/test/admin.test.ts`
- Modify: `apps/api/src/routes/places/model.ts` (add `AdminUpdatePlaceBody`)
- Modify: `apps/api/src/routes/places/service.ts` (add `adminUpdatePlace`, `adminArchivePlace`)
- Modify: `apps/api/src/routes/places/index.ts` (mount `PATCH /places/:id` and `DELETE /places/:id` with `requireAdmin`)
- Modify: `apps/api/src/app.ts` (mount `adminRoutes`)

**Interfaces:**

- Consumes: `requireAdmin`, `recomputePlaceStats`, `getPlaceDetail`, `resolveMediaUrl`, `ApiError`, `notFound`, `conflict`
- Produces:
  - `PATCH /api/places/:id` (admin)
  - `DELETE /api/places/:id` (admin, soft archive `204`)
  - `adminRoutes: Elysia`:
    - `GET /admin/places`
    - `PATCH /admin/places/:id/verification`
    - `PATCH /admin/reviews/:id`
    - `GET /admin/anomalies`
    - `POST /admin/anomalies/:id/resolve`

- [ ] **Step 1: Write the failing test**

`apps/api/test/admin.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function adminCookie() {
	const app = freshApp({ storage: memoryStorage() });
	const res = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Admin",
				email: "adm@b.test",
				password: "min8chars",
			}),
		}),
	);
	await db
		.update(schema.users)
		.set({ role: "admin" })
		.where(eq(schema.users.email, "adm@b.test"));
	return cookieOf(res)!;
}

describe("admin moderation", () => {
	beforeEach(resetDb);

	test("PATCH /places/:id enforces status transition state machine", async () => {
		const cookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "p-mod",
				name: "P Mod",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "pending",
			})
			.returning();

		// pending -> archived is invalid (409)
		const bad = await app.handle(
			new Request(`http://test/api/places/${place.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ status: "archived" }),
			}),
		);
		expect(bad.status).toBe(409);

		// pending -> published -> archived -> published
		for (const next of ["published", "archived", "published"] as const) {
			const res = await app.handle(
				new Request(`http://test/api/places/${place.id}`, {
					method: "PATCH",
					headers: { "content-type": "application/json", cookie },
					body: JSON.stringify({ status: next }),
				}),
			);
			expect(res.status).toBe(200);
		}
	});

	test("verification blocks clearing ownerVerified when approved claim exists", async () => {
		const cookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "p-ver",
				name: "P Ver",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
				ownerVerified: true,
			})
			.returning();
		const [owner] = await db
			.insert(schema.users)
			.values({ name: "Own", email: "o@b.test" })
			.returning();
		await db.insert(schema.businessClaims).values({
			placeId: place.id,
			claimantId: owner.id,
			status: "approved",
			evidence: { note: "NIB", documentMediaIds: [], contactPhone: "+62" },
		});

		const blocked = await app.handle(
			new Request(`http://test/api/admin/places/${place.id}/verification`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ ownerVerified: false }),
			}),
		);
		expect(blocked.status).toBe(409);

		const community = await app.handle(
			new Request(`http://test/api/admin/places/${place.id}/verification`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ communityVerified: true }),
			}),
		);
		expect(community.status).toBe(200);
		expect((await json(community)).data.communityVerified).toBe(true);
	});

	test("review moderation recomputes place stats and anomaly resolve does not", async () => {
		const cookie = await adminCookie();
		const app = freshApp({ storage: memoryStorage() });
		const [cat] = await db
			.insert(schema.categories)
			.values({ name: "Warung", slug: "warung", sortOrder: 1 })
			.returning();
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "p-rev",
				name: "P Rev",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
				ratingAvg: 5,
				reviewCount: 1,
			})
			.returning();
		const [u] = await db
			.insert(schema.users)
			.values({ name: "U", email: "u@b.test" })
			.returning();
		const [rev] = await db
			.insert(schema.reviews)
			.values({
				placeId: place.id,
				userId: u.id,
				rating: 5,
				status: "published",
			})
			.returning();
		const [flag] = await db
			.insert(schema.anomalyFlags)
			.values({
				placeId: place.id,
				reviewId: rev.id,
				userId: u.id,
				kind: "rating_outlier",
				metrics: {
					zScore: 3,
					mean: 2,
					stdDev: 1,
					windowDays: 30,
					sampleSize: 10,
				},
				reason: "Outlier",
			})
			.returning();

		// resolve anomaly -> review remains published
		const resFlag = await app.handle(
			new Request(`http://test/api/admin/anomalies/${flag.id}/resolve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					status: "dismissed",
					note: "Valid local customer",
				}),
			}),
		);
		expect(resFlag.status).toBe(200);

		const resFlagAgain = await app.handle(
			new Request(`http://test/api/admin/anomalies/${flag.id}/resolve`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					status: "confirmed",
					note: "Duplicate resolve",
				}),
			}),
		);
		expect(resFlagAgain.status).toBe(409);

		// hide review -> place reviewCount drops to 0
		const hide = await app.handle(
			new Request(`http://test/api/admin/reviews/${rev.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ status: "hidden" }),
			}),
		);
		expect(hide.status).toBe(200);
		const updatedPlace = await db.query.places.findFirst({
			where: { id: place.id },
		});
		expect(updatedPlace!.reviewCount).toBe(0);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/admin.test.ts`
Expected: FAIL — `404` route not found.

- [ ] **Step 3: Implement admin place/review/verification/anomaly endpoints**

- `adminUpdatePlace`: validate `status` transition against `{ pending: ["published", "rejected"], published: ["archived"], archived: ["published"], rejected: [] }` — throw `conflict("Invalid status transition")` if disallowed. Update fields and return `getPlaceDetail`.
- `adminArchivePlace`: set `status = "archived"`, return `204`.
- `listAdminPlaces`: filter by `status` (default `"pending"`), `q` (ILIKE `name`), join `category` and `createdBy`, paginate.
- `updatePlaceVerification`: if `ownerVerified === false`, check `businessClaims` for an `approved` row on `placeId` -> `conflict("Cannot clear owner verification while an approved claim exists")`. Update flags and call `recomputePlaceStats(tx, placeId)` in transaction.
- `moderateReview`: update `reviews.status`, call `recomputePlaceStats(tx, review.placeId)` in transaction.
- `listAnomalies`: filter `status` (default `"open"`), optional `kind`, `placeId`, join `place`, `review`, `user`, paginate.
- `resolveAnomaly`: verify `status === "open"` (else `409`), set `status`, `resolvedById`, `resolvedAt`, `resolutionNote`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/admin.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Typecheck, lint, and run full test suite**

Run: `cd apps/api && bun check && bun test && cd ../.. && bunx biome check --write apps/api`
Expected: no type errors, all tests passing, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/admin apps/api/src/routes/places apps/api/src/app.ts apps/api/test/admin.test.ts
git commit -m "feat(api): admin moderation for places, verification, reviews, and anomalies"
```
