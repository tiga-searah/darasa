# Contribute Dashboard & Sub-Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/submit-place` tabs with a clean `/contribute` XP/Level dashboard and 4 dedicated `/contribute/*` sub-routes, backed by Drizzle schema additions (without API route changes) and client-store XP computation.

**Architecture:** Add `xpTotal` and `xpEvents` to `apps/api/src/database/schema/`, expose XP rewards & Local Guides-style level calculations in `apps/web/app/components/contribute/types.ts` and `darasa-store.tsx`, build `/contribute` dashboard + 4 clean sub-page routes with reusable `ContributePageHeader`, and replace all `/submit-place` route and link references.

**Tech Stack:** React Router Framework v8, TypeScript, Tailwind CSS v4, Shadcn UI, Drizzle ORM, Bun Test, Biome.

**Spec:** `docs/superpowers/specs/2026-11-27-contribute-pages-design.md`

## Global Constraints

- Do NOT create or modify backend API endpoints in `apps/api/src/routes/`.
- Use `/contribute`, `/contribute/add-place`, `/contribute/write-review`, `/contribute/add-photo`, `/contribute/update-info` (remove `/submit-place`).
- XP rewards: `place = 50`, `review = 25`, `photo = 15`, `edit = 10`.
- Level tiers: Level 1 `0-49` ("Penjelajah Baru"), Level 2 `50-149` ("Penjelajah Aktif"), Level 3 `150-299` ("Kurator Lokal"), Level 4 `300-499` ("Pemandu Kuliner"), Level 5 `500+` ("Duta Kuliner Batang").
- Antislop `during` rules: zero em dashes (`—`), zero decorative emojis, zero fabricated numbers, WCAG AA contrast, 44px+ touch targets, visible focus rings, explicit loading/empty/error states, `ENERGY 1 / RHYTHM 2 / MOTION 1`.
- Format & lint with Biome (`bun run lint:fix` / `bun run typecheck`).

## Review Focus

- Visitor (`role === "visitor"`) must see a clean login/demo prompt on `/contribute` and `/contribute/*` without leaking mock XP numbers.
- Sub-routes with `?placeId=` or `?name=` query params must handle invalid/missing IDs gracefully without crashing.
- Mobile (`375px`) and tablet (`768px`) layouts must have zero horizontal overflow and >=44px tap targets on all action cards and buttons.
- `AppShell` navigation (`Kontribusi`) must stay highlighted (`aria-current="page"`) on both `/contribute` and `/contribute/*`.
- Adding a place, review, photo, or info update must immediately reflect in total XP, level progress bar, and activity list.

---

### Task 1: Database Schema for XP & Contribution Events (Schema Only)

**Files:**
- Modify: `apps/api/src/database/schema/enums.ts`
- Modify: `apps/api/src/database/schema/auth.ts`
- Create: `apps/api/src/database/schema/contributions.ts`
- Modify: `apps/api/src/database/schema.ts`
- Modify: `apps/api/src/database/relations.ts`
- Test: `apps/api/test/xp-schema.test.ts`

**Interfaces:**
- Produces: `contributionAction` pgEnum (`["add_place", "write_review", "add_photo", "update_info"]`), `users.xpTotal` column, `xpEvents` table in `schema` and `relations`.

- [ ] **Step 1: Write the failing test**
  Create `apps/api/test/xp-schema.test.ts` asserting `schema.xpEvents`, `schema.users.xpTotal`, and `contributionAction.enumValues` equal `["add_place", "write_review", "add_photo", "update_info"]`.
- [ ] **Step 2: Run test to verify it fails**
  Run: `cd apps/api && bun test test/xp-schema.test.ts`
  Expected: FAIL (`xpEvents` / `contributionAction` undefined).
- [ ] **Step 3: Implement schema & relations**
  - Add `contributionAction` enum in `apps/api/src/database/schema/enums.ts`.
  - Add `xpTotal: integer("xp_total").notNull().default(0)` to `users` in `apps/api/src/database/schema/auth.ts`.
  - Create `apps/api/src/database/schema/contributions.ts` with `xpEvents` table (`id`, `userId`, `placeId`, `action`, `xpDelta`, `summary`, `createdAt`, indexes).
  - Export `...contributions` in `apps/api/src/database/schema.ts` and wire relations in `apps/api/src/database/relations.ts`.
  - Do NOT touch `apps/api/src/routes/`.
- [ ] **Step 4: Run tests & typecheck**
  Run: `cd apps/api && bun test test/xp-schema.test.ts && bun run typecheck`
  Expected: PASS.
- [ ] **Step 5: Commit**
  `git add apps/api/src/database apps/api/test/xp-schema.test.ts && git commit -m "feat(schema): add contributor xpTotal and xpEvents schema"`

---

### Task 2: Contributor XP & Level Engine + Store Feedback

**Files:**
- Modify: `apps/web/app/components/contribute/types.ts`
- Modify: `apps/web/app/context/darasa-store.tsx`
- Test: `apps/web/app/components/contribute/xp-level.test.ts`

**Interfaces:**
- Produces:
  - `ContributeActionId = "add_place" | "write_review" | "add_photo" | "update_info"`
  - `CONTRIBUTE_ACTIONS: ContributeActionMeta[]` (with `id`, `to`, `label`, `shortDesc`, `xpReward`, `icon`)
  - `XP_REWARDS = { place: 50, review: 25, photo: 15, edit: 10 } as const`
  - `calculateContributorXp(counts: { places: number; reviews: number; photos: number; edits: number }): number`
  - `getContributorLevel(xp: number): ContributorLevelInfo` (`level`, `title`, `xp`, `currentLevelMinXp`, `nextLevelXp`, `nextLevelTitle`, `progressPercent`, `xpToNext`)

- [ ] **Step 1: Write the failing test**
  Create `apps/web/app/components/contribute/xp-level.test.ts` testing `calculateContributorXp` and `getContributorLevel` across boundaries `0, 49, 50, 149, 150, 299, 300, 499, 500, 750`.
- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test apps/web/app/components/contribute/xp-level.test.ts`
  Expected: FAIL (`calculateContributorXp` / `getContributorLevel` not exported).
- [ ] **Step 3: Implement XP/Level types & helpers + update store notifications**
  - Update `apps/web/app/components/contribute/types.ts` with `CONTRIBUTE_ACTIONS`, `XP_REWARDS`, `calculateContributorXp`, `getContributorLevel`.
  - Update `apps/web/app/context/darasa-store.tsx` notifications on `submitPlace` (`+50 XP`), `submitReview` (`+25 XP`), `addPlacePhoto` (`+15 XP`), `suggestPlaceUpdate` (`+10 XP`).
- [ ] **Step 4: Run test & typecheck**
  Run: `bun test apps/web/app/components/contribute/xp-level.test.ts`
  Expected: PASS.
- [ ] **Step 5: Commit**
  `git add apps/web/app/components/contribute/types.ts apps/web/app/components/contribute/xp-level.test.ts apps/web/app/context/darasa-store.tsx && git commit -m "feat(contribute): add XP rewards and level progression engine"`

---

### Task 3: Clean `/contribute` Dashboard & Shared Sub-Page Header

**Files:**
- Create: `apps/web/app/components/contribute/contribute-page-header.tsx`
- Create: `apps/web/app/routes/contribute.tsx`

**Interfaces:**
- Consumes: `CONTRIBUTE_ACTIONS`, `calculateContributorXp`, `getContributorLevel`, `formatRelativeContributionDate`, `getPlacePhotoCount` from `~/components/contribute/types`, `useDarasa()` from `~/context/darasa-store`.
- Produces:
  - `ContributePageHeader({ title, description, xpReward, currentLevelLabel })` with `<Link to="/contribute">Kembali ke Kontribusi</Link>`.
  - `ContributeDashboardPage` default export for `/contribute`.

- [ ] **Step 1: Create `ContributePageHeader`**
  Clean, accessible header component with `<Link to="/contribute">` (min-h-[44px]), `<h1>`, concise subtitle, and optional XP reward badge when semantically meaningful.
- [ ] **Step 2: Create `apps/web/app/routes/contribute.tsx`**
  Simple, clean dashboard following `ENERGY 1 / RHYTHM 2 / MOTION 1`:
  1. **Loading state** (`!hydrated`) with clear status text.
  2. **Contributor Level & XP Hero Card** (focal point): user avatar/name, Level badge (`Level X · Title`), total XP (`tabular-nums`), progress bar toward next level, compact 4-item breakdown (Tempat, Ulasan, Foto, Info), or clean visitor login/demo prompt (`?redirect=/contribute`).
  3. **4 Action Menu Cards** (`<Link to={action.to}>`, NOT tabs): 2x2 on tablet/desktop (1-col on narrow mobile, 4-col on wide desktop if comfortable, or clean 2x2 grid for calm visual breathing room), showing icon, title, short description, and `+XX XP`.
  4. **Suggestions & Recent History** (2-column asymmetric split on `lg:`):
     - Left: Real places needing review/photo/info, each linking directly to `/contribute/write-review?placeId=...`, `/contribute/add-photo?placeId=...`, or `/contribute/update-info?placeId=...`.
     - Right: Chronological real user contribution timeline with filter chips (`Semua`, `Tempat`, `Ulasan`, `Foto & Info`) and honest empty state when 0 contributions.
- [ ] **Step 3: Verify syntax & formatting**
  Run: `bunx @biomejs/biome check apps/web/app/components/contribute/contribute-page-header.tsx apps/web/app/routes/contribute.tsx`
- [ ] **Step 4: Commit**
  `git add apps/web/app/components/contribute/contribute-page-header.tsx apps/web/app/routes/contribute.tsx && git commit -m "feat(web): build clean /contribute XP dashboard and sub-page header"`

---

### Task 4: Dedicated `/contribute/*` Sub-Pages & Clean Form Polish

**Files:**
- Create: `apps/web/app/routes/contribute-add-place.tsx`
- Create: `apps/web/app/routes/contribute-write-review.tsx`
- Create: `apps/web/app/routes/contribute-add-photo.tsx`
- Create: `apps/web/app/routes/contribute-update-info.tsx`
- Modify (polish if needed): `apps/web/app/components/contribute/add-place-form.tsx`, `write-review-form.tsx`, `add-photo-form.tsx`, `update-info-form.tsx`

**Interfaces:**
- Consumes: `ContributePageHeader`, existing 4 form components, `useDarasa()`.

- [ ] **Step 1: Build the 4 dedicated route pages**
  Each route renders inside a clean `mx-auto max-w-3xl space-y-6 pb-8` layout:
  - Uses `ContributePageHeader` with `xpReward` (`+50 XP`, `+25 XP`, `+15 XP`, `+10 XP`).
  - Handles `!hydrated` loading skeleton and `isVisitor` login/demo card (`?redirect=/contribute/...`).
  - Handles query params (`?name=` on `add-place`, `?placeId=` & `?rating=` on `write-review`, `?placeId=` on `add-photo` and `update-info`) with safe fallback to `places[0]?.id ?? ""`.
  - Wires `onRequestAddNewPlace` to `navigate(\`/contribute/add-place?name=\${encodeURIComponent(prefillName)}\`)`.
- [ ] **Step 2: Polish existing form components for simplicity & antislop compliance**
  Ensure forms have zero em dashes (`—`), accessible labels, >=44px controls, and clean card padding without redundant noise.
- [ ] **Step 3: Lint modified/created files**
  Run: `bunx @biomejs/biome check apps/web/app/routes/contribute-*.tsx apps/web/app/components/contribute/*.tsx`
- [ ] **Step 4: Commit**
  `git add apps/web/app/routes/contribute-*.tsx apps/web/app/components/contribute/ && git commit -m "feat(web): add 4 dedicated /contribute/* sub-pages"`

---

### Task 5: Wire Routes, Remove `/submit-place`, and Update All Links

**Files:**
- Modify: `apps/web/app/routes.ts`
- Delete: `apps/web/app/routes/submit-place.tsx`
- Delete: `apps/web/app/components/contribute/contribute-sidebar.tsx`
- Modify: `apps/web/app/components/app-shell.tsx`
- Modify: `apps/web/app/routes/home.tsx`
- Modify: `apps/web/app/routes/explore.tsx`
- Modify: `apps/web/app/routes/hidden-gem.tsx`

- [ ] **Step 1: Update `apps/web/app/routes.ts`**
  Replace `submit-place` with `contribute`, `contribute/add-place`, `contribute/write-review`, `contribute/add-photo`, `contribute/update-info`.
- [ ] **Step 2: Update all navigation & CTA links**
  - `app-shell.tsx`: `{ to: "/contribute", label: "Kontribusi", icon: PlusCircle }`
  - `home.tsx`, `explore.tsx`, `hidden-gem.tsx`: update `/submit-place` links to `/contribute/add-place` (for direct place submission CTAs).
- [ ] **Step 3: Remove obsolete `submit-place.tsx` and `contribute-sidebar.tsx`**
- [ ] **Step 4: Run full workspace verification (`typecheck`, `test`, `lint`, `build`)**
  Run: `bun run lint:fix && bun run typecheck && bun run test && bun run build`
  Expected: All pass cleanly with zero errors.
- [ ] **Step 5: Commit**
  `git add -A && git commit -m "feat(web): switch routing and links from /submit-place to /contribute"`
