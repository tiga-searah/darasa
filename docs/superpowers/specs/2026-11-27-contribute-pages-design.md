# Contribute Dashboard & Sub-Routes Design Spec

**Date:** 2026-11-27
**Status:** Approved by user

## Intent

Mengganti halaman kontribusi berbasis 4 tab di `/submit-place` menjadi arsitektur dashboard + halaman terpisah di `/contribute` dan `/contribute/...` dengan tampilan yang lebih sederhana, bersih, dan dilengkapi sistem XP & Level ala Google Maps Local Guides.

## Scope & Decisions

1. **Routing (`/contribute` menggantikan `/submit-place`):**
   - `/contribute` — Dashboard utama kontributor (profil + Level & XP, 4 menu `<Link>` menuju halaman aksi, saran kontribusi, dan riwayat kontribusi).
   - `/contribute/add-place` — Form tambah tempat kuliner baru.
   - `/contribute/write-review` — Form tulis ulasan & rating.
   - `/contribute/add-photo` — Form unggah foto tempat kuliner.
   - `/contribute/update-info` — Form perbarui info tempat kuliner.
   - Semua tautan lama `/submit-place` di navigasi dan halaman lain (`app-shell.tsx`, `home.tsx`, `explore.tsx`, `hidden-gem.tsx`) diganti ke endpoint baru (`/contribute` atau `/contribute/add-place`).

2. **Database Schema (tanpa endpoint API baru di `apps/api/src/routes/`):**
   - Tambah `contributionAction` enum di `apps/api/src/database/schema/enums.ts`.
   - Tambah `xpTotal` pada `users` di `apps/api/src/database/schema/auth.ts`.
   - Tambah tabel `xpEvents` di `apps/api/src/database/schema/contributions.ts`, daftarkan di `apps/api/src/database/schema.ts` dan `apps/api/src/database/relations.ts`.
   - Tidak ada penambahan/perubahan route API di `apps/api/src/routes/`.

3. **Sistem XP & Level (Client Store + UI):**
   - Nilai XP per kontribusi:
     - Tambah Tempat (`place`): `+50 XP`
     - Tulis Ulasan (`review`): `+25 XP`
     - Tambah Foto (`photo`): `+15 XP`
     - Perbarui Info (`edit`): `+10 XP`
   - Tier Level (ala Google Maps Local Guides):
     - Level 1 (`0-49 XP`): Penjelajah Baru
     - Level 2 (`50-149 XP`): Penjelajah Aktif
     - Level 3 (`150-299 XP`): Kurator Lokal
     - Level 4 (`300-499 XP`): Pemandu Kuliner
     - Level 5 (`500+ XP`): Duta Kuliner Batang
   - XP dihitung dari kontribusi nyata pengguna di `darasa-store.tsx` (tempat diajukan, ulasan ditulis, foto diunggah, edit info).

4. **UI & Antislop (`during` mode):**
   - Design Read: Dashboard kontributor komunitas Darasa untuk warga Batang, memakai palet hijau botanikal (`--primary`) dan off-white (`--background`), dial `ENERGY 1 / RHYTHM 2 / MOTION 1`.
   - Bebas em dash (`—`), bebas emoji dekoratif, bebas angka statistik palsu, fokus 1 tugas per halaman, responsif penuh, target sentuh minimal 44px, serta state loading, empty, dan error yang jelas.
