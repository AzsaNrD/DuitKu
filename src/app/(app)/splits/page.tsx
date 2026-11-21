import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import {
  getSplits,
  getUserCategories,
  getWalletsWithBalances,
} from "@/db/queries";
import { todayString } from "@/lib/format";
import { SplitsClient } from "./splits-client";

export const metadata: Metadata = { title: "Talangan" };

export default async function SplitsPage() {
  const userId = await requireUserId();
  const [bills, wallets, categories] = await Promise.all([
    getSplits(userId),
    getWalletsWithBalances(userId),
    getUserCategories(userId),
  ]);

  return (
    <SplitsClient
      bills={bills}
      wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
      expenseCategories={categories
        .filter((c) => c.type === "expense")
        .map((c) => ({ id: c.id, name: c.name }))}
      today={todayString()}
    />
  );
}
