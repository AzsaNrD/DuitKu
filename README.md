# DuitKu — Catatan Keuangan Pribadi

Aplikasi web untuk mencatat uang masuk/keluar, mengelola dompet (cash, bank, e-wallet), budget bulanan, dan laporan keuangan. Dibangun dengan teknologi gratis: Next.js + Neon Postgres + Vercel.

## Fitur

- 🔐 **Login** — email/password atau akun Google
- 👛 **Multi dompet** — cash, rekening bank, e-wallet; saldo terhitung otomatis
- 📝 **Catat transaksi** — pemasukan, pengeluaran, dan transfer antar dompet
- 🏷️ **Kategori custom** — 12 kategori bawaan + bisa tambah sendiri (ikon & warna)
- 🎯 **Budget bulanan** — batas pengeluaran per kategori dengan indikator hijau/kuning/merah
- 📊 **Dashboard & laporan** — grafik pengeluaran per kategori, perbandingan antar bulan, saving rate
- 🌓 **Tema light/dark**
- 📱 Responsif (mobile-friendly, ada bottom navigation)

## Tech Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui · Drizzle ORM · Neon Postgres · Auth.js (NextAuth v5) · Recharts

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Siapkan database (Neon — gratis)

1. Daftar di [neon.tech](https://neon.tech), buat project baru
2. Klik **Connect**, salin connection string
3. Salin `.env.local.example` menjadi `.env.local`, isi `DATABASE_URL` dengan connection string tadi

> **Alternatif untuk development lokal:**
> - **PGlite (tanpa install apa pun)** — set `DATABASE_URL="file:./.pglite"`. Data tersimpan di folder `.pglite`.
>   Jika muncul error `RuntimeError: Aborted()` (biasanya karena dev server dimatikan paksa), jalankan `npm run db:reset`
>   untuk membuat ulang database dev (data dev hilang).
> - **PostgreSQL lokal / Docker** — mis. `docker run -d --name duitku-pg -e POSTGRES_PASSWORD=duitku -e POSTGRES_DB=duitku -p 5433:5432 postgres:16-alpine`
>   lalu set `DATABASE_URL="postgresql://postgres:duitku@localhost:5433/duitku"`.
>   Aplikasi otomatis memakai driver lokal jika host-nya localhost.

### 3. Generate AUTH_SECRET

```bash
npx auth secret
```

atau isi manual `AUTH_SECRET` di `.env.local` dengan string acak.

### 4. (Opsional) Login dengan Google

1. Buka [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Buat **OAuth Client ID** (tipe: Web application)
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (dan versi domain produksi saat deploy)
4. Isi `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET` di `.env.local`

Tanpa ini, login email/password tetap berfungsi normal.

### 5. Buat tabel database

```bash
npm run db:push
```

### 6. Jalankan

```bash
npm run dev
```

Buka http://localhost:3000 — daftar akun, tambah dompet, dan mulai mencatat!

## Deploy ke Vercel (gratis)

1. Push repo ini ke GitHub
2. Import di [vercel.com](https://vercel.com) → New Project
3. Isi Environment Variables: `DATABASE_URL`, `AUTH_SECRET`, (opsional) `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
4. Deploy. Untuk login Google, tambahkan redirect URI produksi: `https://<domain>/api/auth/callback/google`

## Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build produksi |
| `npm run db:push` | Sinkronkan schema ke database |
| `npm run db:generate` | Generate file migrasi SQL |
| `npm run db:studio` | GUI untuk melihat isi database |
