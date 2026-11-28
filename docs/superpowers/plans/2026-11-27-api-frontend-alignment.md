# API-Frontend Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `apps/api` schemas, endpoints, query filters, sorting, and response DTOs with the implemented `apps/web/app/` UI (excluding `submit-place.tsx`).

**Architecture:** Extend existing Drizzle PostgreSQL tables (`places`, `bookmarks`, `review_likes`) and Elysia feature routes (`places`, `reviews`, `bookmarks`, `claims`, `owner`, `admin`) while preserving `API.md` conventions (`{ data, meta? }` envelopes, UUIDv4 IDs, cookie auth, `Bun.S3Client` media). Keep `priceMin`/`priceMax` parsed on write and `viewsTotal` denormalized on `places` so Explore filtering and sorting stay single-query fast.

**Tech Stack:** Bun, TypeScript, ElysiaJS + TypeBox, Drizzle ORM, PostgreSQL, `bun:test`.

**Spec:** Frontend UI in `apps/web/app/` (`routes/explore.tsx`, `routes/hidden-gem.tsx`, `routes/bookmarks.tsx`, `routes/place-detail.tsx`, `routes/claim.tsx`, `routes/owner.tsx`, `routes/admin.tsx`, `lib/types.ts`, `lib/scoring.ts`, `context/darasa-store.tsx`).

## Global Constraints

- Base path `/api`; responses `{ data }` (and `{ data, meta }` for lists); errors `{ error: { code, message, fields? } }`.
- TypeBox models in `routes/*/model.ts` must match actual handler returns for Eden Treaty type safety.
- All changes must pass `bun typecheck`, `bun lint`, and `bun test` in `apps/api`.
- Never break existing public/auth/media contracts (`POST /auth/*`, `POST /media/*`, `POST /places/:id/view`).

## Review Focus

- `onlyBookmarked=true` on `GET /places` when unauthenticated (visitor): must return empty list (`data: []`, `total: 0`), not 401 or all places.
- `priceTier` filter on `places` with `null` or unparseable `priceRange`: must not match any tier except `"all"`, and must not throw.
- `POST /places/:id/bookmark` and `POST /reviews/:id/like` called twice by the same user: must be idempotent (200/201, no 500 unique violation).
- `PATCH /owner/places/:id` with `openingHours` as either structured `OpeningHours` object or plain string (e.g. `"08:00 - 21:00"`): must accept and return both cleanly without breaking existing `places-write.test.ts`.
- `POST /admin/anomalies/:id/resolve` with either `"dismissed" | "confirmed"` or UI values `"cleared" | "flagged_hold"` and optional `note`: must resolve cleanly and return updated status.

---

### Task 1: Database Schema & Price Parsing Helper

**Files:**

- Modify: `apps/api/src/database/schema/places.ts`
- Modify: `apps/api/src/database/schema/reviews.ts`
- Modify: `apps/api/src/database/schema/claims.ts`
- Modify: `apps/api/src/database/relations.ts`
- Create: `apps/api/src/lib/price.ts`
- Test: `apps/api/test/price.test.ts`

**Interfaces:**

- Produces `apps/api/src/lib/price.ts`:
  - `export type PriceTier = "under_25k" | "25k_50k" | "50k_100k" | "over_100k"`
  - `export function parsePriceBounds(priceRange: string | null | undefined): { min: number | null; max: number | null }`
- Produces schema columns:
  - `places`: `district` (`text`), `priceRange` (`text`), `priceMin` (`integer`), `priceMax` (`integer`), `viewsTotal` (`integer`, notNull, default 0)
  - `bookmarks` table in `schema/places.ts`: `id`, `userId`, `placeId`, `createdAt`, unique index `(userId, placeId)`
  - `reviewLikes` table in `schema/reviews.ts`: `id`, `userId`, `reviewId`, `createdAt`, unique index `(userId, reviewId)`
  - `ClaimEvidence` in `schema/claims.ts`: `businessRole?: string`

- [ ] **Step 1: Write failing unit test for `parsePriceBounds`**

Create `apps/api/test/price.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { parsePriceBounds } from "../src/lib/price";

describe("parsePriceBounds", () => {
	test("parses Indonesian Rupiah ranges and single numbers", () => {
		expect(parsePriceBounds("Rp 15.000 - Rp 30.000")).toEqual({
			min: 15000,
			max: 30000,
		});
		expect(parsePriceBounds("Rp 10.000 - 20.000")).toEqual({
			min: 10000,
			max: 20000,
		});
		expect(parsePriceBounds("Mulai Rp 120.000")).toEqual({
			min: 120000,
			max: 120000,
		});
		expect(parsePriceBounds("15k - 25k")).toEqual({ min: 15000, max: 25000 });
		expect(parsePriceBounds(null)).toEqual({ min: null, max: null });
		expect(parsePriceBounds("Gratis")).toEqual({ min: null, max: null });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/api/test/price.test.ts`
Expected: FAIL (cannot find module `../src/lib/price`)

- [ ] **Step 3: Implement `apps/api/src/lib/price.ts`**

Export `PriceTier` and `parsePriceBounds(priceRange)` matching the frontend `parsePriceBounds` logic in `apps/web/app/routes/explore.tsx` (handles `Rp 15.000`, `15k`, single values, ranges, and null/unparseable strings).

- [ ] **Step 4: Update Drizzle schemas & relations**

- In `apps/api/src/database/schema/places.ts`:
  - Add `district: text("district")`, `priceRange: text("price_range")`, `priceMin: integer("price_min")`, `priceMax: integer("price_max")`, `viewsTotal: integer("views_total").notNull().default(0)` to `places`.
  - Allow `OpeningHours` type to be `Partial<Record<...>> | string`.
  - Add `bookmarks` pgTable with `id`, `userId` (FK `users.id` cascade), `placeId` (FK `places.id` cascade), `createdAt`, `uniqueIndex("bookmarks_user_place_uq").on(t.userId, t.placeId)`, `index("bookmarks_user_idx").on(t.userId)`.
- In `apps/api/src/database/schema/reviews.ts`:
  - Add `reviewLikes` pgTable with `id`, `userId` (FK `users.id` cascade), `reviewId` (FK `reviews.id` cascade), `createdAt`, `uniqueIndex("review_likes_user_review_uq").on(t.userId, t.reviewId)`, `index("review_likes_review_idx").on(t.reviewId)`.
- In `apps/api/src/database/schema/claims.ts`:
  - Add `businessRole?: string` to `ClaimEvidence`.
- In `apps/api/src/database/relations.ts`:
  - Add `bookmarks` and `reviewLikes` relations on `users`, `places`, `reviews`, `bookmarks`, `reviewLikes`.

- [ ] **Step 5: Push schema to local DB & run `price.test.ts`**

Run: `bun run db push --force` (in `apps/api`) and `bun test apps/api/test/price.test.ts`
Expected: DB schema synced, `price.test.ts` PASS.

- [ ] **Step 6: Commit**

Commit schema and `price.ts` changes.

---

### Task 2: Ranking Formula & Place View Counter Sync

**Files:**

- Modify: `apps/api/src/lib/ranking.ts`
- Modify: `apps/api/src/routes/places/service.ts` (`recordPlaceView`)
- Test: `apps/api/test/ranking.test.ts`

**Interfaces:**

- `computeScores` in `apps/api/src/lib/ranking.ts` adds optional `viewsTotal?: number` (defaults to `0`).
- `hiddenGemScore` uses `ratingAvg * (1 / (1 + reviewCount + Math.log10(1 + (input.viewsTotal ?? 0))))` when `ratingAvg >= 4.0 && reviewCount > 0`.
- `recordPlaceView(placeId)` atomically increments `places.viewsTotal` and upserts `placeStats`.

- [ ] **Step 1: Add test in `apps/api/test/ranking.test.ts` for `viewsTotal` decay in `hiddenGemScore`**

```ts
test("computeScores applies view exposure decay to hiddenGemScore when viewsTotal > 0", () => {
	const noViews = computeScores({
		ratingAvg: 4.5,
		reviewCount: 4,
		lastReviewAt: new Date(),
		communityVerified: false,
		ownerVerified: false,
		viewsTotal: 0,
	});
	const highViews = computeScores({
		ratingAvg: 4.5,
		reviewCount: 4,
		lastReviewAt: new Date(),
		communityVerified: false,
		ownerVerified: false,
		viewsTotal: 999,
	});
	expect(highViews.hiddenGemScore).toBeLessThan(noViews.hiddenGemScore);
});
```

- [ ] **Step 2: Run `bun test apps/api/test/ranking.test.ts` to verify failure**

Expected: FAIL (`highViews.hiddenGemScore` equals `noViews.hiddenGemScore`).

- [ ] **Step 3: Update `computeScores` and `recomputePlaceStats` in `apps/api/src/lib/ranking.ts` and `recordPlaceView` in `apps/api/src/routes/places/service.ts`**

- In `computeScores`: accept `viewsTotal?: number` (default `0`), use `input.ratingAvg * (1 / (1 + input.reviewCount + Math.log10(1 + (input.viewsTotal ?? 0))))`.
- In `recomputePlaceStats`: select `viewsTotal` from `schema.places` and pass to `computeScores`.
- In `recordPlaceView(placeId)`: inside a transaction (or sequential), increment `places.viewsTotal = sql`${schema.places.viewsTotal} + 1`` and upsert `placeStats`.

- [ ] **Step 4: Run `bun test apps/api/test/ranking.test.ts`**

Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 3: Place Discovery, Detail, and Write Alignment

**Files:**

- Modify: `apps/api/src/routes/places/model.ts`
- Modify: `apps/api/src/routes/places/service.ts`
- Modify: `apps/api/src/routes/places/index.ts`
- Test: `apps/api/test/places-discovery.test.ts`
- Test: `apps/api/test/places-write.test.ts`

**Interfaces:**

- `PlaceSort`: `"explore" | "newest" | "rating" | "nearby" | "reviews" | "views" | "az" | "za"`
- `PlaceVerified`: `"community" | "owner" | "any" | "unverified"`
- `PriceTierSchema`: `"under_25k" | "25k_50k" | "50k_100k" | "over_100k"`
- `PlaceListQuery` adds: `district?`, `minRating?`, `priceTier?`, `onlyHiddenGem?`, `onlyBookmarked?`
- `HiddenGemsQuery` adds: `district?`, `verified?`
- `PlaceListItem` adds: `district: string | null`, `priceRange: string | null`, `views: number`, `bookmarked: boolean`
- `PlaceDetail` adds: `district: string | null`, `priceRange: string | null`, `views: number`, `bookmarked: boolean`, `createdByName: string | null`, `ownerId: string | null`
- `CreatePlaceBody` & `AdminUpdatePlaceBody` add optional `district`, `priceRange` (and `openingHours` allows string or structured object).

- [ ] **Step 1: Write failing tests in `apps/api/test/places-discovery.test.ts`**

Add tests for:

- `GET /places` with `district`, `minRating=4.0`, `priceTier=under_25k`, `onlyHiddenGem=true`, `verified=unverified`, `sort=reviews|views|az|za`.
- `GET /places?onlyBookmarked=true` as unauthenticated visitor returns `data: []`, `meta.total: 0`.
- `GET /places/hidden-gems?district=...&verified=...` filters properly.
- `GET /places/:slug` returns `district`, `priceRange`, `views`, `bookmarked`, `createdByName`, `ownerId`.

- [ ] **Step 2: Run `bun test apps/api/test/places-discovery.test.ts` to verify failures**

- [ ] **Step 3: Update `apps/api/src/routes/places/model.ts`, `index.ts`, and `service.ts`**

- Wire `optionalAuth` on `GET /places` and `GET /places/hidden-gems` in `places/index.ts` so `ctx.sessionUser` is passed to `listPlaces` and `listHiddenGems`.
- Update `PlaceListQuery`, `HiddenGemsQuery`, `PlaceListItem`, `PlaceDetail`, `CreatePlaceBody`, `AdminUpdatePlaceBody` in `places/model.ts`.
- In `places/service.ts`:
  - Expand `q` search to include `address` and `district`.
  - Add filters for `district`, `minRating`, `priceTier` (using `priceMin`/`priceMax` overlap/bounds matching frontend `matchesPriceTier`), `onlyHiddenGem` (`ratingAvg >= 4.0 AND reviewCount > 0`), `onlyBookmarked` (subquery on `bookmarks` for `sessionUser.id`, or empty if no `sessionUser`), `verified="unverified"` (`communityVerified = false AND ownerVerified = false`).
  - Add orderBy branches for `reviews` (`reviewCount DESC`), `views` (`viewsTotal DESC`), `az` (`name ASC`), `za` (`name DESC`).
  - Hydrate `bookmarked` boolean on list & detail when `sessionUser` is present.
  - Hydrate `createdByName` (leftJoin `users`) and `ownerId` (from approved `businessClaims`) on `getPlaceDetail`.
  - In `createPlace` and `adminUpdatePlace`, persist `district`, `priceRange`, and computed `priceMin`/`priceMax`.

- [ ] **Step 4: Run `bun test apps/api/test/places-discovery.test.ts apps/api/test/places-write.test.ts`**

Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 4: Bookmarks & Review Likes Endpoints

**Files:**

- Create: `apps/api/src/routes/bookmarks/model.ts`
- Create: `apps/api/src/routes/bookmarks/service.ts`
- Create: `apps/api/src/routes/bookmarks/index.ts`
- Modify: `apps/api/src/app.ts` (register `bookmarkRoutes`)
- Modify: `apps/api/src/routes/reviews/model.ts`
- Modify: `apps/api/src/routes/reviews/service.ts`
- Modify: `apps/api/src/routes/reviews/index.ts`
- Modify: `apps/api/src/routes/owner/service.ts` (if it calls `ReviewItem` serializer)
- Test: `apps/api/test/bookmarks.test.ts`
- Test: `apps/api/test/reviews.test.ts`

**Interfaces:**

- `GET /api/bookmarks` (auth) → `{ data: PlaceListItem[], meta }`
- `POST /api/places/:id/bookmark` (auth) → `{ data: { bookmarked: true } }` (idempotent)
- `DELETE /api/places/:id/bookmark` (auth) → `{ data: { bookmarked: false } }`
- `POST /api/reviews/:id/like` (auth) → `{ data: { liked: true, likeCount: number } }` (idempotent)
- `DELETE /api/reviews/:id/like` (auth) → `{ data: { liked: false, likeCount: number } }`
- `ReviewItem` in `reviews/model.ts` adds `likeCount: number`, `liked: boolean`.

- [ ] **Step 1: Write failing tests in `apps/api/test/bookmarks.test.ts` and `apps/api/test/reviews.test.ts`**

Test:

- `POST /places/:id/bookmark` (idempotent on repeat), `GET /bookmarks`, `DELETE /places/:id/bookmark`, 401 when unauthenticated, 404 for unknown place.
- `POST /reviews/:id/like` (idempotent on repeat), `DELETE /reviews/:id/like`, and `GET /places/:id/reviews` returns accurate `likeCount` and `liked`.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test apps/api/test/bookmarks.test.ts apps/api/test/reviews.test.ts`

- [ ] **Step 3: Implement `bookmarks` route module and register in `app.ts`; implement review likes in `reviews/`**

- `bookmarks/service.ts` reuses `listPlaces(..., { onlyBookmarked: true, ... })` for `GET /bookmarks`, and `onConflictDoNothing()` for `POST /places/:id/bookmark`.
- `reviews/service.ts` adds `likeReview` / `unlikeReview` and batch-loads `likeCount` and `liked` per review ID in `serializeReviews` / `listReviews` / `listOwnerPlaceReviews`.

- [ ] **Step 4: Run `bun test apps/api/test/bookmarks.test.ts apps/api/test/reviews.test.ts`**

Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 5: Claims, Owner Dashboard & Admin Alignment

**Files:**

- Modify: `apps/api/src/routes/claims/model.ts`
- Modify: `apps/api/src/routes/claims/service.ts`
- Modify: `apps/api/src/routes/owner/model.ts`
- Modify: `apps/api/src/routes/owner/service.ts`
- Modify: `apps/api/src/routes/admin/model.ts`
- Modify: `apps/api/src/routes/admin/service.ts`
- Modify: `apps/api/test/owner.test.ts`
- Test: `apps/api/test/claims.test.ts`
- Test: `apps/api/test/admin.test.ts`

**Interfaces:**

- `ClaimEvidenceSchema`: add `businessRole: t.Optional(t.String({ maxLength: 100 }))`.
- `RejectClaimBody`: `note: t.Optional(t.String({ maxLength: 500 }))` (defaults to `null` or `""` when omitted).
- `MyClaimItem`: add `placeName: string`, `claimantName: string`, `evidence: ClaimEvidenceSchema`.
- `UpdateOwnerPlaceBody` & `owner/service.ts`:
  - Allow `name` and `priceRange` (computing `priceMin`/`priceMax`), plus `openingHours` as object or string.
  - Keep `categoryId`, `latitude`, `longitude`, `status` in `IDENTITY_FIELDS` (rejected with 403 + `fields`).
- `OwnerPlaceListItem`: add `district`, `priceRange`, `views`, `exploreScore`, `hiddenGemScore`, `description`, `openingHours`.
- `AdminPlaceItem`: add `district`, `priceRange`, `views`, `exploreScore`, `hiddenGemScore`.
- `ResolveAnomalyBody`: accept `status: "dismissed" | "confirmed" | "cleared" | "flagged_hold"` (mapping `"cleared" -> "dismissed"`, `"flagged_hold" -> "confirmed"`) and `note: t.Optional(t.String({ maxLength: 500 }))`.

- [ ] **Step 1: Write failing tests in `claims.test.ts`, `owner.test.ts`, `admin.test.ts`**

- `claims.test.ts`: submit claim with `evidence.businessRole`, reject claim without `note`, verify `GET /claims/mine` includes `placeName`, `claimantName`, `evidence`.
- `owner.test.ts`: update `name`, `priceRange`, and string `openingHours` via `PATCH /owner/places/:id` -> 200; update `categoryId` + `status` -> 403 with `fields`. Verify `GET /owner/places` includes `district`, `priceRange`, `views`, `exploreScore`, `hiddenGemScore`.
- `admin.test.ts`: resolve anomaly with `status: "cleared"` and omitted `note` -> 200 and persisted as `"dismissed"`.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test apps/api/test/claims.test.ts apps/api/test/owner.test.ts apps/api/test/admin.test.ts`

- [ ] **Step 3: Implement changes in `claims/`, `owner/`, and `admin/`**

- [ ] **Step 4: Run full verification**

Run: `bun test` (in `apps/api`), `bun run typecheck`, `bun run lint` (from root).
Expected: All PASS.

- [ ] **Step 5: Commit**
