# DuitKu

Aplikasi web untuk mencatat keuangan pribadi dalam rupiah. Kamu mencatat uang masuk dan keluar, membagi gaji ke pos-pos, memisahkan jatah jajan, dan melihat ke mana uangmu pergi tiap periode.

DuitKu dibuat untuk orang yang gajiannya tidak jatuh di tanggal 1. Kalau kamu gajian tanggal 21, periodemu berjalan dari 21 sampai 20 bulan berikutnya, dan Dashboard, Laporan, Alokasi, dan Jatah Jajan mengikuti rentang itu. Kalau gaji bulan tertentu cair terlambat, misalnya tanggal 24, kamu bisa menggeser tanggal mulai periode itu saja.

Semuanya jalan di tier gratis: Next.js, Neon Postgres, dan Vercel.

## Fitur

**Mencatat uang**
- Dompet cash, bank, dan e-wallet. Saldo dihitung dari saldo awal ditambah semua transaksi, bukan angka yang diketik ulang.
- Transaksi pemasukan, pengeluaran, dan transfer antar dompet. Tombol Transfer ada di tiap kartu dompet.
- Biaya admin opsional di pengeluaran dan transfer. Biayanya tercatat sebagai pengeluaran di kategori Biaya Admin dan tertaut ke transaksinya, jadi ikut berubah atau terhapus bersamanya.
- Kategori bawaan yang bisa kamu tambah sendiri, lengkap dengan ikon dan warna.
- Sesuaikan saldo: ketik saldo sebenarnya, selisihnya tercatat sebagai penyesuaian.
- Transaksi berulang untuk gaji, tagihan, langganan, atau transfer rutin ke dompet tabungan.
- Talangan atau patungan: catat pengeluaran yang kamu bayar dulu untuk teman, tentukan siapa saja yang ikut dan bagiannya (nominal boleh dikosongkan dulu), lihat sisa yang belum dibagi, bagi rata sisanya, lalu catat saat mereka mengembalikan uangnya. Ada rekap per orang, dan uang yang kembali bisa langsung masuk ke dompet.
- Dompet yang masih punya transfer, jadwal berulang, impian, atau pos alokasi tidak bisa dihapus, supaya saldo dompet lain tidak berubah diam-diam.

**Merencanakan uang**
- Alokasi gaji dengan preset 50/30/20, 70/20/10, 40/30/20/10, atau rencanamu sendiri. Tiap pos menampilkan rencana dan realisasi, plus batas pengeluaran per kategori.
- Pos tabungan menghitung realisasi dari transfer ke dompet tabungan yang kamu hubungkan.
- Jatah jajan: tentukan batas dan kategori yang dihitung, lalu lihat sisa jatah yang aman dipakai hari ini. Aplikasi juga membandingkan batas itu dengan pos alokasi yang memuat kategori jajanmu.
- Impian dengan progres manual atau mengikuti saldo dompet. Kalau ada tanggal target, kartu menunjukkan berapa yang perlu disisihkan per gajian dan kapan targetnya tercapai dengan laju 60 hari terakhir.

**Membaca kebiasaan**
- Dashboard dengan ringkasan periode, komposisi pengeluaran, dan transaksi terbaru.
- Laporan per periode: pemasukan, pengeluaran, tabungan bersih, jumlah yang benar-benar ditransfer ke dompet tabungan, dan perkiraan uangmu cukup sampai kapan.
- Insight kebiasaan yang dihitung dari transaksimu: proyeksi jajan, kategori yang naik, hari paling boros, porsi pengeluaran di 7 hari pertama setelah gajian, dan satu pengeluaran yang menonjol.
- Ekspor transaksi ke CSV mengikuti filter yang aktif.

**Lainnya**
- Login dengan email dan password, atau akun Google.
- Mode tanpa akun: data tersimpan di browser, bisa diunduh sebagai cadangan JSON atau CSV, dan bisa dipindah ke akun saat kamu mendaftar.
- Tema terang dan gelap, tombol sembunyikan saldo, dan tampilan yang menyesuaikan layar HP.
- Bisa dipasang ke layar utama sebagai PWA.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui di atas Base UI, Drizzle ORM, Neon Postgres, Auth.js (NextAuth v5), Recharts.

## Menjalankan di komputer sendiri

Kamu butuh Node.js dan npm.

```bash
npm install
cp .env.local.example .env.local
```

Isi `.env.local` (lihat tabel di bawah), lalu buat tabel dan jalankan server:

```bash
npm run db:push
npm run dev
```

Buka http://localhost:3000, daftar akun, tambah dompet, dan mulai mencatat.

### Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Connection string database. Lihat pilihan di bawah. |
| `AUTH_SECRET` | ya | String acak untuk menandatangani sesi. Buat dengan `npx auth secret`. |
| `AUTH_GOOGLE_ID` | tidak | Client ID OAuth Google. |
| `AUTH_GOOGLE_SECRET` | tidak | Client secret OAuth Google. |

Tanpa dua variabel Google, login email dan password tetap berfungsi.

### Pilihan database

Aplikasi memilih driver dari isi `DATABASE_URL`:

| Nilai | Driver | Cocok untuk |
|---|---|---|
| `postgresql://...neon.tech/...` | Neon serverless | Produksi dan development dengan Neon |
| `postgresql://...@localhost:5433/...` | node-postgres | Postgres lokal atau Docker |
| `file:./.pglite` | PGlite | Development tanpa memasang apa pun |

**Neon.** Daftar di [neon.tech](https://neon.tech), buat project, klik Connect, lalu salin connection string ke `DATABASE_URL`.

**PGlite.** Set `DATABASE_URL="file:./.pglite"`. Data tersimpan di folder `.pglite`. Kalau muncul `RuntimeError: Aborted()`, biasanya karena dev server dimatikan paksa. Jalankan `npm run db:reset` untuk membuat ulang database development. Data development akan hilang.

**Docker.** Contoh:

```bash
docker run -d --name duitku-pg -e POSTGRES_PASSWORD=duitku -e POSTGRES_DB=duitku -p 5433:5432 postgres:16-alpine
```

lalu set `DATABASE_URL="postgresql://postgres:duitku@localhost:5433/duitku"`.

### Login dengan Google (opsional)

1. Buka [Google Cloud Console](https://console.cloud.google.com), pilih APIs & Services, lalu Credentials.
2. Buat OAuth Client ID bertipe Web application.
3. Tambahkan redirect URI `http://localhost:3000/api/auth/callback/google`. Saat deploy, tambahkan juga versi domain produksimu.
4. Isi `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET` di `.env.local`.

## Deploy ke Vercel

1. Push repo ke GitHub.
2. Di [vercel.com](https://vercel.com), pilih New Project lalu import repo ini.
3. Isi Environment Variables: `DATABASE_URL`, `AUTH_SECRET`, dan kalau perlu `AUTH_GOOGLE_ID` serta `AUTH_GOOGLE_SECRET`.
4. Deploy. Untuk login Google, tambahkan redirect URI `https://<domainmu>/api/auth/callback/google`.

Jalankan `npm run db:push` sekali dari komputermu dengan `DATABASE_URL` yang menunjuk ke database produksi, supaya tabelnya ada sebelum aplikasi dipakai.

## Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | Periksa kode dengan ESLint |
| `npm run db:push` | Sinkronkan schema ke database |
| `npm run db:generate` | Buat file migrasi SQL |
| `npm run db:studio` | Buka GUI untuk melihat isi database |
| `npm run db:reset` | Hapus database PGlite lokal lalu buat ulang tabelnya |

## Struktur folder

```
src/
  app/          halaman dan route (App Router); (app) untuk pengguna login, guest untuk mode tanpa akun
  actions/      server action untuk menulis data
  db/           schema Drizzle dan semua query baca
  lib/          logika murni: periode gajian, insight, jatah jajan, laju impian, validasi
  components/   komponen UI bersama
```

## Catatan untuk yang mengembangkan

Proyek ini memakai Next.js 16, yang punya perubahan dibanding versi lama. Baca panduan di `node_modules/next/dist/docs/` sebelum memakai API yang belum kamu kenal.

Tanggal gajian dibatasi 1 sampai 28 supaya tiap bulan pasti punya tanggal itu. Kunci periode berbentuk `YYYY-MM` dan menunjuk bulan tempat periode dimulai, jadi dengan gajian tanggal 21, kunci `2026-10` berarti 21 Oktober sampai 20 November 2026. Fungsinya ada di `src/lib/period.ts`.

Tanggal mulai satu periode bisa digeser lewat tabel `payday_overrides` (kunci periode dan tanggal mulai sebenarnya, yang harus jatuh di bulan yang sama dengan kuncinya). Periode berakhir sehari sebelum periode berikutnya dimulai. Semua fungsi periode menerima `PaydayPlan` (tanggal biasa ditambah daftar geseran), bukan satu angka. Setelah menarik perubahan ini, jalankan `npm run db:push` untuk membuat tabelnya.

Talangan memakai tiga tabel: `splits` (satu talangan), `split_members` (orang yang ikut, nominal kosong berarti belum ditentukan, `is_self` untuk bagianmu), dan `split_payments` (uang yang dikembalikan). Perhitungannya ada di `src/lib/split.ts`. Uang yang kembali ke dompet dicatat sebagai pemasukan di kategori "Pengembalian Talangan" yang dibuat saat pertama dipakai, dan menghapus pemasukan itu dari Transaksi ikut menghapus catatan pembayarannya.

Biaya admin disimpan sebagai transaksi pengeluaran terpisah yang menunjuk induknya lewat kolom `transactions.fee_for_id` (hapus berantai). Induk dan biayanya dibuat dalam satu perintah INSERT. Kategori "Biaya Admin" dibuat otomatis saat pertama dipakai, dan baris biaya tidak bisa diedit langsung, hanya lewat transaksi induknya.
