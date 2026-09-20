"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { getWalletsWithBalances } from "@/db/queries";
import { requireUserId } from "@/lib/require-user";
import { todayString } from "@/lib/format";
import {
  adjustBalanceSchema,
  transactionSchema,
  type AdjustBalanceInput,
  type TransactionInput,
} from "@/lib/zod-schemas";

const PATHS = ["/transactions", "/dashboard", "/wallets", "/budgets", "/reports"];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

function toValues(userId: string, data: TransactionInput) {
  return {
    userId,
    walletId: data.walletId,
    categoryId: data.type === "transfer" ? null : (data.categoryId ?? null),
    type: data.type,
    amount: String(data.amount),
    date: data.date,
    note: data.note || null,
    transferToWalletId:
      data.type === "transfer" ? (data.transferToWalletId ?? null) : null,
  };
}

export async function createTransaction(input: TransactionInput) {
  const userId = await requireUserId();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db.insert(transactions).values(toValues(userId, parsed.data));
  revalidateAll();
  return { success: true };
}

export async function updateTransaction(id: string, input: TransactionInput) {
  const userId = await requireUserId();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db
    .update(transactions)
    .set(toValues(userId, parsed.data))
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  revalidateAll();
  return { success: true };
}

// Samakan saldo dompet dengan saldo asli: hitung selisih dari saldo
// tercatat saat ini, lalu simpan sebagai satu transaksi tipe "adjustment"
// (amount bisa negatif) supaya riwayatnya tetap tercatat, bukan menimpa data.
export async function adjustWalletBalance(
  walletId: string,
  input: AdjustBalanceInput
) {
  const userId = await requireUserId();
  const parsed = adjustBalanceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const walletList = await getWalletsWithBalances(userId);
  const wallet = walletList.find((w) => w.id === walletId);
  if (!wallet) return { error: "Dompet tidak ditemukan" };

  const diff = parsed.data.actualBalance - wallet.balance;
  if (diff === 0) {
    return { error: "Saldo sudah sesuai, tidak ada yang perlu disesuaikan" };
  }

  await db.insert(transactions).values({
    userId,
    walletId,
    categoryId: null,
    type: "adjustment",
    amount: String(diff),
    date: todayString(),
    note: parsed.data.note,
    transferToWalletId: null,
  });
  revalidateAll();
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  revalidateAll();
  return { success: true };
}
