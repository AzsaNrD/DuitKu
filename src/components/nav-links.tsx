"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChartPie,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Tags,
  Target,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// mobileHidden: bottom nav di HP hanya muat 6 item;
// halaman berulang tetap bisa diakses dari halaman Transaksi
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/recurring", label: "Berulang", icon: Repeat, mobileHidden: true },
  { href: "/wallets", label: "Dompet", icon: Wallet },
  { href: "/categories", label: "Kategori", icon: Tags },
  { href: "/budgets", label: "Budget", icon: Target },
  { href: "/goals", label: "Impian", icon: PiggyBank, mobileHidden: true },
  { href: "/reports", label: "Laporan", icon: ChartPie },
] as const;

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
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
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !("mobileHidden" in item && item.mobileHidden)
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
      <div className="grid grid-cols-6">
        {items.map(({ href, label, icon: Icon }) => {
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
