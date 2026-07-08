import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  PiggyBank,
  Smartphone,
  Wallet as WalletIcon,
} from "lucide-react";
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

export default async function DashboardPage() {
  const userId = await requireUserId();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan {formatMonth(month)}
          </p>
        </div>
        <QuickAddButton wallets={wallets} categories={categories} />
      </div>

      {/* Kartu ringkasan */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <WalletIcon className="h-4 w-4" /> Total Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatIDR(totalBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowDownLeft className="h-4 w-4 text-green-500" /> Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatIDR(summary.income)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-red-500" /> Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatIDR(summary.expense)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PiggyBank className="h-4 w-4" /> Selisih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {net >= 0 ? "+" : ""}
              {formatIDR(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Saldo per dompet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dompet</CardTitle>
          </CardHeader>
          <CardContent>
            {wallets.length === 0 ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada dompet.
                </p>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/wallets" />}>
                  Tambah Dompet
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.map((wallet) => {
                  const Icon = WALLET_ICONS[wallet.type];
                  return (
                    <div
                      key={wallet.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
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
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada budget. Set budget untuk mengontrol pengeluaran.
              </p>
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
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada impian. Pengen beli sesuatu? Bikin target nabungnya!
              </p>
            ) : (
              <div className="space-y-4">
                {goals.slice(0, 4).map((goal) => {
                  const target = Number(goal.targetAmount);
                  const saved = Number(goal.savedAmount);
                  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
                  const done = saved >= target;
                  return (
                    <div key={goal.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {goal.name} {done && "🎉"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatIDR(saved)} / {formatIDR(target)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/transactions" />}>
              Lihat Semua
            </Button>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {recent.rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada transaksi.
              </p>
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
