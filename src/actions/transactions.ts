"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  splitMembers,
  splitPayments,
  splits,
  transactions,
  wallets,
} from "@/db/schema";
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
  deletedTransactionsSchema,
  transactionSchema,
  type AdjustBalanceInput,
  type DeletedTransactions,
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

// Menghapus transaksi beserta biaya admin yang menempel, dan mengembalikan
// isinya (snapshot) supaya bisa diurungkan lewat restoreTransactions.
export async function deleteTransaction(
  id: string
): Promise<{ success: true; snapshot?: DeletedTransactions }> {
  const userId = await requireUserId();
  const parent = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
  });
  if (!parent) return { success: true };

  const fees = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.feeForId, id))
    );
  const rows = [parent, ...fees];
  const ids = rows.map((r) => r.id);

  // sambungan ke Talangan yang putus saat transaksinya terhapus
  const [linkedSplits, linkedPayments] = await Promise.all([
    db
      .select({ splitId: splits.id, transactionId: splits.transactionId })
      .from(splits)
      .where(
        and(eq(splits.userId, userId), inArray(splits.transactionId, ids))
      ),
    db
      .select()
      .from(splitPayments)
      .where(
        and(
          eq(splitPayments.userId, userId),
          inArray(splitPayments.transactionId, ids)
        )
      ),
  ]);

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  revalidateAll();
  revalidatePath("/splits");

  return {
    success: true,
    snapshot: {
      transactions: rows.map((r) => ({
        id: r.id,
        walletId: r.walletId,
        categoryId: r.categoryId,
        type: r.type,
        amount: r.amount,
        date: r.date,
        note: r.note,
        transferToWalletId: r.transferToWalletId,
        feeForId: r.feeForId,
        createdAt: r.createdAt.toISOString(),
      })),
      splitLinks: linkedSplits.flatMap((s) =>
        s.transactionId
          ? [{ splitId: s.splitId, transactionId: s.transactionId }]
          : []
      ),
      payments: linkedPayments.flatMap((p) =>
        p.transactionId
          ? [
              {
                id: p.id,
                memberId: p.memberId,
                amount: p.amount,
                date: p.date,
                transactionId: p.transactionId,
              },
            ]
          : []
      ),
    },
  };
}

// Urungkan penghapusan: isi dari klien tidak dipercaya begitu saja. Pemilik
// dompet dan kategori dicek ulang, userId selalu diambil dari sesi, dan
// sambungan ke Talangan hanya dipulihkan kalau Talangannya masih ada.
export async function restoreTransactions(raw: unknown) {
  const userId = await requireUserId();
  const parsed = deletedTransactionsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Data tidak valid" };
  const snap = parsed.data;

  const walletIds = [
    ...new Set(
      snap.transactions.flatMap((t) =>
        t.transferToWalletId ? [t.walletId, t.transferToWalletId] : [t.walletId]
      )
    ),
  ];
  const ownWallets = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(and(eq(wallets.userId, userId), inArray(wallets.id, walletIds)));
  if (ownWallets.length !== walletIds.length) {
    return { error: "Dompetnya sudah dihapus, transaksi tidak bisa dipulihkan" };
  }

  const categoryIds = [
    ...new Set(
      snap.transactions.flatMap((t) => (t.categoryId ? [t.categoryId] : []))
    ),
  ];
  const ownCategories =
    categoryIds.length > 0
      ? await db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.userId, userId),
              inArray(categories.id, categoryIds)
            )
          )
      : [];
  const categoryOk = new Set(ownCategories.map((c) => c.id));

  const snapIds = new Set(snap.transactions.map((t) => t.id));
  const outsideParents = [
    ...new Set(
      snap.transactions.flatMap((t) =>
        t.feeForId && !snapIds.has(t.feeForId) ? [t.feeForId] : []
      )
    ),
  ];
  if (outsideParents.length > 0) {
    const found = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.id, outsideParents)
        )
      );
    if (found.length !== outsideParents.length) {
      return { error: "Transaksi induknya sudah tidak ada" };
    }
  }

  try {
    // satu INSERT, jadi hubungan induk dan biaya dicek di akhir perintah
    await db.insert(transactions).values(
      snap.transactions.map((t) => ({
        id: t.id,
        userId,
        walletId: t.walletId,
        categoryId:
          t.categoryId && categoryOk.has(t.categoryId) ? t.categoryId : null,
        type: t.type,
        amount: t.amount,
        date: t.date,
        note: t.note,
        transferToWalletId: t.transferToWalletId,
        feeForId: t.feeForId,
        createdAt: new Date(t.createdAt),
      }))
    );
  } catch {
    return { error: "Tidak bisa dipulihkan, mungkin sudah dipulihkan" };
  }

  // sambungan ke Talangan (kalau Talangannya sudah dihapus, dilewati)
  if (snap.payments.length > 0) {
    const members = await db
      .select({ id: splitMembers.id })
      .from(splitMembers)
      .where(
        and(
          eq(splitMembers.userId, userId),
          inArray(
            splitMembers.id,
            snap.payments.map((p) => p.memberId)
          )
        )
      );
    const memberOk = new Set(members.map((m) => m.id));
    const toRestore = snap.payments.filter((p) => memberOk.has(p.memberId));
    if (toRestore.length > 0) {
      await db
        .insert(splitPayments)
        .values(toRestore.map((p) => ({ ...p, userId })))
        .onConflictDoNothing();
    }
  }
  for (const link of snap.splitLinks) {
    await db
      .update(splits)
      .set({ transactionId: link.transactionId })
      .where(and(eq(splits.id, link.splitId), eq(splits.userId, userId)));
  }

  revalidateAll();
  revalidatePath("/splits");
  return { success: true };
}
