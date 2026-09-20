import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ChartPie,
  Download,
  Lock,
  Scale,
  Tags,
  Target,
  Wallet,
} from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/components/landing-nav";
import { LandingFaq } from "@/components/landing-faq";

export const metadata: Metadata = {
  title: "DuitKu: Catat Keuangan, Gratis & Bisa Dicoba Tanpa Akun",
};

const FEATURES = [
  {
    icon: Wallet,
    title: "Multi-Dompet, Saldo Otomatis",
    description:
      "Cash, rekening bank, e-wallet, semua kelihatan di satu tempat. Saldo dihitung otomatis dari transaksi, bukan diketik manual.",
    color: "#6366f1",
  },
  {
    icon: Tags,
    title: "Kategori Custom",
    description:
      "12 kategori bawaan siap pakai, atau bikin sendiri lengkap dengan ikon dan warna favoritmu.",
    color: "#ec4899",
  },
  {
    icon: Target,
    title: "Budget dengan Indikator Warna",
    description:
      "Set batas pengeluaran per kategori. Warnanya berubah hijau, kuning, lalu merah begitu mendekati batas.",
    color: "#22c55e",
  },
  {
    icon: ChartPie,
    title: "Laporan & Grafik Bulanan",
    description:
      "Bandingkan pengeluaran antar bulan, lihat komposisi per kategori, dan pantau saving rate-mu.",
    color: "#0ea5e9",
  },
  {
    icon: Scale,
    title: "Sesuaikan Saldo Sekali Klik",
    description:
      'Saldo di aplikasi beda dengan dompet asli? Masukkan saldo sebenarnya, selisihnya otomatis tercatat rapi sebagai "penyesuaian", bukan menimpa riwayat lama.',
    color: "#f59e0b",
  },
] as const;

const STEPS = [
  {
    title: "Pilih jalan pintasmu",
    description:
      'Klik "Coba Tanpa Akun" buat langsung mulai, atau daftar kalau mau datamu tersimpan permanen dan bisa diakses dari perangkat lain.',
  },
  {
    title: "Tambahkan dompetmu",
    description:
      "Cash di dompet, rekening BCA, saldo GoPay: masukkan satu per satu beserta saldo awalnya.",
  },
  {
    title: "Catat tiap transaksi",
    description:
      "Uang masuk, keluar, atau transfer antar dompet, cukup beberapa detik lewat tombol Catat.",
  },
  {
    title: "Pantau & sesuaikan",
    description:
      "Dashboard dan laporan ter-update otomatis. Kalau saldo meleset dari dompet asli, tinggal sesuaikan.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:gap-8 md:px-6 md:py-24">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Duitmu ke mana aja, akhirnya kelihatan jelas.
              </h1>
              <p className="text-lg text-muted-foreground text-pretty">
                DuitKu bantu kamu catat pemasukan, pengeluaran, dan semua
                dompet dalam satu tempat, gratis, dan bisa langsung dicoba
                tanpa daftar dulu.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
                  Daftar Gratis, Langsung Pakai <ArrowRight />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/guest/dashboard" />}
                >
                  Coba Tanpa Akun Dulu
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Tanpa kartu kredit. Mode tanpa akun menyimpan data langsung di
                browser-mu, bukan di server kami.
              </p>
            </div>

            {/* Mockup dashboard — ilustrasi tampilan, bukan data asli */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 relative">
              <div className="relative rounded-2xl border bg-card p-4 shadow-xl sm:p-5">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-4 text-white">
                  <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-8 -left-3 h-20 w-20 rounded-full bg-white/10" />
                  <p className="flex items-center gap-1.5 text-xs text-white/80">
                    <Wallet className="h-3.5 w-3.5" /> Total Saldo
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight">
                    Rp 4.250.000
                  </p>
                  <p className="mt-1 text-xs text-white/70">dari 3 dompet</p>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    { name: "Cash", color: "#22c55e", amount: "Rp 350.000" },
                    { name: "BCA", color: "#3b82f6", amount: "Rp 2.900.000" },
                    { name: "GoPay", color: "#0ea5e9", amount: "Rp 1.000.000" },
                  ].map((w) => (
                    <div key={w.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: w.color }}
                        />
                        <span className="font-medium">{w.name}</span>
                      </div>
                      <span className="font-semibold">{w.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-5 -left-4 hidden rotate-[-4deg] rounded-xl border bg-card px-3.5 py-2.5 shadow-lg sm:block">
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </span>
                  <div>
                    <p className="font-medium">Gaji Bulanan</p>
                    <p className="text-xs text-green-600 dark:text-green-400">+Rp 5.000.000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur */}
        <section id="fitur" className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Semua yang kamu butuh, tanpa yang tidak perlu
              </h2>
              <p className="mt-3 text-muted-foreground">
                Fitur intinya cuma ini, dan semuanya beneran dipakai, bukan
                sekadar pemanis.
              </p>
            </div>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {/* Kartu besar: pembeda utama DuitKu, sengaja disorot lebih
                  besar dari fitur lain (lihat R-14/R-31) */}
              <div className="relative overflow-hidden rounded-2xl border bg-card p-6 lg:col-span-2 lg:row-span-2">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10" />
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Lock className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-semibold">
                  Coba Dulu, Tanpa Akun
                </h3>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Nggak semua orang mau daftar cuma buat coba-coba. Klik
                  &quot;Coba Tanpa Akun&quot;, catat dompet dan transaksi
                  langsung: datanya tersimpan di browser HP atau laptopmu
                  sendiri, bukan di server kami.
                </p>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Kalau nanti berubah pikiran, data itu bisa dipindahkan ke
                  akun beneran cuma dengan satu klik, atau di-export dulu
                  sebagai file JSON/CSV.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1">
                    <Download className="h-3 w-3" /> Export JSON & CSV
                  </span>
                </div>
              </div>

              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: feature.color }}
                  >
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cara Kerja */}
        <section id="cara-kerja" className="py-20">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Empat langkah, mulai hari ini
              </h2>
              <p className="mt-3 text-muted-foreground">
                Nggak ada setup ribet. Beneran cuma ini urutannya.
              </p>
            </div>

            <ol className="mt-12 space-y-8">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative flex gap-5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                    )}
                  </div>
                  <div className="pb-2">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Pertanyaan yang sering muncul
              </h2>
            </div>
            <div className="mt-12">
              <LandingFaq />
            </div>
          </div>
        </section>

        {/* CTA penutup */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 md:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 px-6 py-14 text-center text-white sm:px-14">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-white/10" />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Mulai catat keuanganmu sekarang
              </h2>
              <p className="mx-auto mt-3 max-w-md text-white/85">
                Nggak perlu mikir lama. Coba dulu tanpa akun, atau langsung
                daftar kalau sudah yakin.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  nativeButton={false}
                  render={<Link href="/register" />}
                >
                  Daftar Gratis
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  nativeButton={false}
                  render={<Link href="/guest/dashboard" />}
                >
                  Coba Tanpa Akun
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center md:flex-row md:justify-between md:text-left">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white">
              <Wallet className="h-3.5 w-3.5" />
            </span>
            DuitKu
          </Link>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a href="#fitur" className="hover:text-foreground">Fitur</a>
            <a href="#cara-kerja" className="hover:text-foreground">Cara Kerja</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link href="/login" className="hover:text-foreground">Masuk</Link>
            <Link href="/guest/dashboard" className="hover:text-foreground">Coba Tanpa Akun</Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            Catatan keuangan pribadi, gratis.
          </p>
        </div>
      </footer>
    </div>
  );
}
