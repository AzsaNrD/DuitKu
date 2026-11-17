import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Percent,
  PiggyBank,
  Plus,
  Sparkles,
  Wallet as WalletIcon,
} from "lucide-react";
import { getSession, requireUserId } from "@/lib/require-user";
import { loadWithDueRecurring } from "@/lib/recurring";
import { compareSnackWithAllocation } from "@/lib/snack-allocation";
import {
  getAllocationOverview,
  getAllocationPlan,
  getExpenseByCategory,
  getGoalsWithProgress,
  getMonthSummary,
  getPayday,
  getSnackOverview,
  getSnackPlan,
  getTransactionsPage,
  getUserCategories,
  getWalletsWithBalances,
} from "@/db/queries";
import { currentHour, formatIDR, todayString } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/tilt-card";
import { HeroWalletBreakdown } from "@/components/hero-wallet-breakdown";
import { AnimatedMoney } from "@/components/animated-money";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ExpensePieChart } from "@/components/expense-pie-chart";
import { SnackCard } from "@/components/snack-card";
import { periodKeyOf, periodLabel, periodNoun, periodRange } from "@/lib/period";
import { WalletSummaryList } from "@/components/wallet-summary-list";
import {
  AllocationBucketRow,
  AllocationSplitBar,
} from "@/components/allocation-progress";
import { TransactionItem } from "@/app/(app)/transactions/transactions-client";
import { QuickAddButton } from "./quick-add-button";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const hour = currentHour();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const session = await getSession();
  const today = todayString();

  // Alokasi dan Jatah Jajan mengikuti periode gajian; ringkasan di atasnya
  // tetap bulan kalender. Tanggal gajian diambil bersamaan dengan query lain
  // dan hanya dua query itu yang menunggunya.
  // Semua ringkasan (pemasukan, pengeluaran, pie, alokasi, jajan) memakai
  // periode yang sama: bulan kalender, atau rentang gajian kalau tanggal
  // gajian bukan 1. Jadwal berulang yang jatuh tempo dicatat bersamaan dengan pengambilan data
  // (lihat loadWithDueRecurring), bukan menunggunya dulu.
  const [
    wallets,
    summary,
    expenseByCategory,
    recent,
    categories,
    goals,
    allocation,
    snack,
    payday,
  ] = await loadWithDueRecurring(userId, () => {
    // payday, rencana alokasi, dan rencana jajan tidak saling bergantung,
    // jadi diambil bersamaan; baru ringkasan keduanya menunggu payday
    const paydayPromise = getPayday(userId);
    const allocationPlanPromise = getAllocationPlan(userId);
    const snackPlanPromise = getSnackPlan(userId);
    return Promise.all([
      getWalletsWithBalances(userId),
      paydayPromise.then((pd) =>
        getMonthSummary(userId, periodRange(periodKeyOf(today, pd), pd))
      ),
      paydayPromise.then((pd) =>
        getExpenseByCategory(userId, periodRange(periodKeyOf(today, pd), pd))
      ),
      getTransactionsPage(userId, { pageSize: 6 }),
      getUserCategories(userId),
      getGoalsWithProgress(userId),
      Promise.all([paydayPromise, allocationPlanPromise]).then(([pd, plan]) =>
        getAllocationOverview(userId, periodKeyOf(today, pd), plan, pd)
      ),
      Promise.all([paydayPromise, snackPlanPromise]).then(([pd, plan]) =>
        getSnackOverview(userId, today, pd, plan)
      ),
      paydayPromise,
    ]);
  });
  const periodText = periodLabel(periodKeyOf(today, payday), payday);
  const periodWord = periodNoun(payday);
  const snackCategoryOptions = categories
    .filter((c) => c.type === "expense")
    .map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }));

  const snackAllocationLink = snack
    ? compareSnackWithAllocation({
        snackLimit: snack.plan.limit,
        snackCategoryIds: snack.plan.categoryIds,
        buckets: allocation.buckets,
        incomeUsed: allocation.income.used,
      })
    : null;

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  // pengganti peringatan kartu Budget lama: kategori yang melewati batasnya
  const overLimit = allocation.buckets
    .flatMap((b) => b.categories)
    .filter((c) => c.limit !== null && c.spent > c.limit);
  const net = summary.income - summary.expense;
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Ini ringkasan keuanganmu {periodWord} {periodText}
          </p>
        </div>
        <QuickAddButton wallets={wallets} categories={categories} />
      </div>

      {/* Grid bento: 1 kolom di HP, 2 di tablet, 4 di desktop.
          Hero 2x2 di kiri, pemasukan/pengeluaran/selisih di kanannya,
          lalu kartu lebar bergantian setengah dan penuh. */}
      <div className="bento-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {/* Hero: total saldo */}
        <TiltCard
          glare
          glareClassName="rounded-2xl"
          className="sm:col-span-2 lg:row-span-2 motion-safe:animate-swing-in"
        >
          <Card className="relative h-full overflow-hidden border-0 bg-brand-gradient text-white">
            <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-white/10" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/85">
                <WalletIcon className="h-4 w-4" /> Total Saldo
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <div>
                <p className="money text-4xl font-bold tracking-tight md:text-5xl">
                  <AnimatedMoney value={totalBalance} />
                </p>
                <p className="mt-1.5 text-sm text-white/75">
                  dari {wallets.length} dompet
                </p>
              </div>
              <div className="mt-auto">
                <HeroWalletBreakdown wallets={wallets} addHref="/wallets" />
              </div>
            </CardContent>
          </Card>
        </TiltCard>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <span className="stat-chip flex h-8 w-8 items-center justify-center rounded-lg bg-income/10">
                <ArrowDownLeft className="h-4 w-4 text-income" />
              </span>
              Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money text-2xl font-bold tracking-tight text-income">
              <AnimatedMoney value={summary.income} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <span className="stat-chip flex h-8 w-8 items-center justify-center rounded-lg bg-expense/10">
                <ArrowUpRight className="h-4 w-4 text-expense" />
              </span>
              Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="money text-2xl font-bold tracking-tight text-expense">
              <AnimatedMoney value={summary.expense} />
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <span className="stat-chip flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <PiggyBank className="h-4 w-4 text-primary" />
              </span>
              Selisih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`money text-2xl font-bold tracking-tight ${net >= 0 ? "text-income" : "text-expense"}`}
            >
              {net >= 0 ? "+" : ""}
              <AnimatedMoney value={net} />
            </p>
          </CardContent>
        </Card>

        {/* Keputusan harian: berapa yang masih aman untuk jajan hari ini */}
        <SnackCard
          overview={snack}
          today={today}
          categories={snackCategoryOptions}
          payday={payday}
          allocationLink={snackAllocationLink}
        />

        {/* Alokasi pendapatan periode berjalan */}
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base">
                Alokasi {periodWord === "bulan" ? "Bulan Ini" : "Periode Ini"}
              </CardTitle>
              {payday > 1 && (
                <p className="text-xs text-muted-foreground">{periodText}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/allocation" />}
            >
              {allocation.hasPlan ? "Detail" : "Atur"}
            </Button>
          </CardHeader>
          <CardContent>
            {allocation.hasPlan ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Dari pemasukan{" "}
                    <span className="money font-semibold text-foreground">
                      {formatIDR(allocation.income.used)}
                    </span>
                  </p>
                  {allocation.income.used === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Belum ada pemasukan tercatat {periodWord} ini
                    </p>
                  )}
                </div>
                <AllocationSplitBar buckets={allocation.buckets} />
                <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                  {allocation.buckets.map((bucket) => (
                    <AllocationBucketRow key={bucket.id} bucket={bucket} compact />
                  ))}
                </div>
                {overLimit.length > 0 && (
                  <p className="rounded-lg bg-expense/10 px-3 py-2 text-sm text-expense">
                    Melewati batas {periodWord} ini:{" "}
                    {overLimit
                      .map((c) => `${c.name} (lebih ${formatIDR(c.spent - (c.limit ?? 0))})`)
                      .join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                compact
                icon={Percent}
                title="Belum ada rencana alokasi"
                description="Bagi pemasukan ke kebutuhan, keinginan, dan tabungan, lalu pantau realisasinya tiap bulan."
                action={
                  <Button size="sm" nativeButton={false} render={<Link href="/allocation" />}>
                    Atur Alokasi Gaji
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Saldo per dompet */}
        <Card className="sm:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dompet</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/wallets" />}>
              Kelola
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {wallets.length === 0 ? (
              <EmptyState
                compact
                icon={WalletIcon}
                title="Belum ada dompet"
                description="Tambahkan cash, rekening bank, atau e-wallet untuk mulai mencatat."
                action={
                  <Button size="sm" nativeButton={false} render={<Link href="/wallets" />}>
                    Tambah Dompet
                  </Button>
                }
              />
            ) : (
              <div className="flex h-full flex-col gap-4">
                <WalletSummaryList wallets={wallets} />
                <Link
                  href="/wallets"
                  className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Tambah dompet
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie chart pengeluaran */}
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Pengeluaran per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            <div className="w-full">
              <ExpensePieChart
                data={expenseByCategory.map((c) => ({
                  name: c.name,
                  color: c.color,
                  total: c.total,
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Impian: berpasangan dengan Transaksi Terbaru */}
        <Card className="sm:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Impian</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/goals" />}>
              Kelola
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {goals.length === 0 ? (
              <EmptyState
                compact
                icon={Sparkles}
                title="Belum ada impian"
                description="Pengen beli sesuatu? Bikin targetnya dan nabung sedikit demi sedikit."
                action={
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/goals" />}>
                    Buat Impian
                  </Button>
                }
              />
            ) : (
              <div className="flex h-full flex-col gap-3">
                {goals.slice(0, 4).map((goal) => {
                  const target = Number(goal.targetAmount);
                  const saved = goal.saved;
                  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
                  const done = saved >= target;
                  return (
                    <div key={goal.id} className="rounded-xl bg-muted/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 break-words font-medium">
                          {goal.name}
                        </span>
                        <span
                          className={cn(
                            "money shrink-0 text-lg font-bold",
                            done && "text-income"
                          )}
                        >
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`Progres impian ${goal.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(pct)}
                        className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: done ? "var(--income)" : goal.color,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="money font-medium text-foreground">
                          {formatIDR(saved)}
                        </span>{" "}
                        dari <span className="money">{formatIDR(target)}</span>
                        {done
                          ? ", tercapai 🎉"
                          : `, sisa ${formatIDR(target - saved)}`}
                      </p>
                    </div>
                  );
                })}
                {goals.length < 4 && (
                  <Link
                    href="/goals"
                    className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Tambah impian
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaksi terbaru: berpasangan dengan Impian di sebelahnya */}
        <Card className="sm:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/transactions" />}>
              Lihat Semua
            </Button>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {recent.rows.length === 0 ? (
              <EmptyState
                compact
                icon={ArrowLeftRight}
                title="Belum ada transaksi"
                description="Catat pemasukan atau pengeluaran pertamamu lewat tombol di atas."
              />
            ) : (
              <div className="divide-y">
                {recent.rows.map((row) => (
                  <TransactionItem key={row.id} row={row} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
