# Panduan Kebutuhan & Lokasi File Backend Darasa

Dokumen ini merinci seluruh kebutuhan backend **Darasa** berdasarkan [PRD.md](./PRD.md), [AGENTS.md](./AGENTS.md), dan kode frontend yang sudah dibangun di [apps/web](./apps/web).

---

## 1. Kondisi Backend Saat Ini

Backend di [apps/api](./apps/api) saat ini baru berisi kerangka awal:

- `apps/api/src/index.ts` : Server Elysia minimal (`GET /` mengembalikan `"Hello Elysia"` pada port `3000`).
- `apps/api/package.json` : Baru terpasang `elysia` (`^2.0.0-rc.3`), `@elysia/cors` (`^2.0.0-rc.1`), `@elysia/openapi` (`^2.0.0-rc.1`), dan `bun-types`.
- `apps/api/Dockerfile` : Konfigurasi build binary Bun untuk produksi.
- `apps/web/app/context/darasa-store.tsx` : Frontend saat ini masih memakai data prototipe lokal (`localStorage`) dan siap disambungkan ke API melalui **Eden Treaty**.

---

## 2. Dependensi & Infrastruktur yang Diperlukan

### A. Database & ORM (`apps/api`)
- **PostgreSQL** : Penyimpanan relasional utama (sesuai `AGENTS.md` dan `PRD.md`).
- **`drizzle-orm` + `drizzle-orm/typebox` + `typebox`** : Query builder type-safe sekaligus generator skema validasi TypeBox untuk Elysia v2.
- **`postgres` (atau `pg`)** : Driver koneksi PostgreSQL untuk Bun.
- **`drizzle-kit`** (devDependency) : Generator dan runner migrasi database.

### B. Autentikasi, Keamanan, & Upload File (`apps/api`)
- **`@elysiajs/jwt` + Cookie HTTP-Only** : Manajemen sesi login dan token autentikasi lintas role (`visitor`, `user`, `owner`, `admin`).
- **`Bun.password.hash` / `Bun.password.verify`** : Hashing kata sandi bawaan runtime Bun (Argon2id/bcrypt) tanpa library tambahan.
- **Penyimpanan File (Local Volume atau S3-compatible seperti Cloudflare R2 / MinIO)** : Menyimpan foto tempat kuliner, foto ulasan, dan dokumen bukti klaim usaha dengan validasi tipe MIME dan ukuran file.

### C. Type-Safe API Client (`apps/web` atau `packages/`)
- **`@elysiajs/eden`** (di `apps/web`) : Menggunakan `treaty<App>(API_URL)` agar frontend memanggil endpoint backend secara type-safe langsung dari `export type App = typeof app`.

### D. Layanan Eksternal Opsional (sesuai `PRD.md` Bagian 11)
- **Google Maps Platform API** : Validasi geocoding atau tampilan peta interaktif lanjutan untuk koordinat Kabupaten Batang.
- **WhatsApp Business API** : Notifikasi status pengajuan/persetujuan klaim profil kepada pemilik usaha (opsional untuk prototipe).

---

## 3. Peta Lokasi File yang Harus Dibuat / Diperbarui

```text
darasa/
  apps/
    api/
      .env.example                  # Variabel lingkungan (DB, JWT, CORS, Upload, API keys)
      drizzle.config.ts             # Konfigurasi Drizzle Kit untuk PostgreSQL
      drizzle/                      # File migrasi SQL hasil generate Drizzle Kit
      uploads/                      # Penyimpanan lokal foto/bukti klaim (saat dev/prototipe)
      src/
        app.ts                      # Komposisi plugin, CORS, OpenAPI, routes + export type App
        index.ts                    # Entry point runtime: memanggil app.listen(PORT)
        db/
          index.ts                  # Inisialisasi pool PostgreSQL & instance Drizzle db
          schema.ts                 # Definisi 9 tabel inti PRD (users, places, reviews, dll.)
          seed.ts                   # Seeder awal data kuliner Batang & akun admin/pengguna uji
        plugins/
          auth.ts                   # Guard & derive user session + role-based access (RBAC)
          error-handler.ts          # Penanganan error terstruktur (400, 401, 403, 404, 422)
        libs/
          scoring.ts                # Kalkulasi server-side Explore Score, Hidden Gem Score, Z-Score
          storage.ts                # Helper simpan/hapus & validasi MIME foto/dokumen
        routes/
          auth/
            index.ts                # POST /auth/register, /auth/login, /auth/logout, GET /auth/me
            model.ts                # Skema validasi TypeBox untuk auth
            service.ts              # Logika registrasi, verifikasi password, penerbitan token
          places/
            index.ts                # GET /places, GET /places/hidden-gem, GET /places/:slug, POST /places
            model.ts                # Query filter, body pengajuan tempat, response skema
            service.ts              # Query Explore & Hidden Gem + simpan tempat berstatus pending
          reviews/
            index.ts                # POST /places/:id/reviews, validasi rating & upload foto
            model.ts                # Validasi rating 1-5, komentar, foto opsional
            service.ts              # Simpan ulasan, hitung ulang rata-rata & jalankan cek Z-Score
          claims/
            index.ts                # POST /claims, GET /claims/me
            model.ts                # Skema bukti klaim, peran usaha, nomor WhatsApp
            service.ts              # Simpan klaim berstatus pending untuk ditinjau admin
          owner/
            index.ts                # GET /owner/place, PATCH /owner/place, POST /owner/reviews/:id/reply
            model.ts                # Skema pembaruan profil usaha & balasan ulasan
            service.ts              # Cek klaim disetujui (FR-040), statistik usaha, balas ulasan
          admin/
            index.ts                # GET/PATCH /admin/claims/:id, PATCH /admin/places/:id/verify, /admin/anomalies
            model.ts                # Skema keputusan approve/reject & resolusi anomali
            service.ts              # Persetujuan klaim (upgrade role owner), verifikasi komunitas, moderasi Z-Score
      test/
        auth.test.ts                # Uji registrasi, login, dan proteksi role
        scoring.test.ts             # Uji rumus Explore Score, Hidden Gem, dan Z-Score
        claims-workflow.test.ts     # Uji alur klaim -> approval admin -> akses dasbor pemilik

  packages/
    shared/                         # (Opsional) Konstanta bersama antara api & web
      src/
        constants.ts                # Daftar kategori kuliner & kecamatan Kabupaten Batang
        scoring-types.ts            # Konstanta bobot skor & tipe bersama

  apps/
    web/
      app/
        lib/
          api-client.ts             # (Baru) Inisialisasi Eden treaty<App>(import.meta.env.VITE_API_URL)
        context/
          darasa-store.tsx          # (Update) Ganti mutasi localStorage menjadi panggilan api-client.ts
```

---

## 4. Skema Database Inti (`apps/api/src/db/schema.ts`)

Berdasarkan Bagian 6.1 **PRD.md**, tabel PostgreSQL yang wajib dibuat:

1. **`users`** : `id`, `name`, `email` (unique), `password_hash`, `role` (`user | owner | admin`), `created_at`.
2. **`culinary_places`** : `id`, `slug` (unique), `name`, `category`, `district`, `address`, `lat`, `lng`, `opening_hours`, `price_range`, `phone`, `description`, `verification_status` (`unverified | community_verified | owner_verified`), `is_pending_moderation`, `owner_id` (nullable FK -> `users.id`), `submitted_by_user_id` (FK -> `users.id`), `created_at`, `updated_at`.
3. **`place_photos`** : `id`, `place_id` (FK), `review_id` (nullable FK), `uploaded_by_user_id` (FK), `url`, `is_cover`, `created_at`.
4. **`reviews`** : `id`, `place_id` (FK), `user_id` (FK), `rating` (integer 1-5), `comment`, `created_at`.
5. **`owner_replies`** : `id`, `review_id` (unique FK -> `reviews.id`), `owner_user_id` (FK -> `users.id`), `message`, `created_at`.
6. **`business_claims`** : `id`, `place_id` (FK), `claimant_user_id` (FK), `business_role`, `whatsapp_number`, `evidence_summary`, `evidence_file_url`, `status` (`pending | approved | rejected`), `admin_note`, `reviewed_by_admin_id` (nullable FK), `submitted_at`, `reviewed_at`.
7. **`verification_logs`** : `id`, `place_id` (FK), `status_before`, `status_after`, `verified_by_admin_id` (FK), `note`, `created_at`.
8. **`anomaly_flags`** : `id`, `place_id` (FK), `review_id` (nullable FK), `z_score` (numeric), `reason`, `resolution` (`open | cleared | flagged_hold`), `reviewed_by_admin_id` (nullable FK), `detected_at`, `reviewed_at`.
9. **`place_statistics`** (atau materialized view / query agregat) : `place_id`, `average_rating`, `review_count`, `explore_score`, `hidden_gem_score`, `last_calculated_at`.

---

## 5. Pemetaan Endpoint API ke Halaman Frontend (`apps/web`)

| Halaman Frontend (`apps/web/app/routes/`) | Kebutuhan Endpoint Backend (`apps/api/src/routes/`) | Akses Role |
| --- | --- | --- |
| `login.tsx` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Publik |
| `register.tsx` | `POST /auth/register` | Publik |
| `explore.tsx` (`/`) | `GET /places?q=&category=&district=&verification=` (urut Explore Score) | Publik |
| `hidden-gem.tsx` (`/hidden-gem`) | `GET /places/hidden-gem?district=` (syarat rating `>= 4.0`) | Publik |
| `place-detail.tsx` (`/places/:slug`) | `GET /places/:slug`, `POST /places/:id/reviews` (multipart foto) | Detail: Publik / Ulasan: `user+` |
| `submit-place.tsx` (`/submit-place`) | `POST /places` (validasi koordinat Batang + foto awal) | `user`, `owner`, `admin` |
| `claim.tsx` (`/claim`) | `POST /claims`, `GET /claims/me` | `user`, `owner`, `admin` |
| `owner.tsx` (`/owner`) | `GET /owner/place`, `PATCH /owner/place`, `POST /owner/reviews/:id/reply` | `owner` (klaim `approved`) |
| `admin.tsx` (`/admin`) | `GET /admin/claims`, `PATCH /admin/claims/:id`, `PATCH /admin/places/:id/verify`, `GET/PATCH /admin/anomalies/:id` | `admin` |

---

## 6. Variabel Lingkungan Backend (`apps/api/.env.example`)

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/darasa
JWT_SECRET=ganti-dengan-secret-minimal-32-karakter
CORS_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=5
GOOGLE_MAPS_API_KEY=
WHATSAPP_API_TOKEN=
```

---

## 7. Urutan Implementasi yang Disarankan

1. Siapkan PostgreSQL lokal/Docker dan tambahkan `drizzle-orm`, `drizzle-kit`, `postgres`, `typebox`, serta `@elysiajs/jwt` di `apps/api/package.json`.
2. Buat `apps/api/src/db/schema.ts`, jalankan `bunx drizzle-kit generate` dan `bunx drizzle-kit migrate`, lalu buat `seed.ts` dengan data awal Batang.
3. Pisahkan `apps/api/src/app.ts` dari `apps/api/src/index.ts` agar `export type App = typeof app` bisa diimpor oleh `apps/web` melalui `@elysiajs/eden` tanpa membawa kode server ke bundle browser.
4. Implementasikan plugin `auth.ts` (RBAC) dan seluruh route (`auth`, `places`, `reviews`, `claims`, `owner`, `admin`).
5. Uji seluruh endpoint dengan `bun test` menggunakan `app.handle()` dan `treaty(app)`, lalu sambungkan `apps/web/app/lib/api-client.ts` menggantikan state `localStorage` di `darasa-store.tsx`.
