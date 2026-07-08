import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import { getBudgetsWithSpent, getUserCategories } from "@/db/queries";
import { currentMonth } from "@/lib/format";
import { BudgetsClient } from "./budgets-client";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetsPage({
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

  const [budgets, categories] = await Promise.all([
    getBudgetsWithSpent(userId, month),
    getUserCategories(userId),
  ]);

  return (
    <BudgetsClient
      budgets={budgets}
      categories={categories.filter((c) => c.type === "expense")}
      month={month}
    />
  );
}
