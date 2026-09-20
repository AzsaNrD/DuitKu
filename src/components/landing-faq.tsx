"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";

// Semua pertanyaan di sini beneran spesifik ke fitur DuitKu yang ada
// (lihat README & kode) — bukan template "Apakah data saya aman?" generik.
const FAQ_ITEMS = [
  {
    question: "Beneran gratis, tidak ada paket berbayar?",
    answer:
      "Ya. DuitKu dibangun pakai layanan gratisan (Neon Postgres, Vercel), jadi tidak ada langganan atau fitur yang dikunci di balik pembayaran.",
  },
  {
    question: "Wajib bikin akun dulu?",
    answer:
      'Tidak. Ada tombol "Coba Tanpa Akun": kamu langsung bisa catat dompet dan transaksi, datanya tersimpan di browser HP/laptop kamu sendiri. Kalau nanti mau daftar akun, data itu bisa dipindahkan sekali klik.',
  },
  {
    question: "Kalau pakai mode tanpa akun terus ganti HP, datanya ikut pindah?",
    answer:
      "Tidak otomatis, karena memang tidak disimpan di server kami. Sebelum ganti perangkat, export dulu datanya (JSON) lewat halaman Transaksi, atau daftar akun supaya datanya tersimpan permanen dan bisa diakses dari perangkat lain.",
  },
  {
    question: "Saldo di aplikasi beda dengan uang asli di dompet, gimana benerinnya?",
    answer:
      'Pakai fitur "Sesuaikan Saldo" di halaman Dompet: masukkan saldo yang sebenarnya, selisihnya otomatis dicatat sebagai satu transaksi penyesuaian (bukan menimpa riwayat lama), lengkap dengan kolom alasan supaya tetap bisa ditelusuri.',
  },
  {
    question: "Data transaksi saya bisa dipindahkan ke Excel?",
    answer:
      "Bisa, ada tombol Export di halaman Transaksi yang mengunduh CSV sesuai filter yang lagi aktif, langsung bisa dibuka di Excel atau Google Sheets.",
  },
  {
    question: "Ada aplikasi mobile-nya?",
    answer:
      "Belum ada aplikasi native. DuitKu adalah web app yang responsif, buka lewat browser HP, tampilannya sudah menyesuaikan dan ada navigasi bawah ala aplikasi.",
  },
];

export function LandingFaq() {
  return (
    <Accordion className="mx-auto max-w-2xl divide-y">
      {FAQ_ITEMS.map((item, i) => (
        <AccordionItem key={item.question} value={i}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionPanel>{item.answer}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
