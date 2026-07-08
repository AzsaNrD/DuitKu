import type { Metadata } from "next";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { requireUserId } from "@/lib/require-user";
import {
  getExpenseByCategory,
  getIncomeByCategory,
  getMonthlyTrend,
  getMonthSummary,
} from "@/db/queries";
import { currentMonth, formatIDR, formatMonth, shiftMonth } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthNav } from "@/components/month-nav";
import { ExpensePieChart } from "@/components/expense-pie-chart";
import { TrendChart } from "@/components/trend-chart";
import { CategoryBars } from "./category-bars";

export const metadata: Metadata = { title: "Laporan" };

function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(pct).toFixed(0)}% vs bulan lalu
    </span>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const monthParam = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : currentMonth();
  const prevMonth = shiftMonth(month, -1);

  const [summary, prevSummary, expenseByCategory, incomeByCategory, trend] =
    await Promise.all([
      getMonthSummary(userId, month),
      getMonthSummary(userId, prevMonth),
      getExpenseByCategory(userId, month),
      getIncomeByCategory(userId, month),
      getMonthlyTrend(userId, month, 6),
    ]);

  const net = summary.income - summary.expense;
  const savingRate =
    summary.income > 0 ? (net / summary.income) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Laporan Bulanan</h1>
          <p className="text-sm text-muted-foreground">
            Evaluasi keuangan {formatMonth(month)}
          </p>
        </div>
        <MonthNav month={month} />
      </div>

      {/* Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowDownLeft className="h-4 w-4 text-green-500" /> Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatIDR(summary.income)}
            </p>
            <p className="text-xs text-muted-foreground">
              Bulan lalu: {formatIDR(prevSummary.income)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-red-500" /> Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatIDR(summary.expense)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Bulan lalu: {formatIDR(prevSummary.expense)}
              </p>
              <ChangeBadge
                current={summary.expense}
                previous={prevSummary.expense}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PiggyBank className="h-4 w-4" /> Tabungan Bersih
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p
              className={`text-2xl font-bold ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {net >= 0 ? "+" : ""}
              {formatIDR(net)}
            </p>
            {savingRate !== null && (
              <p className="text-xs text-muted-foreground">
                {savingRate.toFixed(0)}% dari pemasukan
                {savingRate >= 20
                  ? " — bagus, pertahankan! 🎉"
                  : savingRate >= 0
                    ? " — coba tingkatkan ke 20%"
                    : " — pengeluaran melebihi pemasukan ⚠️"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tren 6 bulan terakhir */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tren 6 Bulan Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Komposisi Pengeluaran
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rincian per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CategoryBars
              title="Pengeluaran"
              items={expenseByCategory}
              total={summary.expense}
            />
            <CategoryBars
              title="Pemasukan"
              items={incomeByCategory}
              total={summary.income}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
