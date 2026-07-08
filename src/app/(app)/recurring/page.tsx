import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import {
  getRecurringRules,
  getUserCategories,
  getWalletsWithBalances,
} from "@/db/queries";
import { RecurringClient } from "./recurring-client";

export const metadata: Metadata = { title: "Transaksi Berulang" };

export default async function RecurringPage() {
  const userId = await requireUserId();
  const [rules, wallets, categories] = await Promise.all([
    getRecurringRules(userId),
    getWalletsWithBalances(userId),
    getUserCategories(userId),
  ]);

  return (
    <RecurringClient rules={rules} wallets={wallets} categories={categories} />
  );
}
