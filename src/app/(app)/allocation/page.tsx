import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import {
  getAllocationOverview,
  getAllocationPlan,
  getPayday,
  getUserCategories,
  getWalletsWithBalances,
} from "@/db/queries";
import { todayString } from "@/lib/format";
import { periodKeyOf } from "@/lib/period";
import { AllocationClient } from "./allocation-client";

export const metadata: Metadata = { title: "Alokasi" };

export default async function AllocationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;

  const [payday, plan] = await Promise.all([
    getPayday(userId),
    getAllocationPlan(userId),
  ]);

  // kunci periode = bulan tempat periode dimulai; tanpa parameter, periode
  // yang memuat hari ini (dengan gajian tanggal 21, tanggal 2 Nov masih
  // periode yang dimulai 21 Okt)
  const monthParam = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : periodKeyOf(todayString(), payday);

  const [overview, categories, wallets] = await Promise.all([
    getAllocationOverview(userId, month, plan, payday),
    getUserCategories(userId),
    getWalletsWithBalances(userId),
  ]);

  return (
    <AllocationClient
      month={month}
      payday={payday}
      overview={overview}
      plan={plan}
      expenseCategories={categories.filter((c) => c.type === "expense")}
      incomeCategories={categories.filter((c) => c.type === "income")}
      wallets={wallets}
    />
  );
}
