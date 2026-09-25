import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import {
  getAllocationOverview,
  getAllocationPlan,
  getUserCategories,
  getWalletsWithBalances,
} from "@/db/queries";
import { currentMonth } from "@/lib/format";
import { AllocationClient } from "./allocation-client";

export const metadata: Metadata = { title: "Alokasi" };

export default async function AllocationPage({
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

  const plan = await getAllocationPlan(userId);
  const [overview, categories, wallets] = await Promise.all([
    getAllocationOverview(userId, month, plan),
    getUserCategories(userId),
    getWalletsWithBalances(userId),
  ]);

  return (
    <AllocationClient
      month={month}
      overview={overview}
      plan={plan}
      expenseCategories={categories.filter((c) => c.type === "expense")}
      incomeCategories={categories.filter((c) => c.type === "income")}
      wallets={wallets}
    />
  );
}
