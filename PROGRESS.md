# FocusFlow - Project Progress

## Daftar Fase (Phase 1 - 14)
- [x] **Phase 1: Project Foundation**
- [x] **Phase 2: Database Schema & Supabase Setup**
- [x] **Phase 3: Authentication & Protected Routes**
- [x] **Phase 4: Tasks and Fixed Events CRUD**
- [x] **Phase 5: Calendar UI & FullCalendar Integration**
- [x] **Phase 6: Deterministic Scheduler**
- [x] **Phase 7: Multi-Provider AI with Automatic Failover**
- [ ] **Phase 8: AI Task Parsing & Effort Estimation (Gemini Flash)**
- [ ] **Phase 9: AI Explanation & Human Strategic Co-Pilot**
- [ ] **Phase 10: Energy Check-in & Reality Check**
- [ ] **Phase 11: Drag-and-Drop Override & Human Agency**
- [ ] **Phase 12: Weekly Reflection & Analytics**
- [ ] **Phase 13: Supabase Keepalive & Production Resilience**
- [ ] **Phase 14: Polishing, Testing, & Deployment Preparation**

---

## Log Fase 7: Multi-Provider AI with Automatic Failover

### Item Selesai
1. Pembuatan arsitektur multi-provider AI di `lib/ai/`:
   - `types.ts`: Mendefinisikan tipe `AiTarget`, `AiRequest`, `AiResult`, serta typed errors: `RateLimitError` (cakupan `rpm` dan `rpd` dengan `retryAfterMs`), `AuthError`, `ServerError`, `TimeoutError`, `InvalidOutputError`, dan `AllProvidersFailedError` (tanpa membocorkan kunci rahasia).
   - `config.ts`: Parsing `AI_CHAIN` (`gemini:gemini-2.5-flash,nvidia:meta/llama-3.3-70b-instruct`), daftar API keys (`GEMINI_API_KEYS`, `NVIDIA_API_KEYS`, `GEMINI_API_KEY`), `NVIDIA_BASE_URL`, konfigurasi timeout & budget, serta validasi Zod.
   - `cooldown.ts`: Modul pelacak status *cooldown* memori murni berbasis Map berformat `provider:model:keyIndex` dengan injeksi *clock* untuk pengujian. Durasi: RPM (`cooldownRpmMs`), RPD (`cooldownRpdMs`), Auth (24 jam), dan Server/Timeout (15 detik).
   - `json.ts`: Fungsi `extractJson()` yang membersihkan pagar markdown (` ```json `), mengekstrak objek/array JSON pertama seimbang, dan melempar `InvalidOutputError` jika tidak valid.
   - `providers/gemini.ts`: Integrasi `@google/generative-ai` dengan `responseMimeType: "application/json"`, rotasi multi-kunci, dan pemetaan error (mendeteksi batas harian RPD vs per menit RPM).
   - `providers/nvidia.ts`: Integrasi endpoint OpenAI-compatible NVIDIA NIM (`/chat/completions`), penanganan format JSON dengan fallback tanpa `response_format` saat menerima HTTP 400, pembacaan header `Retry-After`, dan pemetaan error.
   - `providers/openai.ts`: Integrasi OpenAI API (`/chat/completions`) native fetch, dukungan model standar (`gpt-4o-mini`, `gpt-4o`) dan o-series (`o3-mini`, `o1`), deteksi kuota `insufficient_quota` (RPD) vs RPM, fallback format JSON, dan pembacaan `OPENAI_API_KEY` / `OPENAI_API_KEYS` / `OPENAI_BASE_URL`.
   - `router.ts`: Router cerdas `generateStructured<T>()` yang mengeksekusi kandidat sesuai urutan rantai, memeriksa status cooldown, menegakkan budget total `AI_TOTAL_BUDGET_MS` dan timeout per percobaan `AI_ATTEMPT_TIMEOUT_MS`, melakukan 1x perbaikan prompt (*repair prompt*) saat output schema tidak valid, dan mengalihkan ke model/provider berikutnya saat terjadi kegagalan.
   - `fallback.ts`: Template fallback deterministik dalam Bahasa Indonesia untuk uraian tugas (`parseTaskFallback`), penjelasan jadwal (`explainBlockFallback`), dan refleksi mingguan (`reflectWeekFallback`).
   - `index.ts`: Fungsi utama `parseTask`, `explainBlock`, dan `reflectWeek` dengan validasi skema Zod dan transisi otomatis ke template fallback jika seluruh provider gagal atau `DEMO_FALLBACK=true`.
2. Verifikasi Model:
   - Gemini: `gemini-2.5-flash` dan `gemini-1.5-flash` terverifikasi sebagai ID resmi Google AI.
   - NVIDIA NIM: `meta/llama-3.3-70b-instruct` terverifikasi sebagai ID resmi model Meta Llama 3.3 pada katalog NVIDIA NIM.
   - OpenAI: `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`, `o3-mini` terverifikasi sebagai ID resmi model OpenAI.
3. Rute API yang Dibuat & Diperbarui:
   - `POST /api/parse-task`: Menganalisis tugas natural language, dilindungi autentikasi, mengembalikan `data` dan `meta: { provider, model, fallbackUsed, attempts }`.
   - `POST /api/explain`: Membuat penjelasan penempatan jadwal blok, dilindungi autentikasi.
   - `POST /api/reflect`: Menghasilkan ringkasan dan pertanyaan refleksi mingguan, dilindungi autentikasi.
   - `GET /api/ai-status`: Mengembalikan status rantai model, model aktif, dan masa tunggu cooldown tanpa mengekspos kunci API.
   - `POST /api/schedule`: Menghubungkan algoritma scheduler deterministik langsung dengan tabel `schedule_blocks` di Supabase untuk menempatkan daftar tugas ke kalender.
4. Pembaruan Antarmuka Pengguna (UI):
   - Komponen `AiStatusBadge.tsx` di header dashboard yang menampilkan status koneksi ringkas: **Connected** (hijau), **Pending** (kuning kedip saat cooldown/failover), atau **Not Connected** (merah saat tidak ada kunci/offline), tanpa menampilkan nama model secara langsung.
   - Tombol "✨ Susun Jadwal" di header dashboard untuk memetakan tugas aktif ke kalender secara langsung.
   - Integrasi formulir analisis AI pada `TaskInput.tsx` dengan fitur tombol "⚡ Jadwalkan Langsung" (analisis AI & langsung jadwalkan ke kalender dalam 1-klik) dan opsi "📝 Isi Form".
   - Penyusunan jadwal otomatis seketika (*instant auto-scheduling*): Saat tugas ditambahkan, diperbarui, diubah statusnya, atau dihapus, sistem langsung mengeksekusi penyusunan jadwal dan menampilkan blok jadwal secara real-time di kalender tanpa mengharuskan pengguna menekan tombol "Susun Jadwal" secara manual.
5. Pembaruan `.env.example` & `.env.local`: Menambahkan seluruh variabel lingkungan OpenAI (`OPENAI_API_KEY`, `OPENAI_API_KEYS`, `OPENAI_BASE_URL`) dan pembaruan rantai `AI_CHAIN`.
6. Penyempurnaan UI Dashboard (Reality Check, Human Score, & Layout Padding):
   - Perbaikan Bar Reality Check: Mengoreksi bug visual di mana 0 jam tugas menampilkan bar 15% (karena evaluasi `ratioPercent || 15`). Sekarang saat 0 jam, bar benar-benar kosong (`width: 0%`) dan prop default diubah dari 90 menjadi 0 menit.
   - Penghapusan Human Agency Score: Menghilangkan komponen `HumanScore` dari antarmuka dashboard agar tampilan kolom metrik lebih ringkas dan fokus.
   - Peningkatan Padding Layout Kanan: Menambahkan padding `lg:pl-3` dan `gap-6` pada kolom kanan dashboard (`DashboardShell.tsx`) serta memperluas padding internal kartu (`p-5 sm:p-6`) pada `RealityCheck.tsx`, `EnergyCheckin.tsx`, dan kartu Jadwal Tetap.
7. Pengujian Vitest Lengkap (`lib/ai/index.test.ts` & `components/RealityCheck.test.tsx`):
   - 62 pengujian unit lulus (26 AI tests, 4 RealityCheck tests, 14 scheduler tests, 13 validations, 3 ics parser, 2 supabase client).
8. Seluruh kode mematuhi aturan tanpa komentar (zero comments) dan lolos seluruh quality gate: `lint` (0 error, 0 warning), `typecheck` (0 error), `test` (62 tests passed).

### Langkah Konfigurasi Pengguna (Human Steps)
1. Dapatkan kunci API OpenAI di [platform.openai.com](https://platform.openai.com), kunci API Google AI Studio di [aistudio.google.com](https://aistudio.google.com), atau kunci NVIDIA di [build.nvidia.com](https://build.nvidia.com).
2. Masukkan `OPENAI_API_KEY` (atau beberapa kunci pada `OPENAI_API_KEYS`), `GEMINI_API_KEYS`, dan/atau `NVIDIA_API_KEYS` ke dalam `.env.local`.
3. Atur prioritas rantai pada `AI_CHAIN` sesuai preferensi (contoh: `openai:gpt-4o-mini,gemini:gemini-2.5-flash,nvidia:meta/llama-3.3-70b-instruct`).

### File yang Dibuat atau Diubah
- `lib/ai/types.ts`
- `lib/ai/config.ts`
- `lib/ai/cooldown.ts`
- `lib/ai/json.ts`
- `lib/ai/providers/gemini.ts`
- `lib/ai/providers/nvidia.ts`
- `lib/ai/providers/openai.ts`
- `lib/ai/router.ts`
- `lib/ai/fallback.ts`
- `lib/ai/index.ts`
- `lib/ai/schemas.ts`
- `lib/ai/gemini.ts`
- `lib/ai/index.test.ts`
- `app/api/parse-task/route.ts`
- `app/api/explain/route.ts`
- `app/api/reflect/route.ts`
- `app/api/ai-status/route.ts`
- `app/api/schedule/route.ts`
- `components/AiStatusBadge.tsx`
- `components/TaskInput.tsx`
- `app/dashboard/DashboardShell.tsx`
- `.env.example`
- `PROGRESS.md`

### Masalah yang Diketahui (Known Issues)
- Tidak ada isu yang belum terselesaikan.

### Fase Berikutnya
- **Phase 8: Energy Check-in & Reality Check**

---

## Log Fase 6: Deterministic Scheduler

### Item Selesai
1. Pembuatan modul perhitungan prioritas murni di `lib/scheduler/priority.ts` dengan rumus `urgensi * 0.4 + kepentingan * 0.3 + kesulitan * 0.2 + progres_tertunda * 0.1` ternormalisasi 0..1, di mana urgensi meningkat seiring mendekatnya deadline dan nilai 100% deterministik.
2. Pembuatan modul grid waktu dan slot di `lib/scheduler/slots.ts` dengan grid 30 menit mingguan dalam batasan jam aktif harian, pemetaan jendela energi (`pagi` 06:00-12:00, `siang` 12:00-18:00, `malam` 18:00-23:00) berbobot skor input (default 3), deteksi tumpang-tindih (*overlap*), dan verifikasi *buffer* 10 menit antar-blok.
3. Pembuatan mesin penjadwalan deterministik utama di `lib/scheduler/index.ts` (`schedule`):
   - Menerima input: `{ tasks, fixedEvents, existingBlocks, energy, weekStart, activeHours, now }`.
   - Mengembalikan output: `{ blocks, unplaced, totalRequiredMinutes, totalAvailableMinutes }`.
   - Blok terawetkan (*preserved blocks*, yang dikunci atau dimodifikasi manusia) tetap utuh tanpa disentuh.
   - Buffer minimal 10 menit ditegakkan antar setiap blok berurutan.
   - Batas maksimal kerja tugas harian (*daily cap*) 6 jam (360 menit) dipatuhi secara ketat.
   - Tugas berstatus `"selesai"` atau `"done"` dilewati secara otomatis.
   - Tugas dengan kesulitan >= 4 diprioritaskan masuk ke jendela energi tertinggi.
   - Tugas dengan `can_split: true` dibagi menjadi sesi-sesi maksimal 90 menit.
   - Tugas yang tidak muat dialokasikan ke daftar `unplaced` disertai alasan jelas berbahasa Indonesia (`tidak muat`, `melewati deadline`, `melebihi batas harian`).
   - Input yang sama dijamin selalu menghasilkan output yang identik (100% deterministik).
   - Modul sepenuhnya murni: nol impor dari Supabase, Next.js, maupun pustaka AI.
4. Pembuatan rangkaian unit test komprehensif di `lib/scheduler/index.test.ts` menggunakan Vitest (14 test case) yang mencakup:
   - Tanpa tumpang-tindih (*no overlaps*).
   - Kepatuhan tenggat waktu (*deadline respected*).
   - Preservasi blok terkunci/diedit manusia (*preserved blocks untouched*).
   - Kepatuhan buffer 10 menit antar-blok (*buffer respected*).
   - Kepatuhan batas kerja harian 6 jam (*daily cap respected*).
   - Penempatan tugas sulit di jendela energi tertinggi (*hard tasks in high energy windows*).
   - Pembagian sesi tugas maksimal 90 menit (*splitting behavior*).
   - Pengabaian tugas yang sudah selesai (*completed tasks skipped*).
   - Alasan unplaced yang tepat (*unplaced reasons*).
   - Konsistensi keluaran deterministik (*deterministic output*).
   - Kasus-kasus ekstrem berbasis tabel (*table-driven edge cases*: minggu kosong, minggu penuh terblokir total, deadline masa lalu).
5. Seluruh kode sumber bersih tanpa komentar (zero comments) dan lolos seluruh quality gate: `lint` (0 error), `typecheck` (0 error), `test` (32 tests passed), dan `build` (13 routes compiled).

### File yang Dibuat atau Diubah
- `lib/scheduler/priority.ts`
- `lib/scheduler/slots.ts`
- `lib/scheduler/index.ts`
- `lib/scheduler/index.test.ts`
- `PROGRESS.md`

### Keputusan Desain / Teknis
- Mengisolasi seluruh logika penjadwalan sebagai fungsi murni (*pure functions*) independen tanpa dependensi jaringan atau basis data, sehingga mudah diuji, bebas efek samping, dan aman digunakan baik di server route maupun client-side.
- Menggunakan tiebreaker deterministik bertingkat (prioritas -> deadline terawal -> judul alfabetis -> id unik) untuk memastikan konsistensi penempatan antar berbagai pemanggilan.

### Masalah yang Diketahui (Known Issues)
- Tidak ada isu yang belum terselesaikan pada modul penjadwal deterministik.

### Fase Berikutnya
- **Phase 7: Scheduling API & Integration**

---

## Log Fase 5: Calendar UI & FullCalendar Integration

### Item Selesai
1. Integrasi FullCalendar `@fullcalendar/react` dengan `timeGridPlugin`, `dayGridPlugin`, dan `interactionPlugin` pada `components/Calendar.tsx`.
2. Konfigurasi kalender mingguan: tampilan `timeGridWeek`, locale Indonesia (`idLocale`), slot 30 menit, format waktu 24 jam (`hour12: false`), hari pertama Senin (`firstDay: 1`), dan penunjuk waktu saat ini (`nowIndicator: true`).
3. Konversi dan render `fixed_events` mingguan sebagai recurring events dengan warna abu-abu netral (`#64748B`), non-draggable, dan penanda ikon 📌.
4. Render blok jadwal (`schedule_blocks`) dengan diferensiasi warna visual: biru (`#3B82F6`) untuk rencana AI, hijau emerald (`#10B981`) jika dimodifikasi manusia, serta ikon gembok 🔒 jika berstatus dikunci.
5. Navigasi mingguan kustom (`◀`, `Hari Ini`, `▶`) serta penampil judul minggu berbahasa Indonesia dari event `datesSet`.
6. Komposisi layout dashboard 3 kolom di desktop: TaskPanel di kolom kiri (span 3), Calendar di kolom tengah (span 6), serta widget EnergyCheckin, RealityCheck, dan HumanScore di kolom kanan (span 3).
7. Tata letak responsif untuk perangkat mobile dengan sistem tab switching yang rapi: "Tugas", "Kalender", dan "Panel & Metrik".
8. Komponen modal drawer `components/BlockDetail.tsx` yang menampilkan judul tugas, rentang waktu, status modifikasi, dan penjelasan AI saat jadwal diklik.
9. Helper pengujian blok jadwal sementara dibuat untuk verifikasi rendering visual dan telah dibersihkan sebelum commit.
10. Seluruh kode sumber mematuhi aturan tanpa komentar (zero comments) dan lolos seluruh quality gate: `lint` (0 error), `typecheck` (0 error), `test` (19 test lulus), dan `build` (13 route berhasil dioptimasi).
11. Verifikasi browser berhasil dilakukan dan terekam pada video artefak.

### File yang Dibuat atau Diubah
- `components/Calendar.tsx`
- `components/BlockDetail.tsx`
- `components/EnergyCheckin.tsx`
- `components/RealityCheck.tsx`
- `components/HumanScore.tsx`
- `app/dashboard/DashboardShell.tsx`
- `package.json`
- `package-lock.json`
- `PROGRESS.md`

### Keputusan Desain / Teknis
- Menggunakan versi seragam `@fullcalendar/react: ^6.1.15` yang kompatibel dengan plugin FullCalendar 6.x untuk menghindari error tipe `PluginInput` dan `CalendarApi`.
- Pemisahan data event menjadi memoized array dengan pemetaan task map untuk performa rendering kalender yang optimal tanpa lag.
- Mempertahankan layout 3 kolom pada desktop layar lebar (lg breakpoint) dan mengalihkan ke tab navigasi pada layar mobile agar tetap nyaman digunakan di perangkat berukuran kecil.

### Masalah yang Diketahui (Known Issues)
- Tidak ada isu yang belum terselesaikan pada tampilan kalender dan responsivitas.

### Fase Berikutnya
- **Phase 6: Fixed Events & Constraint Input**

---

## Log Fase 4: Tasks and Fixed Events CRUD

### Item Selesai
1. Penambahan skema validasi Zod untuk formulir tugas di `lib/validations/tasks.ts` (`taskFormSchema`) dengan batasan judul, durasi (15-1440 menit), kesulitan (1-5), kepentingan (1-5), opsi pecah sesi, dan status tugas.
2. Penambahan skema validasi Zod untuk jadwal tetap mingguan di `lib/validations/fixed-events.ts` (`fixedEventFormSchema`) yang memastikan format jam HH:MM dan jam selesai lebih akhir dari jam mulai.
3. Pembuatan parser kalender `.ics` di `lib/ics/parser.ts` yang mengekstrak aktivitas berulang mingguan (`RRULE:FREQ=WEEKLY` dengan opsi `BYDAY`) beserta pratinjau sebelum disimpan.
4. Pembuatan komponen `Toast.tsx` dengan provider dan hook `useToast` untuk notifikasi umpan balik aksi.
5. Pembuatan komponen formulir modal `TaskInput.tsx` untuk pembuatan dan penyuntingan tugas dengan kontrol lengkap.
6. Pembuatan komponen `TaskPanel.tsx` untuk menampilkan daftar tugas, filter status (Semua, Todo, Selesai), lencana prioritas (Tinggi, Sedang, Rendah), durasi, tenggat waktu, pembagian sesi, tombol ubah, dan konfirmasi hapus tugas.
7. Pembuatan komponen `FixedEventForm.tsx` untuk mengelola jadwal tetap mingguan (Senin - Minggu) dan impor berkas `.ics`.
8. Integrasi seluruh CRUD pada `DashboardShell.tsx` dengan pembaruan UI optimis, pemuatan data asinkron, dan persistensi database Supabase.
9. Penyempurnaan `DashboardContent.tsx` dan `RefleksiContent.tsx` dengan `connection()` dari `next/server` untuk mencegah peringatan prerender Next.js 16.
10. Seluruh kode sumber diverifikasi bersih tanpa komentar (Rule 2 dipatuhi).
11. Lolos seluruh pengujian: `lint` (0 error), `typecheck` (0 error), `test` (19 tests passed), dan `build` (13 routes compiled).
12. Verifikasi browser berhasil menggunakan akun uji pengguna (`farezidhafi5@gmail.com`) dan rekaman sesi tersimpan di artefak.

### File yang Dibuat atau Diubah
- `lib/validations/tasks.ts`
- `lib/validations/tasks.test.ts`
- `lib/validations/fixed-events.ts`
- `lib/validations/fixed-events.test.ts`
- `lib/ics/parser.ts`
- `lib/ics/parser.test.ts`
- `components/Toast.tsx`
- `components/TaskInput.tsx`
- `components/TaskPanel.tsx`
- `components/FixedEventForm.tsx`
- `app/dashboard/DashboardShell.tsx`
- `app/dashboard/DashboardContent.tsx`
- `app/dashboard/refleksi/RefleksiContent.tsx`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `middleware.ts`
- `PROGRESS.md`

### Keputusan Desain / Teknis
- Menggunakan pendekatan declarative key remount pada `TaskInput` (`key={editingTask?.id ?? ...}`) daripada sinkronisasi `useEffect` setState untuk mematuhi kaidah React 19 dan mencegah cascading re-renders.
- Menggunakan `connection()` pada server component dashboard untuk integrasi dinamis yang mulus dengan Next.js Turbopack Partial Prerendering.

### Masalah yang Diketahui (Known Issues)
- Tidak ada isu yang belum terselesaikan pada CRUD tugas dan jadwal tetap.

### Fase Berikutnya
- **Phase 5: Calendar UI & FullCalendar Integration**

---

## Log Fase 3: Authentication & Protected Routes

### Item Selesai
1. Pembuatan skema validasi Zod di `lib/validations/auth.ts` untuk formulir masuk (`loginSchema`) dan pendaftaran (`registerSchema`) dengan pesan validasi berbahasa Indonesia disertai unit test lengkap di `lib/validations/auth.test.ts`.
2. Pembuatan helper otentikasi API di `lib/supabase/auth.ts` (`getUserOrThrow` dan `getAuthenticatedUser`) yang memverifikasi sesi dengan `supabase.auth.getUser()` dan mengembalikan respons HTTP 401 saat tidak terotentikasi.
3. Implementasi rute penukaran kode sesi di `app/auth/callback/route.ts`.
4. Implementasi `middleware.ts` untuk pembaruan sesi cookie otomatis dan pengamanan rute.
5. Pembuatan halaman masuk dan pendaftaran interaktif di `app/login/page.tsx`.
6. Pembuatan kerangka dashboard di `app/dashboard/page.tsx`.
