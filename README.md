# FocusFlow

> **Tagline**: AI menyusun rencana, kamu yang memegang kendali.  
> **Tema**: *Work Smarter, Stay Human: AI as Your Strategic Co-Pilot*

FocusFlow adalah aplikasi perencana mingguan berbasis kecerdasan buatan (AI) yang dirancang khusus untuk mahasiswa. Sistem memadukan kekuatan AI untuk analisis tugas dan estimasi beban kerja, algoritma deterministik untuk penempatan jadwal kalender tanpa tumpang tindih, serta kendali penuh di tangan pengguna untuk menyesuaikan jadwal secara fleksibel.

---

## Fitur Utama

- **Analisis Tugas AI (Natural Language Processing)**: Menangkap input tugas bebas dan mengonversinya menjadi sub-tugas terstruktur dengan estimasi durasi realistis.
- **Penjadwalan Deterministik Kalender**: Menempatkan tugas ke dalam slot kosong di kalender mingguan secara presisi tanpa halusinasi.
- **Fleksibilitas Override Pengguna**: Drag-and-drop dan kustomisasi waktu langsung di kalender interaktif.
- **Pengecekan Energi & Reality Check**: Menyesuaikan rencana dengan kondisi energi harian mahasiswa.
- **Refleksi Mingguan**: Evaluasi ketercapaian jadwal dan keseimbangan waktu belajar vs istirahat.
- **Keepalive Database**: Otomatisasi ping untuk menjaga Supabase tier gratis tetap aktif.

---

## Tech Stack

- **Framework Web**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Komponen Kalender**: FullCalendar (`@fullcalendar/react`, daygrid, timegrid, interaction)
- **Database & Otentikasi**: Supabase (PostgreSQL + Auth via `@supabase/supabase-js` dan `@supabase/ssr`)
- **Kecerdasan Buatan**: Google Gemini API via `@google/generative-ai`
- **Validasi Skema**: Zod
- **Unit Testing**: Vitest
- **Target Deployment**: Vercel (Frontend) & Supabase (Backend/Database)

---

## Setup Lokal

### 1. Prasyarat
- Node.js versi 20 atau lebih baru
- Akun Supabase & Google AI Studio (API Key Gemini)

### 2. Kloning & Pemasangan Dependensi
```bash
git clone <repository-url>
cd FocusFlowApp
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel lingkungan berikut di `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

### 5. Pengujian & Validasi Kualitas Kode
```bash
npm run lint       # Memeriksa kualitas kode dengan ESLint
npm run typecheck  # Memeriksa tipe data dengan TypeScript
npm run test       # Menjalankan unit test dengan Vitest
npm run build      # Memeriksa build produksi Next.js
```

---

## Deploy

1. **Supabase**: Jalankan skrip DDL dari `supabase/schema.sql` di SQL Editor Supabase.
2. **Vercel**: Hubungkan repositori GitHub ke Vercel.
3. **Environment Variables di Vercel**: Masukkan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `GEMINI_API_KEY`.
4. **Automated Keepalive**: Workflow GitHub Actions di `.github/workflows/keepalive.yml` siap diaktifkan untuk menjaga instance database tetap aktif.

---

## Struktur Proyek

```text
FocusFlowApp/
├── app/
│   ├── api/
│   │   ├── explain/route.ts
│   │   ├── parse-task/route.ts
│   │   ├── ping/route.ts
│   │   ├── reflect/route.ts
│   │   └── schedule/route.ts
│   ├── auth/
│   │   └── callback/route.ts
│   ├── dashboard/
│   │   ├── refleksi/page.tsx
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── BlockDetail.tsx
│   ├── Calendar.tsx
│   ├── EnergyCheckin.tsx
│   ├── FixedEventForm.tsx
│   ├── HumanScore.tsx
│   ├── RealityCheck.tsx
│   ├── TaskInput.tsx
│   └── TaskPanel.tsx
├── lib/
│   ├── ai/
│   │   ├── gemini.ts
│   │   └── schemas.ts
│   ├── scheduler/
│   │   ├── index.test.ts
│   │   ├── index.ts
│   │   ├── priority.ts
│   │   └── slots.ts
│   └── supabase/
│       ├── client.ts
│       └── server.ts
├── scripts/
│   └── seed.ts
├── supabase/
│   └── schema.sql
├── .github/
│   └── workflows/
│       └── keepalive.yml
├── .env.example
├── middleware.ts
├── package.json
├── PROGRESS.md
├── README.md
├── tsconfig.json
└── vitest.config.mts
```
