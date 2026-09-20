"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  TransactionsClient,
  type TransactionsGuestActions,
} from "@/app/(app)/transactions/transactions-client";
import {
  computeTransactionsPage,
  computeWalletsWithBalances,
  createGuestTransaction,
  deleteGuestTransaction,
  downloadGuestTransactionsCsv,
  updateGuestTransaction,
  useGuestData,
} from "@/lib/guest-store";
import type { TransactionFilters } from "@/db/queries";
import type { TransactionType } from "@/db/schema";

const TX_TYPES = ["income", "expense", "transfer", "adjustment"] as const;

function parseFilters(params: URLSearchParams): TransactionFilters {
  const typeParam = params.get("type");
  return {
    type: TX_TYPES.includes(typeParam as TransactionType)
      ? (typeParam as TransactionType)
      : undefined,
    walletId: params.get("wallet") || undefined,
    categoryId: params.get("category") || undefined,
    dateFrom: params.get("from") || undefined,
    dateTo: params.get("to") || undefined,
    q: params.get("q") || undefined,
    page: Number(params.get("page")) || 1,
  };
}

export default function GuestTransactionsPage() {
  return (
    <Suspense>
      <GuestTransactionsContent />
    </Suspense>
  );
}

function GuestTransactionsContent() {
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const data = useGuestData();

  const pageData = useMemo(
    () => computeTransactionsPage(data, filters),
    [data, filters]
  );
  const wallets = useMemo(() => computeWalletsWithBalances(data), [data]);

  const actions = useMemo<TransactionsGuestActions>(
    () => ({
      createTransaction: createGuestTransaction,
      updateTransaction: updateGuestTransaction,
      deleteTransaction: deleteGuestTransaction,
      onExportCsv: () => downloadGuestTransactionsCsv(filters),
    }),
    [filters]
  );

  return (
    <TransactionsClient
      data={pageData}
      wallets={wallets}
      categories={data.categories}
      filters={filters}
      guest={actions}
    />
  );
}
