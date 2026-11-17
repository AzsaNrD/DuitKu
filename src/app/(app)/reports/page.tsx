import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Lightbulb,
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
  getPayday,
  getSnackPlan,
  getSnackSpending,
  getSpendingByWeekday,
} from "@/db/queries";
import { formatIDR, todayString } from "@/lib/format";
import { addDays, countWeekdays } from "@/lib/snack";
import {
  daysBetweenInclusive,
  periodKeyOf,
  periodLabel,
  periodLength,
  periodNoun,
  periodRange,
  shiftPeriodKey,
} from "@/lib/period";
import { buildInsights } from "@/lib/insights";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { InsightList } from "@/components/insight-list";
import { MonthNav } from "@/components/month-nav";
import { ExpensePieChart } from "@/components/expense-pie-chart";
import { TrendChart } from "@/components/trend-chart";
import { CategoryBars } from "./category-bars";

export const metadata: Metadata = { title: "Laporan" };

function ChangeBadge({
  current,
  previous,
  noun,
}: {
  current: number;
  previous: number;
  noun: string;
}) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-expense" : "text-income"}`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(pct).toFixed(0)}% vs {noun} lalu
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
  // Laporan mengikuti periode gajian: bulan kalender kalau gajian tanggal 1,
  // selain itu rentang gajian. `month` adalah kunci periode ("YYYY-MM" =
  // bulan tempat periode dimulai), sama seperti halaman Alokasi.
  const payday = await getPayday(userId);
  const today = todayString();
  const currentKey = periodKeyOf(today, payday);
  const monthParam = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : currentKey;
  const prevMonth = shiftPeriodKey(month, -1);
  const range = periodRange(month, payday);
  const prevRange = periodRange(prevMonth, payday);
  const noun = periodNoun(payday);
  const Noun = noun === "bulan" ? "Bulan" : "Periode";
  const label = periodLabel(month, payday);

  const [
    summary,
    prevSummary,
    expenseByCategory,
    prevExpenseByCategory,
    incomeByCategory,
    trend,
    snackPlan,
  ] = await Promise.all([
    getMonthSummary(userId, range),
    getMonthSummary(userId, prevRange),
    getExpenseByCategory(userId, range),
    getExpenseByCategory(userId, prevRange),
    getIncomeByCategory(userId, range),
    getMonthlyTrend(userId, month, 6, payday),
    getSnackPlan(userId),
  ]);

  const net = summary.income - summary.expense;
  const savingRate =
    summary.income > 0 ? (net / summary.income) * 100 : null;

  // Insight kebiasaan. Pola per hari memakai 91 hari (13 minggu) yang
  // berakhir hari ini, atau akhir periode untuk periode yang sudah lewat,
  // supaya tiap hari dalam seminggu muncul tepat 13 kali.
  const isCurrentMonth = month === currentKey;
  // periode yang belum terjadi tidak punya kebiasaan untuk dianalisis; tanpa
  // pengecualian ini jendela 91 hari akan menyedot transaksi periode berjalan
  const isFutureMonth = month > currentKey;
  const monthDays = periodLength(month, payday);
  const windowEnd = isCurrentMonth ? today : range.end;
  const windowStart = addDays(windowEnd, -90);

  const [weekdayRows, snackSpending] = isFutureMonth
    ? [[], null]
    : await Promise.all([
        getSpendingByWeekday(
          userId,
          windowStart,
          windowEnd,
          snackPlan ? snackPlan.categoryIds : null
        ),
        snackPlan
          ? getSnackSpending(userId, range, today, snackPlan.categoryIds)
          : null,
      ]);
  const occurrences = countWeekdays(windowStart, windowEnd);
  const totalsByDow = new Map(weekdayRows.map((r) => [r.dow, r.total]));
  const insights = isFutureMonth ? [] : buildInsights({
    money: formatIDR,
    monthLabel: label,
    noun,
    isCurrentMonth,
    daysElapsed: isCurrentMonth
      ? daysBetweenInclusive(range.start, today)
      : monthDays,
    daysInMonth: monthDays,
    totalExpense: summary.expense,
    prevTotalExpense: prevSummary.expense,
    byCategory: expenseByCategory.map((c) => ({
      id: c.categoryId,
      name: c.name,
      total: c.total,
    })),
    prevByCategory: prevExpenseByCategory.map((c) => ({
      id: c.categoryId,
      name: c.name,
      total: c.total,
    })),
    weekday: {
      scopeLabel: snackPlan ? "jajan" : "pengeluaran",
      windowLabel: isCurrentMonth
        ? "13 minggu terakhir"
        : `13 minggu sampai akhir ${label}`,
      rows: occurrences.map((occ, dow) => ({
        dow,
        total: totalsByDow.get(dow) ?? 0,
        occurrences: occ,
      })),
    },
    snack:
      snackPlan && snackSpending
        ? {
            limit: snackPlan.limit,
            spentMonth: snackSpending.spentMonth,
            count: snackSpending.count,
          }
        : null,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {payday > 1 ? "Laporan per Periode" : "Laporan Bulanan"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Evaluasi keuangan {label}
          </p>
        </div>
        <MonthNav month={month} label={payday > 1 ? label : undefined} />
      </div>

      {/* Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowDownLeft className="h-4 w-4 text-income" /> Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="money text-2xl font-bold text-income">
              {formatIDR(summary.income)}
            </p>
            <p className="money text-xs text-muted-foreground">
              {Noun} lalu: {formatIDR(prevSummary.income)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-expense" /> Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="money text-2xl font-bold text-expense">
              {formatIDR(summary.expense)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="money text-xs text-muted-foreground">
                {Noun} lalu: {formatIDR(prevSummary.expense)}
              </p>
              <ChangeBadge
                current={summary.expense}
                previous={prevSummary.expense}
                noun={noun}
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
              className={`money text-2xl font-bold ${net >= 0 ? "text-income" : "text-expense"}`}
            >
              {net >= 0 ? "+" : ""}
              {formatIDR(net)}
            </p>
            {savingRate !== null && (
              <p className="text-xs text-muted-foreground">
                {savingRate.toFixed(0)}% dari pemasukan
                {savingRate >= 20
                  ? " (bagus, pertahankan! 🎉)"
                  : savingRate >= 0
                    ? " (coba tingkatkan ke 20%)"
                    : " (pengeluaran melebihi pemasukan ⚠️)"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insight kebiasaan: dihitung dari transaksi yang tercatat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kebiasaan belanjamu</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dihitung dari transaksi yang kamu catat di {label}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length === 0 ? (
            <EmptyState
              compact
              icon={Lightbulb}
              title="Belum cukup data untuk insight"
              description="Insight muncul setelah ada pengeluaran tercatat. Pola per hari butuh catatan beberapa minggu."
            />
          ) : (
            <InsightList insights={insights} />
          )}
          {!snackPlan && (
            <p className="text-sm text-muted-foreground">
              Mau proyeksi dan frekuensi jajan juga?{" "}
              <Link
                href="/dashboard"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Atur jatah jajan di dashboard
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tren 6 bulan terakhir */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tren 6 {Noun} Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={trend.map((t) =>
              payday > 1
                ? {
                    ...t,
                    label: periodLabel(t.month, payday)
                      .split(" sampai ")[0],
                  }
                : t
            )}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Komposisi Pengeluaran
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
