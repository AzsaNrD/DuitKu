"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, LayoutDashboard, LogIn, Tags, Wallet } from "lucide-react";
import { BalanceToggle } from "@/components/balance-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Nav mode tanpa akun sengaja lebih pendek dari (app)/layout.tsx: Budget,
// Impian, Transaksi Berulang, dan Laporan grafik lengkap butuh logika yang
// terlalu rumit untuk direplikasi murni di localStorage (lihat percakapan
// fitur ini), jadi belum tersedia di sini.
const GUEST_NAV_ITEMS = [
  { href: "/guest/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/guest/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/guest/wallets", label: "Dompet", icon: Wallet },
  { href: "/guest/categories", label: "Kategori", icon: Tags },
] as const;

function GuestNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex flex-col gap-1.5", className)}>
      {GUEST_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function GuestBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
      <div className="grid grid-cols-4">
        {GUEST_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background p-5 md:flex">
        <Link
          href="/guest/dashboard"
          className="mb-8 flex items-center gap-2.5 px-2 text-lg font-bold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </span>
          DuitKu
        </Link>
        <GuestNav />
        <div className="mt-auto space-y-2 rounded-xl border border-dashed p-3.5">
          <p className="text-xs text-muted-foreground">
            Mode tanpa akun. Data cuma tersimpan di browser ini, daftar
            supaya aman dan bisa diakses dari perangkat lain.
          </p>
          <Button size="sm" className="w-full" nativeButton={false} render={<Link href="/register" />}>
            <LogIn className="h-4 w-4" /> Daftar Akun Gratis
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <Link
            href="/guest/dashboard"
            className="flex items-center gap-2 font-bold md:hidden"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-4 w-4" />
            </span>
            DuitKu
          </Link>
          <span className="hidden rounded-full border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground md:inline-block">
            Mode tanpa akun
          </span>
          <div className="ml-auto flex items-center gap-1">
            <BalanceToggle />
            <ThemeToggle />
            <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
              Daftar
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 md:p-8 md:pb-10">
          {children}
        </main>
      </div>

      <GuestBottomNav />
    </div>
  );
}
