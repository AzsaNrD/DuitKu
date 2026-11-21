"use client";

import { useState } from "react";
import Link from "next/link";
import { useOptimisticPath } from "@/components/nav-pending";
import {
  ArrowLeftRight,
  ChartPie,
  HandCoins,
  Ellipsis,
  LayoutDashboard,
  Percent,
  PiggyBank,
  Repeat,
  Tags,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// mobileHidden: bottom nav di HP hanya muat 6 slot, jadi menu ini pindah ke
// sheet "Lainnya" (dengan deskripsi singkat supaya fiturnya ketahuan).
// Di laptop semuanya tampil di sidebar.
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
  {
    href: "/recurring",
    label: "Berulang",
    icon: Repeat,
    mobileHidden: true,
    desc: "Gaji, langganan, dan tagihan yang tercatat otomatis",
  },
  { href: "/wallets", label: "Dompet", icon: Wallet },
  {
    href: "/categories",
    label: "Kategori",
    icon: Tags,
    mobileHidden: true,
    desc: "Atur kategori pemasukan dan pengeluaran",
  },
  { href: "/allocation", label: "Alokasi", icon: Percent },
  {
    href: "/goals",
    label: "Impian",
    icon: PiggyBank,
    mobileHidden: true,
    desc: "Target tabungan dan seberapa dekat kamu mencapainya",
  },
  {
    href: "/splits",
    label: "Talangan",
    icon: HandCoins,
    mobileHidden: true,
    desc: "Catat patungan dan uang teman yang kamu talangi",
  },
  { href: "/reports", label: "Laporan", icon: ChartPie },
] as const;

export function SidebarNav() {
  const { current: pathname, onNavigate } = useOptimisticPath();
  return (
    <nav className="flex flex-col gap-1.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate(href)}
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

export function BottomNav() {
  const { current: pathname, onNavigate } = useOptimisticPath();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV_ITEMS.filter(
    (item) => !("mobileHidden" in item && item.mobileHidden)
  );
  const moreItems = NAV_ITEMS.filter(
    (item): item is Extract<(typeof NAV_ITEMS)[number], { desc: string }> =>
      "mobileHidden" in item && item.mobileHidden
  );
  const moreActive = moreItems.some((item) => pathname.startsWith(item.href));
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
        <div className="grid grid-cols-6">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate(href)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              moreActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Ellipsis className="h-5 w-5" />
            Lainnya
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
        >
          <SheetHeader>
            <SheetTitle>Menu lainnya</SheetTitle>
            <SheetDescription>Fitur lain di DuitKu</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-2 pb-2">
            {moreItems.map(({ href, label, icon: Icon, desc }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={(e) => {
                    onNavigate(href)(e);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent active:bg-accent"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {desc}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
