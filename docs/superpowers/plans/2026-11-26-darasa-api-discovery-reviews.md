# Darasa API — Discovery & Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement culinary place discovery (categories, Explore ranking, Hidden Gem, detail, view stats), community place/photo contributions, and user reviews with denormalized score recomputation and Z-score anomaly flagging.

**Architecture:** Modular Elysia 2 routes under `routes/categories/`, `routes/places/`, and `routes/reviews/`, backed by shared domain helpers in `lib/ranking.ts` (score formulas + transactional aggregate recomputation) and `lib/anomaly.ts` (Z-score outlier + burst detection). Public read endpoints that vary by caller (`GET /places/:slug` for unpublished places, `GET /places/:id/reviews` for `mine`) use an `optionalAuth` plugin so anonymous visitors work while authenticated callers get context-aware responses.

**Tech Stack:** Bun 1.4.4, Elysia 2.0.0-rc.3, Drizzle ORM 1.0.0-rc.5, Postgres, `bun test`.

**Spec:** `apps/api/API.md` (authoritative for contracts), `AGENTS.md` (PRD requirements).

## Global Constraints

- **Route order in Elysia 2 is `(path, hook, handler)`.** Never use `.get(path, handler, hook)`.
- **Do not use Elysia macros.** Use the `sessionPlugin` / `requireAuth` / `requireAdmin` / `optionalAuth` plugin pattern with `"plugin"` scope.
- **`onError` in `plugins/errors.ts` already handles `ApiError`, `ValidationError`, `NotFound`, `ParseError`.** Throw `ApiError` / `notFound` / `forbidden` / `conflict` from `src/utils.ts`.
- Tabs, double quotes, Biome (`bunx biome check --write`). `bun check` for types.
- All ids are UUIDv4. All timestamps are ISO 8601 UTC strings in responses.
- Success envelope `{ data }`, paginated lists `{ data, meta: { page, limit, total, totalPages } }`.
- Pagination: `page` (1-based, default 1), `limit` (default 20, max 50).
- `places` has no `owner_id`; approved ownership is always queried from `business_claims` (`status = 'approved'`).
- Rating is `smallint 1..5`; `body` on reviews is optional, 10–2000 chars when provided.
- `photoMediaIds` (max 5) must be `status = 'ready'`, matching `purpose`, and owned by the caller — else `403`.
- Media URLs are derived from `storage.publicUrl(key) ?? storage.presignGet(key, 600)` (never stored as URLs in DB).

## Review Focus

1. **`GET /places?sort=nearby` without `lat`/`lng`, or with out-of-range coordinates (`lat=95`).** Expected: `422 VALIDATION_ERROR`, never a `500` or silent fallback to `explore` sort. — test in Task 3.
2. **`GET /places/:slug` for a `pending`, `rejected`, or `archived` place.** Expected: `404` for anonymous visitors and unrelated users, `200` for an `admin` or a user with an `approved` claim on that place. — test in Task 3.
3. **`POST /places/:id/reviews` when the place already has >= 10 identical 5-star reviews (`stdDev === 0`).** Expected: `201` with no `NaN` or division-by-zero error and no false `rating_outlier` flag. — test in Task 6.
4. **`POST /places/:id/reviews` when the caller submits a `photoMediaIds` belonging to another user, or with `purpose = 'place_photo'`, or still `pending`.** Expected: `403 FORBIDDEN`, no review row inserted. — test in Task 6.
5. **`DELETE /places/:id/photos/:photoId` when removing the current `coverMediaId`.** Expected: `204` and `places.coverMediaId` updated to the next remaining photo by `sortOrder` (or `null` if none remain). — test in Task 5.

---

## Task 1: Optional auth plugin, public media URL helper, and ranking engine

**Files:**

- Modify: `apps/api/src/plugins/guard.ts` (add `optionalAuth`)
- Modify: `apps/api/src/routes/media/service.ts` (export `resolveMediaUrl` and `assertOwnedReadyMedia`)
- Create: `apps/api/src/lib/ranking.ts`
- Create: `apps/api/test/ranking.test.ts`

**Interfaces:**

- Consumes: `resolveSession`, `SESSION_COOKIE`, `db`, `schema`, `Storage`, `forbidden`
- Produces:
  - `plugins/guard.ts`: `optionalAuth: Elysia` — derives `sessionUser: SessionUser | null` without throwing `401`
  - `routes/media/service.ts`:
    - `resolveMediaUrl(storage: Storage, key: string): Promise<string>`
    - `assertOwnedReadyMedia(tx: DbOrTx, userId: string, mediaIds: string[], purpose: "place_photo" | "review_photo" | "claim_document"): Promise<void>` — throws `ApiError("FORBIDDEN", 403, ...)` if any id is missing, not owned by `userId`, `status !== "ready"`, or `purpose !== purpose`
  - `lib/ranking.ts`:
    - `computeScores(input: { ratingAvg: number; reviewCount: number; lastReviewAt: Date | null; communityVerified: boolean; ownerVerified: boolean; now?: Date }): { exploreScore: number; hiddenGemScore: number }`
    - `recomputePlaceStats(tx: DbOrTx, placeId: string, now?: Date): Promise<void>` — queries published reviews (`status = 'published'`) for `placeId`, computes `ratingAvg`, `reviewCount`, `lastReviewAt`, calls `computeScores`, updates `places`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/ranking.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { computeScores } from "../src/lib/ranking";

describe("computeScores", () => {
	const now = new Date("2026-11-26T00:00:00.000Z");

	test("zero reviews yields zero hiddenGemScore and verification-only exploreScore", () => {
		const res = computeScores({
			ratingAvg: 0,
			reviewCount: 0,
			lastReviewAt: null,
			communityVerified: false,
			ownerVerified: true,
			now,
		});
		expect(res.hiddenGemScore).toBe(0);
		expect(res.exploreScore).toBeCloseTo(0.1, 6);
	});

	test("hiddenGemScore requires ratingAvg >= 4.0 and reviewCount > 0", () => {
		const low = computeScores({
			ratingAvg: 3.9,
			reviewCount: 3,
			lastReviewAt: now,
			communityVerified: false,
			ownerVerified: false,
			now,
		});
		expect(low.hiddenGemScore).toBe(0);

		const eligible = computeScores({
			ratingAvg: 4.5,
			reviewCount: 2,
			lastReviewAt: now,
			communityVerified: true,
			ownerVerified: false,
			now,
		});
		expect(eligible.hiddenGemScore).toBeCloseTo(4.5 * (1 / 3), 6);
		// 0.5*(4.5/5) + 0.2*(ln(3)/ln(51)) + 0.2*1 + 0.1*0.5
		const expectedExplore =
			0.5 * (4.5 / 5) +
			0.2 * (Math.log(3) / Math.log(51)) +
			0.2 * 1 +
			0.1 * 0.5;
		expect(eligible.exploreScore).toBeCloseTo(expectedExplore, 6);
	});

	test("caps volumePart at 1 for >= 50 reviews and decays recency over 30 days", () => {
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const res = computeScores({
			ratingAvg: 5,
			reviewCount: 100,
			lastReviewAt: thirtyDaysAgo,
			communityVerified: true,
			ownerVerified: true,
			now,
		});
		const expectedExplore = 0.5 * 1 + 0.2 * 1 + 0.2 * Math.exp(-1) + 0.1 * 1;
		expect(res.exploreScore).toBeCloseTo(expectedExplore, 6);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/ranking.test.ts`
Expected: FAIL — `Cannot find module "../src/lib/ranking"`.

- [ ] **Step 3: Implement `lib/ranking.ts`, `optionalAuth`, and media helpers**

- `apps/api/src/lib/ranking.ts`: implement `computeScores` per `API.md` formulas (`ratingPart = ratingAvg / 5`, `volumePart = Math.min(Math.log(1 + reviewCount) / Math.log(1 + 50), 1)`, `recencyPart = lastReviewAt ? Math.exp(-Math.max(0, ageDays) / 30) : 0`, `verifyPart = ownerVerified ? 1 : communityVerified ? 0.5 : 0`) and `recomputePlaceStats(tx, placeId, now?)` using `count()`, `avg()`, `max()` over `reviews` where `placeId` matches and `status = 'published'`.
- `apps/api/src/plugins/guard.ts`: add `optionalAuth = new Elysia({ name: "optional-auth" }).derive("plugin", ...)` returning `{ sessionUser: resolved?.user ?? null }`.
- `apps/api/src/routes/media/service.ts`: export `resolveMediaUrl(storage, key)` (`storage.publicUrl(key) ?? storage.presignGet(key, UPLOAD_EXPIRES_IN)`) and `assertOwnedReadyMedia(tx, userId, mediaIds, purpose)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/ranking.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/ranking.ts apps/api/src/plugins/guard.ts \
  apps/api/src/routes/media/service.ts apps/api/test/ranking.test.ts
git commit -m "feat(api): ranking engine, optionalAuth guard, media attachment helpers"
```

---

## Task 2: Categories endpoint

**Files:**

- Create: `apps/api/src/routes/categories/model.ts`
- Create: `apps/api/src/routes/categories/service.ts`
- Create: `apps/api/src/routes/categories/index.ts`
- Create: `apps/api/test/categories.test.ts`
- Modify: `apps/api/src/app.ts` (mount `categoryRoutes`)

**Interfaces:**

- Consumes: `db`, `schema`
- Produces: `categoryRoutes: Elysia` — `GET /api/categories` returning `{ data: Array<{ id, name, slug, icon, sortOrder }> }` ordered by `sortOrder ASC, name ASC`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/categories.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { freshApp, json, resetDb } from "./helpers";

describe("GET /categories", () => {
	beforeEach(resetDb);

	test("returns categories ordered by sortOrder ascending", async () => {
		await db.insert(schema.categories).values([
			{ name: "Kafe", slug: "kafe", icon: "coffee", sortOrder: 2 },
			{ name: "Warung", slug: "warung", icon: "utensils", sortOrder: 1 },
		]);

		const res = await freshApp().handle(
			new Request("http://test/api/categories"),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.map((c: any) => c.slug)).toEqual(["warung", "kafe"]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/categories.test.ts`
Expected: FAIL — `404` route not found.

- [ ] **Step 3: Implement `routes/categories/{model,service,index}.ts` and mount in `app.ts`**

- `model.ts`: TypeBox `CategoryItem`, `CategoryListResponse`.
- `service.ts`: `listCategories()` querying `schema.categories` ordered by `asc(sortOrder), asc(name)`.
- `index.ts`: `categoryRoutes` with `GET /categories` in `(path, hook, handler)` order.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/categories.test.ts`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/categories apps/api/src/app.ts apps/api/test/categories.test.ts
git commit -m "feat(api): GET /categories endpoint"
```

---

## Task 3: Public place discovery (Explore, Hidden Gem, Detail, View stat)

**Files:**

- Create: `apps/api/src/routes/places/model.ts`
- Create: `apps/api/src/routes/places/service.ts`
- Create: `apps/api/src/routes/places/index.ts`
- Create: `apps/api/test/places-discovery.test.ts`
- Modify: `apps/api/src/app.ts` (mount `placeRoutes`)

**Interfaces:**

- Consumes: `db`, `schema`, `optionalAuth`, `resolveMediaUrl`, `ApiError`, `notFound`
- Produces:
  - `placeRoutes: Elysia`:
    - `GET /places` (`q`, `category`, `sort=explore|newest|rating|nearby`, `lat`, `lng`, `radiusKm`, `verified=community|owner|any`, `page`, `limit`)
    - `GET /places/hidden-gems` (`category`, `page`, `limit`)
    - `GET /places/:slug` (matches `slug` or UUID `id`; enforces visibility for non-published places)
    - `POST /places/:id/view` (`204`, upserts `place_stats` for `Asia/Jakarta` `YYYYMMDD`)
  - `places/service.ts` exports `getPlaceDetail(storage, idOrSlug, viewer)` so Task 4 & Plan 3 can reuse the detail serializer.

- [ ] **Step 1: Write the failing test**

`apps/api/test/places-discovery.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function seedPlaces() {
	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", icon: "utensils", sortOrder: 1 })
		.returning();
	const [pubHigh] = await db
		.insert(schema.places)
		.values({
			slug: "warung-bu-tini",
			name: "Warung Bu Tini",
			categoryId: cat.id,
			address: "Jl. Raya Batang",
			latitude: -6.9123,
			longitude: 109.7301,
			status: "published",
			communityVerified: true,
			ratingAvg: 4.8,
			reviewCount: 2,
			exploreScore: 0.75,
			hiddenGemScore: 1.6,
		})
		.returning();
	const [pubLow] = await db
		.insert(schema.places)
		.values({
			slug: "warung-biasa",
			name: "Warung Biasa",
			categoryId: cat.id,
			latitude: -7.1,
			longitude: 109.9,
			status: "published",
			ratingAvg: 3.5,
			reviewCount: 20,
			exploreScore: 0.85,
			hiddenGemScore: 0,
		})
		.returning();
	const [pending] = await db
		.insert(schema.places)
		.values({
			slug: "warung-pending",
			name: "Warung Pending",
			categoryId: cat.id,
			latitude: -6.91,
			longitude: 109.73,
			status: "pending",
		})
		.returning();
	return { cat, pubHigh, pubLow, pending };
}

describe("place discovery", () => {
	beforeEach(resetDb);

	test("GET /places returns only published places sorted by exploreScore desc", async () => {
		await seedPlaces();
		const res = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places"),
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.data.map((p: any) => p.slug)).toEqual([
			"warung-biasa",
			"warung-bu-tini",
		]);
		expect(body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
	});

	test("GET /places?sort=nearby requires lat/lng and orders by distance", async () => {
		await seedPlaces();
		const missing = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places?sort=nearby"),
		);
		expect(missing.status).toBe(422);

		const badLat = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places?sort=nearby&lat=95&lng=109.73"),
		);
		expect(badLat.status).toBe(422);

		const nearby = await freshApp({ storage: memoryStorage() }).handle(
			new Request(
				"http://test/api/places?sort=nearby&lat=-6.912&lng=109.73&radiusKm=5",
			),
		);
		expect(nearby.status).toBe(200);
		expect((await json(nearby)).data.map((p: any) => p.slug)).toEqual([
			"warung-bu-tini",
		]);
	});

	test("GET /places/hidden-gems filters ratingAvg >= 4.0 and reviewCount > 0", async () => {
		await seedPlaces();
		const res = await freshApp({ storage: memoryStorage() }).handle(
			new Request("http://test/api/places/hidden-gems"),
		);
		expect(res.status).toBe(200);
		expect((await json(res)).data.map((p: any) => p.slug)).toEqual([
			"warung-bu-tini",
		]);
	});

	test("GET /places/:slug hides pending places from visitors but allows admin and approved owner", async () => {
		const { pending } = await seedPlaces();
		const app = freshApp({ storage: memoryStorage() });

		const anon = await app.handle(
			new Request(`http://test/api/places/${pending.slug}`),
		);
		expect(anon.status).toBe(404);

		// register owner user and grant approved claim
		const reg = await app.handle(
			new Request("http://test/api/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: "Owner",
					email: "own@b.test",
					password: "min8chars",
				}),
			}),
		);
		const ownerCookie = cookieOf(reg)!;
		const [ownerUser] = await db.select().from(schema.users);
		await db.insert(schema.businessClaims).values({
			placeId: pending.id,
			claimantId: ownerUser.id,
			status: "approved",
			evidence: { note: "NIB", documentMediaIds: [], contactPhone: "+62812" },
		});

		const asOwner = await app.handle(
			new Request(`http://test/api/places/${pending.id}`, {
				headers: { cookie: ownerCookie },
			}),
		);
		expect(asOwner.status).toBe(200);
		expect((await json(asOwner)).data.slug).toBe(pending.slug);
	});

	test("POST /places/:id/view increments daily place_stats", async () => {
		const { pubHigh } = await seedPlaces();
		const app = freshApp({ storage: memoryStorage() });
		const r1 = await app.handle(
			new Request(`http://test/api/places/${pubHigh.id}/view`, {
				method: "POST",
			}),
		);
		const r2 = await app.handle(
			new Request(`http://test/api/places/${pubHigh.id}/view`, {
				method: "POST",
			}),
		);
		expect(r1.status).toBe(204);
		expect(r2.status).toBe(204);
		const rows = await db.select().from(schema.placeStats);
		expect(rows.length).toBe(1);
		expect(rows[0].views).toBe(2);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/places-discovery.test.ts`
Expected: FAIL — `404` route not found.

- [ ] **Step 3: Implement discovery routes in `routes/places/{model,service,index}.ts`**

- `model.ts`: `PlaceListQuery`, `HiddenGemsQuery`, `PlaceListItem`, `PlaceDetail`, `PaginatedPlacesResponse`. Validate `lat` (`-90..90`), `lng` (`-180..180`), `radiusKm` (`1..50`), `page` (`>=1`), `limit` (`1..50`).
- `service.ts`:
  - `listPlaces(storage, query)`: if `sort === "nearby"` and (`lat === undefined || lng === undefined`), throw `ApiError("VALIDATION_ERROR", 422, "lat and lng are required for nearby sort", { "/lat": "required", "/lng": "required" })`. Use bounding-box SQL prefilter (`lat ± radiusKm/111`, `lng ± radiusKm/(111*cos(lat))`) + Postgres haversine expression when `lat`/`lng` provided. Tie-break `explore_score DESC, review_count DESC, places.id ASC`.
  - `listHiddenGems(storage, query)`: `status = 'published'`, `reviewCount > 0`, `ratingAvg >= 4.0`, ordered `desc(hiddenGemScore), desc(reviewCount), asc(id)`.
  - `getPlaceDetail(storage, idOrSlug, viewer)`: detect UUID regex to match `id` or `slug`. If `place.status !== "published"`, check `viewer?.role === "admin"` or approved `businessClaims` row for `(place.id, viewer.id)` — else `notFound("Place")`.
  - `recordPlaceView(placeId)`: check place exists and `status = 'published'` (else `notFound("Place")`), compute `YYYYMMDD` integer in `Asia/Jakarta`, `INSERT ... ON CONFLICT (place_id, day) DO UPDATE SET views = place_stats.views + 1`.
- `index.ts`: mount `GET /places`, `GET /places/hidden-gems` (registered **before** `/places/:slug`), `GET /places/:slug` (with `optionalAuth`), `POST /places/:id/view`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/places-discovery.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/places apps/api/src/app.ts apps/api/test/places-discovery.test.ts
git commit -m "feat(api): place discovery, hidden gems, detail, and view stats"
```

---

## Task 4: Community place submission (`POST /places`)

**Files:**

- Modify: `apps/api/src/routes/places/model.ts` (add `CreatePlaceBody`)
- Modify: `apps/api/src/routes/places/service.ts` (add `createPlace`)
- Modify: `apps/api/src/routes/places/index.ts` (mount `POST /places` with `requireAuth`)
- Create: `apps/api/test/places-write.test.ts`

**Interfaces:**

- Consumes: `requireAuth`, `assertOwnedReadyMedia`, `getPlaceDetail`, `ApiError`
- Produces: `POST /api/places` (`201`, detail shape)

- [ ] **Step 1: Write the failing test**

`apps/api/test/places-write.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

async function setupUserAndCat(storage = memoryStorage()) {
	const app = freshApp({ storage });
	const reg = await app.handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Arya",
				email: "p@b.test",
				password: "min8chars",
			}),
		}),
	);
	const cookie = cookieOf(reg)!;
	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", sortOrder: 1 })
		.returning();
	return { app, cookie, cat };
}

describe("POST /places", () => {
	beforeEach(resetDb);

	test("creates a pending place with committed photos and sets coverMediaId", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);

		// upload + commit a photo
		const up = await app.handle(
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
		const { id: mediaId } = (await json(up)).data;
		const row = await db.query.media.findFirst({ where: { id: mediaId } });
		await storage.put(row!.key, PNG, "image/png");
		await app.handle(
			new Request(`http://test/api/media/${mediaId}/commit`, {
				method: "POST",
				headers: { cookie },
			}),
		);

		const res = await app.handle(
			new Request("http://test/api/places", {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({
					name: "Warung Bu Tini",
					categoryId: cat.id,
					latitude: -6.9123,
					longitude: 109.7301,
					address: "Jl. Raya Batang No. 12",
					photoMediaIds: [mediaId],
				}),
			}),
		);
		expect(res.status).toBe(201);
		const body = await json(res);
		expect(body.data.slug).toStartWith("warung-bu-tini-");
		expect(body.data.photos.length).toBe(1);
		expect(body.data.coverUrl).toBeTruthy();

		const dbPlace = await db.query.places.findFirst({
			where: { id: body.data.id },
		});
		expect(dbPlace!.status).toBe("pending");
	});

	test("enforces 3 submissions per user per day with 429", async () => {
		const { app, cookie, cat } = await setupUserAndCat();
		const post = (name: string) =>
			app.handle(
				new Request("http://test/api/places", {
					method: "POST",
					headers: { "content-type": "application/json", cookie },
					body: JSON.stringify({
						name,
						categoryId: cat.id,
						latitude: -6.91,
						longitude: 109.73,
					}),
				}),
			);
		expect((await post("P1")).status).toBe(201);
		expect((await post("P2")).status).toBe(201);
		expect((await post("P3")).status).toBe(201);
		const fourth = await post("P4");
		expect(fourth.status).toBe(429);
		expect((await json(fourth)).error.code).toBe("RATE_LIMITED");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/places-write.test.ts`
Expected: FAIL — `404` route not found.

- [ ] **Step 3: Implement `createPlace` and `POST /places`**

- Check rate limit: count `places` where `createdById = userId` and `createdAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)`; if `>= 3`, throw `new ApiError("RATE_LIMITED", 429, "Daily place submission limit reached")`.
- Verify `categoryId` exists (else `422` or `404` — `notFound("Category")`).
- Inside `db.transaction`: call `assertOwnedReadyMedia(tx, userId, photoMediaIds, "place_photo")`, generate slug (`slugify(name) + "-" + crypto.randomUUID().slice(0, 6)`), insert `places` (`status: "pending"`, `createdById: userId`, `coverMediaId: photoMediaIds[0] ?? null`), insert `place_photos` with `sortOrder = index`, `uploadedById: userId`.
- Return `getPlaceDetail(storage, created.id, sessionUser)` with status `201`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/places-write.test.ts`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/places apps/api/test/places-write.test.ts
git commit -m "feat(api): POST /places community submission with rate limit"
```

---

## Task 5: Place photo gallery additions & deletion

**Files:**

- Modify: `apps/api/src/routes/places/model.ts` (add `AddPlacePhotosBody`)
- Modify: `apps/api/src/routes/places/service.ts` (add `addPlacePhotos`, `deletePlacePhoto`)
- Modify: `apps/api/src/routes/places/index.ts` (mount `POST /places/:id/photos` and `DELETE /places/:id/photos/:photoId`)
- Modify: `apps/api/test/places-write.test.ts` (add photo tests)

**Interfaces:**

- Consumes: `requireAuth`, `assertOwnedReadyMedia`, `resolveMediaUrl`, `notFound`, `forbidden`
- Produces:
  - `POST /api/places/:id/photos` (`201`, `[{ id, mediaId, url, sortOrder }]`)
  - `DELETE /api/places/:id/photos/:photoId` (`204`)

- [ ] **Step 1: Write the failing test**

Append to `apps/api/test/places-write.test.ts`:

```ts
describe("place photos", () => {
	beforeEach(resetDb);

	test("POST adds photos and DELETE promotes next cover photo", async () => {
		const storage = memoryStorage();
		const { app, cookie, cat } = await setupUserAndCat(storage);
		const [place] = await db
			.insert(schema.places)
			.values({
				slug: "warung-foto",
				name: "Warung Foto",
				categoryId: cat.id,
				latitude: -6.91,
				longitude: 109.73,
				status: "published",
			})
			.returning();

		const commitPhoto = async () => {
			const up = await app.handle(
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
			const { id } = (await json(up)).data;
			const row = await db.query.media.findFirst({ where: { id } });
			await storage.put(row!.key, PNG, "image/png");
			await app.handle(
				new Request(`http://test/api/media/${id}/commit`, {
					method: "POST",
					headers: { cookie },
				}),
			);
			return id as string;
		};

		const m1 = await commitPhoto();
		const m2 = await commitPhoto();
		const add = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ photoMediaIds: [m1, m2] }),
			}),
		);
		expect(add.status).toBe(201);
		const added = (await json(add)).data;
		expect(added.length).toBe(2);

		const del = await app.handle(
			new Request(`http://test/api/places/${place.id}/photos/${added[0].id}`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del.status).toBe(204);

		const updated = await db.query.places.findFirst({
			where: { id: place.id },
		});
		expect(updated!.coverMediaId).toBe(m2);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/places-write.test.ts`
Expected: FAIL — `404` on `POST /places/:id/photos`.

- [ ] **Step 3: Implement `addPlacePhotos` and `deletePlacePhoto`**

- `addPlacePhotos`: verify place exists (and `status === "published"` or caller is admin/approved owner), validate `photoMediaIds` (1..5) via `assertOwnedReadyMedia(tx, userId, photoMediaIds, "place_photo")`, query current `max(sortOrder)` on `place_photos`, insert new rows starting at `max + 1`, set `places.coverMediaId` to `photoMediaIds[0]` if currently `null`.
- `deletePlacePhoto`: load `place_photos` row + `place`. Authorize if `photo.uploadedById === user.id`, `user.role === "admin"`, or user has an `approved` `businessClaims` row for `placeId` — else throw `forbidden("delete this photo")`. Delete row; if `place.coverMediaId === photo.mediaId`, query next remaining `place_photos` ordered by `sortOrder ASC` and update `places.coverMediaId` to `next?.mediaId ?? null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/places-write.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/places apps/api/test/places-write.test.ts
git commit -m "feat(api): place photo gallery add and delete"
```

---

## Task 6: Reviews (list, create, edit, delete) and Z-score anomaly detection

**Files:**

- Create: `apps/api/src/lib/anomaly.ts`
- Create: `apps/api/src/routes/reviews/model.ts`
- Create: `apps/api/src/routes/reviews/service.ts`
- Create: `apps/api/src/routes/reviews/index.ts`
- Create: `apps/api/test/reviews.test.ts`
- Modify: `apps/api/src/app.ts` (mount `reviewRoutes`)

**Interfaces:**

- Consumes: `requireAuth`, `optionalAuth`, `recomputePlaceStats`, `assertOwnedReadyMedia`, `resolveMediaUrl`, `ANOMALY_Z_THRESHOLD`, `ANOMALY_WINDOW_DAYS`, `ApiError`, `notFound`, `forbidden`, `conflict`
- Produces:
  - `lib/anomaly.ts`: `evaluateReviewAnomalies(tx: DbOrTx, input: { placeId: string; reviewId: string; userId: string; rating: number; now?: Date }): Promise<void>`
  - `reviewRoutes: Elysia`:
    - `GET /places/:id/reviews` (`page`, `limit`, `sort=recent|highest|lowest`, `withPhotos`)
    - `POST /places/:id/reviews` (`201`)
    - `PATCH /reviews/:id` (`200`)
    - `DELETE /reviews/:id` (`204`)

- [ ] **Step 1: Write the failing test**

`apps/api/test/reviews.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../src/database";
import { schema } from "../src/database/schema";
import { memoryStorage } from "../src/lib/storage";
import { cookieOf, freshApp, json, resetDb } from "./helpers";

async function registerUser(email: string, name = "User") {
	const res = await freshApp({ storage: memoryStorage() }).handle(
		new Request("http://test/api/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name, email, password: "min8chars" }),
		}),
	);
	return cookieOf(res)!;
}

async function seedPublishedPlace() {
	const [cat] = await db
		.insert(schema.categories)
		.values({ name: "Warung", slug: "warung", sortOrder: 1 })
		.returning();
	const [place] = await db
		.insert(schema.places)
		.values({
			slug: "warung-sate",
			name: "Warung Sate",
			categoryId: cat.id,
			latitude: -6.91,
			longitude: 109.73,
			status: "published",
		})
		.returning();
	return place;
}

describe("reviews & anomaly flags", () => {
	beforeEach(resetDb);

	test("create, duplicate 409, patch, and delete recompute place scores", async () => {
		const place = await seedPublishedPlace();
		const cookie = await registerUser("r1@b.test", "R1");
		const app = freshApp({ storage: memoryStorage() });

		const created = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 5, body: "Sambalnya juara sekali." }),
			}),
		);
		expect(created.status).toBe(201);
		const reviewId = (await json(created)).data.id;

		// duplicate -> 409
		const dup = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 4 }),
			}),
		);
		expect(dup.status).toBe(409);

		// patch -> updates place avg
		const patched = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json", cookie },
				body: JSON.stringify({ rating: 3 }),
			}),
		);
		expect(patched.status).toBe(200);
		let p = await db.query.places.findFirst({ where: { id: place.id } });
		expect(p!.ratingAvg).toBe(3);
		expect(p!.reviewCount).toBe(1);

		// delete -> soft removed, place avg resets to 0
		const del = await app.handle(
			new Request(`http://test/api/reviews/${reviewId}`, {
				method: "DELETE",
				headers: { cookie },
			}),
		);
		expect(del.status).toBe(204);
		p = await db.query.places.findFirst({ where: { id: place.id } });
		expect(p!.ratingAvg).toBe(0);
		expect(p!.reviewCount).toBe(0);
	});

	test("rejects unowned or wrong-purpose photoMediaIds with 403", async () => {
		const place = await seedPublishedPlace();
		const ownerCookie = await registerUser("own@b.test");
		const otherCookie = await registerUser("other@b.test");
		const storage = memoryStorage();
		const app = freshApp({ storage });

		const up = await app.handle(
			new Request("http://test/api/media/uploads", {
				method: "POST",
				headers: { "content-type": "application/json", cookie: ownerCookie },
				body: JSON.stringify({
					purpose: "review_photo",
					mime: "image/png",
					sizeBytes: 12,
				}),
			}),
		);
		const { id: mediaId } = (await json(up)).data;

		const res = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: otherCookie },
				body: JSON.stringify({ rating: 5, photoMediaIds: [mediaId] }),
			}),
		);
		expect(res.status).toBe(403);
	});

	test("zero stdDev baseline does not crash or flag, while outlier triggers rating_outlier", async () => {
		const place = await seedPublishedPlace();
		const app = freshApp({ storage: memoryStorage() });

		// seed 10 identical 5-star reviews directly
		const users = await db
			.insert(schema.users)
			.values(
				Array.from({ length: 10 }, (_, i) => ({
					name: `U${i}`,
					email: `u${i}@b.test`,
				})),
			)
			.returning();
		await db.insert(schema.reviews).values(
			users.map((u) => ({
				placeId: place.id,
				userId: u.id,
				rating: 5,
				status: "published" as const,
			})),
		);

		// 11th user posts a 5 -> stdDev = 0, must succeed without flagging
		const c11 = await registerUser("u11@b.test");
		const ok = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: c11 },
				body: JSON.stringify({ rating: 5 }),
			}),
		);
		expect(ok.status).toBe(201);
		expect((await db.select().from(schema.anomalyFlags)).length).toBe(0);

		// add one 4-star review so stdDev > 0, then a 1-star outlier
		const [u12] = await db
			.insert(schema.users)
			.values({ name: "U12", email: "u12@b.test" })
			.returning();
		await db.insert(schema.reviews).values({
			placeId: place.id,
			userId: u12.id,
			rating: 4,
			status: "published",
		});

		const c13 = await registerUser("u13@b.test");
		const outlier = await app.handle(
			new Request(`http://test/api/places/${place.id}/reviews`, {
				method: "POST",
				headers: { "content-type": "application/json", cookie: c13 },
				body: JSON.stringify({ rating: 1 }),
			}),
		);
		expect(outlier.status).toBe(201);
		const flags = await db.select().from(schema.anomalyFlags);
		expect(flags.some((f) => f.kind === "rating_outlier")).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test test/reviews.test.ts`
Expected: FAIL — `404` route not found.

- [ ] **Step 3: Implement `lib/anomaly.ts` and `routes/reviews/{model,service,index}.ts`**

- `lib/anomaly.ts`: `evaluateReviewAnomalies` checks:
  1. `rating_outlier`: query published reviews on `placeId` within `ANOMALY_WINDOW_DAYS` excluding `reviewId`; if count `>= 10`, compute `mean` and `stdDev`; if `stdDev > 0`, `z = (rating - mean) / stdDev`; if `Math.abs(z) > ANOMALY_Z_THRESHOLD`, insert `anomalyFlags` with `kind: "rating_outlier"`.
  2. `review_burst`: count distinct `userId` on `placeId` within last 24h (`status = 'published'`); if `>= 5`, insert `anomalyFlags` with `kind: "review_burst"` (only if no open `review_burst` flag exists for `placeId` in last 24h).
- `routes/reviews/service.ts`:
  - `listPlaceReviews`: `status = 'published'`, optional `withPhotos=true` filter, sort `recent | highest | lowest`, attach `user`, `photos`, `ownerReply`, and `mine: viewer?.id === r.userId`.
  - `createReview`: verify place `status === "published"`, check `review_rate_limits` count in last 24h `>= 5` -> `429 RATE_LIMITED`, check existing review for `(placeId, userId)` -> `409 CONFLICT`. Inside `db.transaction`: validate `photoMediaIds`, insert `reviews`, `reviewPhotos`, `reviewRateLimits`, call `recomputePlaceStats`, call `evaluateReviewAnomalies`.
  - `updateReview`: author only (`403`), not `removed` (`409`), replace `reviewPhotos` when `photoMediaIds` provided, call `recomputePlaceStats`.
  - `deleteReview`: author or admin (`403`), set `status = 'removed'`, call `recomputePlaceStats`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test test/reviews.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Typecheck, lint, and run full test suite**

Run: `cd apps/api && bun check && bun test && cd ../.. && bunx biome check --write apps/api`
Expected: no type errors, all tests passing, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/anomaly.ts apps/api/src/routes/reviews apps/api/src/app.ts apps/api/test/reviews.test.ts
git commit -m "feat(api): reviews CRUD with score recomputation and Z-score anomaly flags"
```
