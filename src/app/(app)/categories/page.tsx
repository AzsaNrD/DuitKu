import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import {
  getExpenseByCategory,
  getIncomeByCategory,
  getPayday,
  getUserCategories,
} from "@/db/queries";
import { todayString } from "@/lib/format";
import { periodKeyOf, periodNoun, periodRange } from "@/lib/period";
import { CategoriesClient } from "./categories-client";

export const metadata: Metadata = { title: "Kategori" };

export default async function CategoriesPage() {
  const userId = await requireUserId();
  const payday = await getPayday(userId);
  // total tiap kategori di periode berjalan (bulan kalender atau periode gajian)
  const range = periodRange(periodKeyOf(todayString(), payday), payday);

  const [categories, expense, income] = await Promise.all([
    getUserCategories(userId),
    getExpenseByCategory(userId, range),
    getIncomeByCategory(userId, range),
  ]);

  const totals: Record<string, number> = {};
  for (const row of [...expense, ...income]) {
    if (row.categoryId) totals[row.categoryId] = row.total;
  }

  return (
    <CategoriesClient
      categories={categories}
      totals={totals}
      noun={periodNoun(payday)}
    />
  );
}
