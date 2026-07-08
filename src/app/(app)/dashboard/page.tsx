import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  PiggyBank,
  Smartphone,
  Sparkles,
  Target,
  Wallet as WalletIcon,
} from "lucide-react";
import { auth } from "@/auth";
import { requireUserId } from "@/lib/require-user";
import { processDueRecurring } from "@/lib/recurring";
import {
  getBudgetsWithSpent,
  getExpenseByCategory,
  getGoals,
  getMonthSummary,
  getTransactionsPage,
  getUserCategories,
  getWalletsWithBalances,
} from "@/db/queries";
import { currentMonth, formatIDR, formatMonth } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ExpensePieChart } from "@/components/expense-pie-chart";
import { BudgetProgressItem } from "@/components/budget-progress";
import { TransactionItem } from "@/app/(app)/transactions/transactions-client";
import { QuickAddButton } from "./quick-add-button";

export const metadata: Metadata = { title: "Dashboard" };

const WALLET_ICONS = {
  cash: Banknote,
  bank: CreditCard,
  ewallet: Smartphone,
} as const;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const session = await auth();
  // catat transaksi berulang yang sudah jatuh tempo sebelum menampilkan data
  await processDueRecurring(userId);
  const month = currentMonth();

  const [wallets, summary, expenseByCategory, recent, budgets, categories, goals] =
    await Promise.all([
      getWalletsWithBalances(userId),
      getMonthSummary(userId, month),
      getExpenseByCategory(userId, month),
      getTransactionsPage(userId, { pageSize: 8 }),
      getBudgetsWithSpent(userId, month),
      getUserCategories(userId),
      getGoals(userId),
    ]);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
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
            Ini ringkasan keuanganmu bulan {formatMonth(month)}
          </p>
        </div>
        <QuickAddButton wallets={wallets} categories={categories} />
      </div>

      {/* Kartu ringkasan */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {/* Hero: total saldo */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white sm:col-span-2 lg:col-span-1">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-white/10" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/85">
              <WalletIcon className="h-4 w-4" /> Total Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight md:text-[1.7rem]">
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
            <p className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
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
            <p className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
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
              className={`text-2xl font-bold tracking-tight ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {net >= 0 ? "+" : ""}
              {formatIDR(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Saldo per dompet */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dompet</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/wallets" />}>
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
                  <Button size="sm" nativeButton={false} render={<Link href="/wallets" />}>
                    Tambah Dompet
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {wallets.map((wallet) => {
                  const Icon = WALLET_ICONS[wallet.type];
                  return (
                    <div
                      key={wallet.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: wallet.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium">
                          {wallet.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatIDR(wallet.balance)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie chart pengeluaran */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pengeluaran per Kategori
            </CardTitle>
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

        {/* Budget bulan ini */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Budget Bulan Ini</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/budgets" />}>
              Kelola
            </Button>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <EmptyState
                compact
                icon={Target}
                title="Belum ada budget"
                description="Batasi pengeluaran per kategori supaya lebih terkontrol."
                action={
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/budgets" />}>
                    Set Budget
                  </Button>
                }
              />
            ) : (
              <div className="divide-y">
                {budgets.map((budget) => (
                  <BudgetProgressItem key={budget.id} budget={budget} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impian */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Impian</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/goals" />}>
              Kelola
            </Button>
          </CardHeader>
          <CardContent>
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
              <div className="space-y-5">
                {goals.slice(0, 4).map((goal) => {
                  const target = Number(goal.targetAmount);
                  const saved = Number(goal.savedAmount);
                  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
                  const done = saved >= target;
                  return (
                    <div key={goal.id}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {goal.name} {done && "🎉"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatIDR(saved)} / {formatIDR(target)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: done ? "#22c55e" : goal.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaksi terbaru */}
        <Card className="lg:col-span-2">
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
