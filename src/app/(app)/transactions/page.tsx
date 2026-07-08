import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import { processDueRecurring } from "@/lib/recurring";
import {
  getTransactionsPage,
  getUserCategories,
  getWalletsWithBalances,
} from "@/db/queries";
import type { TransactionType } from "@/db/schema";
import { TransactionsClient } from "./transactions-client";

export const metadata: Metadata = { title: "Transaksi" };

const TX_TYPES = ["income", "expense", "transfer"] as const;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  await processDueRecurring(userId);
  const params = await searchParams;

  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const typeParam = first(params.type);
  const filters = {
    type: TX_TYPES.includes(typeParam as TransactionType)
      ? (typeParam as TransactionType)
      : undefined,
    walletId: first(params.wallet) || undefined,
    categoryId: first(params.category) || undefined,
    dateFrom: first(params.from) || undefined,
    dateTo: first(params.to) || undefined,
    q: first(params.q) || undefined,
    page: Number(first(params.page)) || 1,
  };

  const [data, wallets, categories] = await Promise.all([
    getTransactionsPage(userId, filters),
    getWalletsWithBalances(userId),
    getUserCategories(userId),
  ]);

  return (
    <TransactionsClient
      data={data}
      wallets={wallets}
      categories={categories}
      filters={filters}
    />
  );
}
