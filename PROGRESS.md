# FocusFlow - Project Progress

## Daftar Fase (Phase 1 - 14)
- [x] **Phase 1: Project Foundation**
- [x] **Phase 2: Database Schema & Supabase Setup**
- [ ] **Phase 3: Authentication & Protected Routes**
- [ ] **Phase 4: Calendar UI & FullCalendar Integration**
- [ ] **Phase 5: Task Management & TaskPanel UI**
- [ ] **Phase 6: Fixed Events & Constraint Input**
- [ ] **Phase 7: Deterministic Scheduling Engine**
- [ ] **Phase 8: AI Task Parsing & Effort Estimation (Gemini Flash)**
- [ ] **Phase 9: AI Explanation & Human Strategic Co-Pilot**
- [ ] **Phase 10: Energy Check-in & Reality Check**
- [ ] **Phase 11: Drag-and-Drop Override & Human Agency**
- [ ] **Phase 12: Weekly Reflection & Analytics**
- [ ] **Phase 13: Supabase Keepalive & Production Resilience**
- [ ] **Phase 14: Polishing, Testing, & Deployment Preparation**

---

## Log Fase 2: Database Schema & Supabase Setup

### Item Selesai
1. Penulisan `supabase/schema.sql` lengkap dengan 6 tabel: `profiles`, `tasks`, `fixed_events`, `energy_logs`, `schedule_blocks`, dan `reflections`.
2. Pengaktifan Row Level Security (RLS) pada ke-6 tabel dengan kebijakan isolasi per-pengguna (`auth.uid() = user_id`, dan `auth.uid() = id` untuk `profiles`).
3. Pembuatan fungsi `security definer` `handle_new_user()` dan trigger `on_auth_user_created` pada tabel `auth.users` untuk membuat baris profil otomatis saat pendaftaran akun.
4. Pembuatan indeks performa pada kolom `user_id` di setiap tabel dan pada `schedule_blocks(mulai)`.
5. Implementasi klien Supabase SSR di `lib/supabase/client.ts` (`createBrowserClient`) dan `lib/supabase/server.ts` (`createServerClient` dengan `async cookies()`).
6. Pembuatan definisi tipe TypeScript lengkap dan terstruktur di `lib/types.ts` (`Profile`, `Task`, `FixedEvent`, `EnergyLog`, `ScheduleBlock`, `Reflection`, `Database`).
7. Pembuatan skrip uji koneksi `scripts/smoke-supabase.ts` serta penambahan skrip `smoke:supabase` di `package.json` dan unit test klien di `lib/supabase/client.test.ts`.
8. Seluruh file kode sumber diverifikasi bersih tanpa komentar apapun (Rule 2 dipatuhi).
9. Lolos seluruh pengujian: `lint` (0 error), `typecheck` (0 error), `test` (3 tests passed), dan `build` (13 routes compiled).
10. Verifikasi browser dilakukan dan direkam.

### File yang Dibuat atau Diubah
- `supabase/schema.sql`
- `lib/types.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/client.test.ts`
- `scripts/smoke-supabase.ts`
- `package.json`
- `PROGRESS.md`

### Keputusan Desain / Teknis
- Menggunakan skema modular `Database` di `lib/types.ts` untuk inferensi tipe otomatis query Supabase di masa depan.
- Menangani nilai lingkungan kosong pada klien Supabase dengan fallback URL yang aman agar proses `build` statis Next.js tidak crash saat kredensial belum diatur di lingkungan CI.
- Mengimplementasikan `scripts/smoke-supabase.ts` yang memberikan diagnostik informatif dalam Bahasa Indonesia jika kunci belum disetel.

### Masalah yang Diketahui (Known Issues)
- Memerlukan tindakan manusia: proyek Supabase perlu dibuat, `supabase/schema.sql` dijalankan di SQL Editor, dan kunci Supabase disalin ke `.env.local`.

### Fase Berikutnya
- **Phase 3: Authentication & Protected Routes**

---

## Log Fase 1: Project Foundation

### Item Selesai
1. Inisialisasi proyek Next.js dengan App Router, TypeScript, Tailwind CSS, dan ESLint di root workspace tanpa direktori `src`.
2. Instalasi seluruh dependensi produksi (`@supabase/supabase-js`, `@supabase/ssr`, `@google/generative-ai`, `zod`, `@fullcalendar/react`, `@fullcalendar/core`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`) dan dependensi dev (`vitest`, `@vitest/coverage-v8`, `tsx`).
3. Pembuatan struktur folder lengkap sesuai spesifikasi arsitektur proyek dengan placeholder minimal dan bersih tanpa komentar di dalam file kode sumber.
4. Pembuatan file `.env.example` yang memuat variabel kunci (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`) serta konfirmasi bahwa `.gitignore` mengabaikan `.env.local`.
5. Penambahan skrip npm terpadu: `dev`, `build`, `lint`, `typecheck`, `test`, dan `seed`.
6. Konfigurasi Vitest dengan path alias `@/` via `vitest.config.mts`.
7. Pembuatan halaman landing page modern dan responsif di `/` dengan tagline *"AI menyusun rencana, kamu yang memegang kendali."*, pengantar fitur, dan tombol aksi "Masuk" yang terhubung ke `/login`.
8. Pembuatan kerangka dokumentasi `README.md` mencakup Deskripsi, Fitur, Tech Stack, Setup Lokal, Deploy, dan Struktur Proyek.
9. Pembuatan dokumen pelacak kemajuan `PROGRESS.md`.
