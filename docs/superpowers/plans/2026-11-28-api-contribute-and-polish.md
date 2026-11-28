# API Contribute, XP, Feed & Admin/Owner Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all remaining gaps between `apps/api` and the completed `apps/web/app/` frontend (XP/contributions, community info suggestions, activity feed, rating histogram, list DTO fields, admin/owner filters, and category seeding).

**Architecture:** Build on the existing `xp_events` table and `users.xp_total` column with a shared `awardXp` helper inside transactions, add `POST /api/places/:id/suggestions` and `GET /api/me/contributions` and `GET /api/activity`, and extend existing `places`, `bookmarks`, `auth`, `owner`, `claims`, and `admin` models/services while preserving backward compatibility with all 117 existing tests.

**Tech Stack:** Bun, TypeScript, ElysiaJS + TypeBox, Drizzle ORM, PostgreSQL, `bun:test`.

**Spec:** Frontend implementation in `apps/web/app/` (`routes/contribute*.tsx`, `components/contribute/*`, `components/home/latest-updates-section.tsx`, `components/place-detail/place-rating-summary.tsx`, `components/place-card.tsx`, `components/admin/*`, `routes/owner.tsx`, `routes/register.tsx`).

## Global Constraints

- Base path `/api`; responses `{ data }` (and `{ data, meta }` for lists); errors `{ error: { code, message, fields? } }`.
- TypeBox models in `routes/*/model.ts` must match actual handler returns for Eden Treaty type safety.
- Preserve all existing passing tests (`cd apps/api && bun test`) — do not break existing contracts (e.g. `paginationMeta` `totalPages >= 1`, `rejectClaim`/`resolveAnomaly` status codes).
- All changes must pass `cd apps/api && bun test`, `bun run typecheck`, and `npx biome check` on touched files.

## Review Focus

- `POST /api/places/:id/suggestions` with empty body (no fields changed and no `note`): must reject with `422 VALIDATION_ERROR`, not silently succeed or award XP.
- `awardXp` called inside `createPlace`, `createReview`, `addPlacePhotos`, `suggestPlaceUpdate`: must execute in the **same transaction** as the mutation so failed mutations never grant XP.
- `GET /api/me/contributions` when user has 0 events: must return `xpTotal: 0`, `level: 1`, zeroed counts, and empty `timeline: []`.
- `GET /api/admin/places|claims|anomalies` with `status=all`: must return all statuses instead of filtering to `"pending"`/`"open"`, while omitting `status` still defaults to `"pending"`/`"open"` (preserving existing `admin.test.ts` & `claims.test.ts`).
- `GET /api/activity` when DB has 0 places/reviews: must return `{ data: [] }` without error.

---

### Task 1: XP Engine, Auth `xpTotal`, and `GET /api/me/contributions`

**Files:**
- Create: `apps/api/src/lib/xp.ts`
- Create: `apps/api/src/routes/contributions/model.ts`
- Create: `apps/api/src/routes/contributions/service.ts`
- Create: `apps/api/src/routes/contributions/index.ts`
- Modify: `apps/api/src/app.ts` (register `contributionRoutes`)
- Modify: `apps/api/src/routes/auth/model.ts` (`UserResponse` adds `xpTotal`)
- Modify: `apps/api/src/routes/auth/service.ts` (`publicUser` adds `xpTotal`)
- Modify: `apps/api/src/routes/places/service.ts` (`createPlace` & `addPlacePhotos` award XP)
- Modify: `apps/api/src/routes/reviews/service.ts` (`createReview` awards XP)
- Test: `apps/api/test/contributions.test.ts`

**Interfaces:**
- Produces `apps/api/src/lib/xp.ts`:
  - `export const XP_REWARDS = { add_place: 15, write_review: 8, add_photo: 5, update_info: 4 } as const`
  - `export function getContributorLevel(xp: number): { level: number; title: string; xp: number; currentLevelMinXp: number; nextLevelXp: number | null; nextLevelTitle: string | null; progressPercent: number; xpToNext: number }` (matching `apps/web/app/data/contribute-xp.ts`)
  - `export async function awardXp(tx: DbOrTx, input: { userId: string; placeId?: string | null; action: keyof typeof XP_REWARDS; summary: string }): Promise<void>` (inserts `xpEvents` row and increments `users.xpTotal`)
- Produces `GET /api/me/contributions` (auth):
  - Response `{ data: { xpTotal, level, counts: { places, reviews, photos, edits }, timeline: Array<{ id, action, xpDelta, summary, placeId, placeSlug, placeName, createdAt }> } }`
- `UserResponse` & `publicUser`: adds `xpTotal: number`.

- [ ] **Step 1: Write failing tests in `apps/api/test/contributions.test.ts`**

Test:
- `GET /api/me/contributions` returns 401 when unauthenticated.
- Fresh user gets `xpTotal: 0`, `level.level: 1`, zeroed counts, `timeline: []`, and `GET /api/auth/me` includes `xpTotal: 0`.
- Creating a place (`POST /api/places`) awards +15 XP; creating a review (`POST /api/places/:id/reviews`) awards +8 XP; adding photos (`POST /api/places/:id/photos`) awards +5 XP.
- `GET /api/me/contributions` reflects updated `xpTotal`, `counts`, and `timeline` newest-first.

- [ ] **Step 2: Run test to verify failure**

Run: `cd apps/api && bun test test/contributions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/xp.ts`, `routes/contributions/*`, `auth` `xpTotal`, and XP awards in `places` & `reviews`**

- `awardXp(tx, input)` inserts into `schema.xpEvents` and updates `schema.users` `set({ xpTotal: sql`${schema.users.xpTotal} + ${delta}` })`.
- `createPlace` calls `awardXp(tx, { userId: user.id, placeId: place.id, action: "add_place", summary: `Menambahkan tempat ${body.name}` })`.
- `createReview` calls `awardXp(tx, { userId: user.id, placeId, action: "write_review", summary: `Mengulas ${place.name}` })`.
- `addPlacePhotos` calls `awardXp(tx, { userId: user.id, placeId, action: "add_photo", summary: `Menambahkan ${photoMediaIds.length} foto` })` inside its transaction.
- `GET /api/me/contributions` queries `users.xpTotal`, `xpEvents` left-joined with `places` (`slug`, `name`) ordered `createdAt DESC`, and computes `counts` per action.

- [ ] **Step 4: Run tests and typecheck**

Run: `cd apps/api && bun test test/contributions.test.ts test/auth.test.ts test/places-write.test.ts test/reviews.test.ts && cd ../.. && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 2: Community Update Suggestion Endpoint & Place Photo Limit

**Files:**
- Modify: `apps/api/src/routes/places/model.ts` (`AddPlacePhotosBody` `maxItems: 6`, add `SuggestPlaceUpdateBody`)
- Modify: `apps/api/src/routes/places/service.ts` (`suggestPlaceUpdate`)
- Modify: `apps/api/src/routes/places/index.ts` (`POST /:id/suggestions`)
- Test: `apps/api/test/places-write.test.ts`

**Interfaces:**
- Consumes `awardXp` from `apps/api/src/lib/xp.ts` (Task 1) and `parsePriceBounds` from `apps/api/src/lib/price.ts`.
- `POST /api/places/:id/suggestions` (auth):
  - Body: `{ address?: string | null, openingHours?: OpeningHoursInput | null, priceRange?: string | null, phone?: string | null, description?: string | null, note?: string }`
  - Rejects empty submission (no fields provided and no non-empty `note`) with `422 VALIDATION_ERROR`.
  - Updates published place (`404` if not found or not `"published"`), recomputes `priceMin`/`priceMax` if `priceRange` provided, awards `update_info` XP (+4) in the same transaction, returns `{ data: PlaceDetail }`.
- `AddPlacePhotosBody`: `maxItems: 6`.

- [ ] **Step 1: Write failing tests in `apps/api/test/places-write.test.ts`**

Test:
- `POST /api/places/:id/suggestions` unauthenticated -> 401.
- `POST /api/places/:id/suggestions` with `{}` -> 422.
- `POST /api/places/:id/suggestions` with `{ address: "Jl. Baru", priceRange: "Rp 20.000 - Rp 40.000", note: "Jam buka baru" }` -> 200, updates place, and increments user `xpTotal` by +4.
- `POST /api/places/:id/photos` accepts 6 photos (and rejects 7 with 422).

- [ ] **Step 2: Run test to verify failure**

Run: `cd apps/api && bun test test/places-write.test.ts`

- [ ] **Step 3: Implement `SuggestPlaceUpdateBody`, `suggestPlaceUpdate`, route handler, and `maxItems: 6`**

- [ ] **Step 4: Run tests and typecheck**

Run: `cd apps/api && bun test test/places-write.test.ts test/contributions.test.ts && cd ../.. && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 3: Discovery, Detail, and Home Activity Feed Enhancements

**Files:**
- Modify: `apps/api/src/routes/places/model.ts` (`PlaceListItem`, `PlaceDetail`, `PlaceVerified`, `HiddenGemsQuery`)
- Modify: `apps/api/src/routes/places/service.ts` (`listPlaces`, `listHiddenGems`, `getPlaceDetail`, `listRecentActivity`)
- Modify: `apps/api/src/routes/places/index.ts` (`GET /activity`)
- Modify: `apps/api/src/routes/bookmarks/model.ts` (`BookmarkListQuery` adds `q`)
- Modify: `apps/api/src/routes/bookmarks/service.ts` (pass `q` to `listPlaces`)
- Modify: `apps/api/src/app.ts` or `places/index.ts` (mount `GET /api/activity`)
- Test: `apps/api/test/places-discovery.test.ts`
- Test: `apps/api/test/bookmarks.test.ts`

**Interfaces:**
- `PlaceListItem`: adds `description: t.Nullable(t.String())`, `openingHours: t.Nullable(t.Any())`.
- `PlaceDetail`: adds `ratingHistogram: t.Object({ "1": t.Number(), "2": t.Number(), "3": t.Number(), "4": t.Number(), "5": t.Number() })`.
- `PlaceVerified`: accepts `"community" | "owner" | "any" | "unverified" | "community_verified" | "owner_verified"` (mapping `community_verified -> community`, `owner_verified -> owner`).
- `HiddenGemsQuery` & `BookmarkListQuery`: add `q: t.Optional(t.String({ maxLength: 80 }))`.
- `GET /api/activity` (public, query `limit?` 1..20 default 9): returns `{ data: Array<{ id, kind: "review" | "place", placeId, placeSlug, placeName, district, coverUrl, description, authorName, rating: number | null, comment: string | null, createdAt }> }` sorted by `createdAt DESC`.

- [ ] **Step 1: Write failing tests in `places-discovery.test.ts` and `bookmarks.test.ts`**

Test:
- `GET /api/places` returns `description` and `openingHours` on items, and accepts `verified=community_verified` / `verified=owner_verified`.
- `GET /api/places/hidden-gems?q=...` filters by keyword.
- `GET /api/bookmarks?q=...` filters bookmarked places by keyword.
- `GET /api/places/:slug` returns `ratingHistogram` (`{ "1": 0, ..., "5": 1 }`).
- `GET /api/activity` returns combined latest reviews & places (empty `{ data: [] }` when none).

- [ ] **Step 2: Run tests to verify failure**

Run: `cd apps/api && bun test test/places-discovery.test.ts test/bookmarks.test.ts`

- [ ] **Step 3: Implement changes in `places/` and `bookmarks/`**

- [ ] **Step 4: Run tests and typecheck**

Run: `cd apps/api && bun test test/places-discovery.test.ts test/bookmarks.test.ts && cd ../.. && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 4: Auth, Admin, Claims & Owner Polish + Categories Seed

**Files:**
- Modify: `apps/api/src/routes/auth/model.ts` (`RegisterBody.password` `minLength: 6`)
- Modify: `apps/api/src/routes/admin/model.ts` (`AdminPlacesQuery`, `AdminAnomaliesQuery`, `AdminAnomalyResolveResponse`)
- Modify: `apps/api/src/routes/admin/service.ts` (`listAdminPlaces`, `listAdminAnomalies`, `resolveAnomaly`)
- Modify: `apps/api/src/routes/claims/model.ts` (`AdminClaimsQuery`, `AdminClaimItem`)
- Modify: `apps/api/src/routes/claims/service.ts` (`listAdminClaims`)
- Modify: `apps/api/src/routes/owner/model.ts` (`OwnerPlaceListItem` adds `categoryName`)
- Modify: `apps/api/src/routes/owner/service.ts` (`listOwnerPlaces` joins `categories` + counts `pendingClaims`)
- Create: `apps/api/src/database/seed.ts` (idempotent category seed for `Makanan berat`, `Minuman`, `Street food`, `Dessert`)
- Modify: `apps/api/package.json` (add `"db:seed": "bun run src/database/seed.ts"`)
- Modify: `apps/api/test/auth.test.ts` (update 7-char password test to 5-char password for 422, or keep boundary test matching `minLength: 6`)
- Test: `apps/api/test/admin.test.ts`
- Test: `apps/api/test/claims.test.ts`
- Test: `apps/api/test/owner.test.ts`

**Interfaces:**
- `AdminPlacesQuery`: `status?: "all" | "pending" | "published" | "rejected" | "archived"`, `q?`, `district?`, `verified?: PlaceVerified`.
- `AdminClaimsQuery`: `status?: "all" | "pending" | "approved" | "rejected"`, `q?` (matches claimant name/email, place name, businessRole, note).
- `AdminClaimItem`: adds `documentUrls: t.Array(t.String())` resolved from `evidence.documentMediaIds`.
- `AdminAnomaliesQuery`: `status?: "all" | "open" | "dismissed" | "confirmed"`, `q?` (matches place name or reason).
- `OwnerPlaceListItem`: adds `categoryName: t.String()` and computes real `pendingClaims`.

- [ ] **Step 1: Write failing tests in `auth.test.ts`, `admin.test.ts`, `claims.test.ts`, `owner.test.ts`**

Test:
- `POST /api/auth/register` accepts 6-char password (201) and rejects 5-char password (422).
- `GET /api/admin/places?status=all&district=...&q=...` returns all statuses filtered by district/q.
- `GET /api/admin/claims?status=all&q=...` returns all claim statuses and includes `documentUrls`.
- `GET /api/admin/anomalies?status=all&q=...` returns all anomaly statuses filtered by q.
- `GET /api/owner/places` includes `categoryName` and accurate `pendingClaims` count.

- [ ] **Step 2: Run tests to verify failure**

Run: `cd apps/api && bun test test/auth.test.ts test/admin.test.ts test/claims.test.ts test/owner.test.ts`

- [ ] **Step 3: Implement auth, admin, claims, owner updates and `database/seed.ts`**

- [ ] **Step 4: Run full verification**

Run: `cd apps/api && bun run db:seed && bun test && cd ../.. && bun run typecheck && npx biome check apps/api/src apps/api/test`
Expected: All tests PASS, 0 type errors, 0 biome errors on touched files.

- [ ] **Step 5: Commit**
