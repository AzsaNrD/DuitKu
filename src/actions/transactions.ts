"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { getWalletsWithBalances } from "@/db/queries";
import { requireUserId } from "@/lib/require-user";
import { todayString } from "@/lib/format";
import {
  FEE_CATEGORY_COLOR,
  FEE_CATEGORY_ICON,
  FEE_CATEGORY_NAME,
  FEE_NOTE,
  feeApplies,
} from "@/lib/fee";
import {
  adjustBalanceSchema,
  transactionSchema,
  type AdjustBalanceInput,
  type TransactionInput,
} from "@/lib/zod-schemas";

const PATHS = ["/transactions", "/dashboard", "/wallets", "/reports", "/allocation", "/goals"];

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

// Kategori "Biaya Admin" dibuat saat pertama kali dibutuhkan, supaya akun
// lama tidak perlu migrasi data
async function ensureFeeCategory(userId: string): Promise<string> {
  const existing = await db.query.categories.findFirst({
    where: and(
      eq(categories.userId, userId),
      eq(categories.name, FEE_CATEGORY_NAME),
      eq(categories.type, "expense")
    ),
  });
  if (existing) return existing.id;
  const [created] = await db
    .insert(categories)
    .values({
      userId,
      name: FEE_CATEGORY_NAME,
      type: "expense",
      icon: FEE_CATEGORY_ICON,
      color: FEE_CATEGORY_COLOR,
      isDefault: false,
    })
    .returning({ id: categories.id });
  return created.id;
}

function feeValues(
  userId: string,
  parentId: string,
  base: ReturnType<typeof toValues>,
  fee: number,
  categoryId: string
) {
  return {
    userId,
    walletId: base.walletId,
    categoryId,
    type: "expense" as const,
    amount: String(fee),
    date: base.date,
    note: FEE_NOTE,
    transferToWalletId: null,
    feeForId: parentId,
  };
}

export async function createTransaction(input: TransactionInput) {
  const userId = await requireUserId();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const values = toValues(userId, parsed.data);
  const fee = feeApplies(parsed.data.type) ? (parsed.data.fee ?? 0) : 0;
  if (fee > 0) {
    // satu perintah INSERT untuk induk dan biayanya, supaya keduanya
    // tersimpan bersama atau tidak sama sekali
    const id = crypto.randomUUID();
    const categoryId = await ensureFeeCategory(userId);
    await db
      .insert(transactions)
      .values([
        { id, ...values },
        feeValues(userId, id, values, fee, categoryId),
      ]);
  } else {
    await db.insert(transactions).values(values);
  }
  revalidateAll();
  return { success: true };
}

export async function updateTransaction(id: string, input: TransactionInput) {
  const userId = await requireUserId();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const current = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
  });
  if (!current) return { error: "Transaksi tidak ditemukan" };
  if (current.feeForId) {
    return {
      error: "Biaya admin diubah lewat transaksi induknya",
    };
  }

  const values = toValues(userId, parsed.data);
  await db
    .update(transactions)
    .set(values)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  // samakan biaya admin yang menempel: dibuat, diperbarui, atau dihapus
  const child = await db.query.transactions.findFirst({
    where: and(eq(transactions.feeForId, id), eq(transactions.userId, userId)),
  });
  const fee = feeApplies(parsed.data.type) ? (parsed.data.fee ?? 0) : 0;
  if (fee > 0) {
    const categoryId = await ensureFeeCategory(userId);
    const row = feeValues(userId, id, values, fee, categoryId);
    if (child) {
      await db.update(transactions).set(row).where(eq(transactions.id, child.id));
    } else {
      await db.insert(transactions).values(row);
    }
  } else if (child) {
    await db.delete(transactions).where(eq(transactions.id, child.id));
  }

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
