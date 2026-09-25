"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Lock,
  PiggyBank,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  computeExpenseByCategory,
  computeMonthSummary,
  computeRecentTransactions,
  computeWalletsWithBalances,
  useGuestData,
} from "@/lib/guest-store";
import { currentMonth, formatIDR, formatMonth } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ExpensePieChart } from "@/components/expense-pie-chart";
import { WalletSummaryList } from "@/components/wallet-summary-list";
import { GuestBackupCard } from "@/components/guest-backup-card";
import { TransactionItem } from "@/app/(app)/transactions/transactions-client";

export default function GuestDashboardPage() {
  const data = useGuestData();
  const month = currentMonth();

  const wallets = useMemo(() => computeWalletsWithBalances(data), [data]);
  const summary = useMemo(() => computeMonthSummary(data, month), [data, month]);
  const expenseByCategory = useMemo(
    () => computeExpenseByCategory(data, month),
    [data, month]
  );
  const recent = useMemo(() => computeRecentTransactions(data, 8), [data]);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const net = summary.income - summary.expense;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Mode tanpa akun
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Ringkasan keuanganmu bulan {formatMonth(month)}, tersimpan di
            browser ini saja
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/guest/transactions" />}>
          <ArrowLeftRight /> Catat Transaksi
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white sm:col-span-2 lg:col-span-1">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-white/10" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/85">
              <WalletIcon className="h-4 w-4" /> Total Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money text-2xl font-bold tracking-tight md:text-[1.7rem]">
              {formatIDR(totalBalance)}
            </p>
            <p className="mt-1 text-xs text-white/75">
              dari {wallets.length} dompet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
              </span>
              Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
              {formatIDR(summary.income)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              </span>
              Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {formatIDR(summary.expense)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <PiggyBank className="h-4 w-4 text-primary" />
              </span>
              Selisih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`money text-2xl font-bold tracking-tight ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {net >= 0 ? "+" : ""}
              {formatIDR(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dompet</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/guest/wallets" />}>
              Kelola
            </Button>
          </CardHeader>
          <CardContent>
            {wallets.length === 0 ? (
              <EmptyState
                compact
                icon={WalletIcon}
                title="Belum ada dompet"
                description="Tambahkan cash, rekening bank, atau e-wallet untuk mulai mencatat."
                action={
                  <Button size="sm" nativeButton={false} render={<Link href="/guest/wallets" />}>
                    Tambah Dompet
                  </Button>
                }
              />
            ) : (
              <WalletSummaryList wallets={wallets} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpensePieChart
              data={expenseByCategory.map((c) => ({
                name: c.name,
                color: c.color,
                total: c.total,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/guest/transactions" />}>
              Lihat Semua
            </Button>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {recent.length === 0 ? (
              <EmptyState
                compact
                icon={ArrowLeftRight}
                title="Belum ada transaksi"
                description="Catat pemasukan atau pengeluaran pertamamu lewat tombol di atas."
              />
            ) : (
              <div className="divide-y">
                {recent.map((row) => (
                  <TransactionItem key={row.id} row={row} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <GuestBackupCard />

        <Card className="lg:col-span-2 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">
                Alokasi, Impian & Transaksi Berulang perlu akun
              </p>
              <p className="text-sm text-muted-foreground">
                Fitur ini butuh penyimpanan yang lebih permanen. Daftar akun
                gratis, dan data yang sudah kamu catat di sini bisa dipindahkan
                otomatis.
              </p>
            </div>
            <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
              Daftar Akun Gratis
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
