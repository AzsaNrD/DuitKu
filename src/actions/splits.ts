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
import { requireUserId } from "@/lib/require-user";
import { equalShares, summarizeSplit } from "@/lib/split";
import {
  splitMemberSchema,
  splitPaymentSchema,
  splitSchema,
  splitUpdateSchema,
  type SplitInput,
  type SplitMemberInputValues,
  type SplitPaymentInput,
  type SplitUpdateInput,
} from "@/lib/zod-schemas";

const PATHS = [
  "/splits",
  "/transactions",
  "/dashboard",
  "/wallets",
  "/reports",
  "/allocation",
  "/goals",
];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

const REPAYMENT_CATEGORY = {
  name: "Pengembalian Talangan",
  icon: "hand-coins",
  color: "#22c55e",
};

const firstError = (issues: { message: string }[]) =>
  issues[0]?.message ?? "Data tidak valid";

// Kategori pemasukan untuk uang yang dikembalikan teman, dibuat saat pertama
// dibutuhkan supaya akun lama tidak perlu migrasi
async function ensureRepaymentCategory(userId: string): Promise<string> {
  const existing = await db.query.categories.findFirst({
    where: and(
      eq(categories.userId, userId),
      eq(categories.name, REPAYMENT_CATEGORY.name),
      eq(categories.type, "income")
    ),
  });
  if (existing) return existing.id;
  const [created] = await db
    .insert(categories)
    .values({
      userId,
      name: REPAYMENT_CATEGORY.name,
      type: "income",
      icon: REPAYMENT_CATEGORY.icon,
      color: REPAYMENT_CATEGORY.color,
      isDefault: false,
    })
    .returning({ id: categories.id });
  return created.id;
}

// satu talangan beserta orang dan total pembayarannya, atau null kalau bukan
// milik pengguna
async function loadSplit(userId: string, splitId: string) {
  const split = await db.query.splits.findFirst({
    where: and(eq(splits.id, splitId), eq(splits.userId, userId)),
  });
  if (!split) return null;
  const members = await db
    .select()
    .from(splitMembers)
    .where(eq(splitMembers.splitId, splitId))
    .orderBy(splitMembers.sortOrder, splitMembers.createdAt);
  const payments =
    members.length === 0
      ? []
      : await db
          .select()
          .from(splitPayments)
          .where(
            inArray(
              splitPayments.memberId,
              members.map((m) => m.id)
            )
          );
  const paidBy = new Map<string, number>();
  for (const p of payments) {
    paidBy.set(p.memberId, (paidBy.get(p.memberId) ?? 0) + Number(p.amount));
  }
  return {
    split,
    members: members.map((m) => ({
      row: m,
      id: m.id,
      name: m.name,
      isSelf: m.isSelf,
      amount: m.amount === null ? null : Number(m.amount),
      paid: paidBy.get(m.id) ?? 0,
    })),
  };
}

export async function createSplit(input: SplitInput) {
  const userId = await requireUserId();
  const parsed = splitSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  if (d.recordExpense) {
    const [wallet, category] = await Promise.all([
      db.query.wallets.findFirst({
        where: and(eq(wallets.id, d.walletId!), eq(wallets.userId, userId)),
      }),
      db.query.categories.findFirst({
        where: and(
          eq(categories.id, d.categoryId!),
          eq(categories.userId, userId),
          eq(categories.type, "expense")
        ),
      }),
    ]);
    if (!wallet) return { error: "Dompet tidak ditemukan" };
    if (!category) return { error: "Kategori tidak ditemukan" };
  }

  const splitId = crypto.randomUUID();
  const transactionId = d.recordExpense ? crypto.randomUUID() : null;

  if (transactionId) {
    await db.insert(transactions).values({
      id: transactionId,
      userId,
      walletId: d.walletId!,
      categoryId: d.categoryId!,
      type: "expense",
      amount: String(d.total),
      date: d.date,
      note: d.title,
      transferToWalletId: null,
    });
  }

  try {
    await db.insert(splits).values({
      id: splitId,
      userId,
      title: d.title,
      total: String(d.total),
      date: d.date,
      note: d.note || null,
      walletId: d.recordExpense ? d.walletId! : null,
      transactionId,
    });

    const rows: (typeof splitMembers.$inferInsert)[] = [];
    if (d.includeSelf) {
      rows.push({
        splitId,
        userId,
        name: "Saya",
        isSelf: true,
        amount: d.selfAmount ? String(d.selfAmount) : null,
        sortOrder: 0,
      });
    }
    d.members.forEach((m, i) =>
      rows.push({
        splitId,
        userId,
        name: m.name,
        isSelf: false,
        amount: m.amount ? String(m.amount) : null,
        sortOrder: i + 1,
      })
    );
    await db.insert(splitMembers).values(rows);
  } catch (e) {
    // jangan tinggalkan pengeluaran tanpa talangannya
    await db.delete(splits).where(eq(splits.id, splitId));
    if (transactionId) {
      await db.delete(transactions).where(eq(transactions.id, transactionId));
    }
    throw e;
  }

  revalidateAll();
  return { success: true };
}

export async function updateSplit(id: string, input: SplitUpdateInput) {
  const userId = await requireUserId();
  const parsed = splitUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const loaded = await loadSplit(userId, id);
  if (!loaded) return { error: "Talangan tidak ditemukan" };
  const summary = summarizeSplit(d.total, loaded.members);
  if (summary.over) {
    return { error: "Total lebih kecil dari jumlah yang sudah ditentukan" };
  }

  await db
    .update(splits)
    .set({
      title: d.title,
      total: String(d.total),
      date: d.date,
      note: d.note || null,
    })
    .where(and(eq(splits.id, id), eq(splits.userId, userId)));

  // pengeluaran aslinya ikut disamakan
  if (loaded.split.transactionId) {
    await db
      .update(transactions)
      .set({ amount: String(d.total), date: d.date, note: d.title })
      .where(
        and(
          eq(transactions.id, loaded.split.transactionId),
          eq(transactions.userId, userId)
        )
      );
  }

  revalidateAll();
  return { success: true };
}

// Hapus catatan talangan beserta orang dan pembayarannya. Dengan
// deleteTransactions, pengeluaran aslinya dan pemasukan dari pembayaran yang
// masuk ke dompet ikut dihapus, jadi saldo dompet kembali seperti sebelum
// talangan dicatat. Tanpa itu, transaksinya tetap ada di Transaksi.
export async function deleteSplit(id: string, deleteTransactions = false) {
  const userId = await requireUserId();
  const split = await db.query.splits.findFirst({
    where: and(eq(splits.id, id), eq(splits.userId, userId)),
  });
  if (!split) return { error: "Talangan tidak ditemukan" };

  // kumpulkan dulu: setelah talangannya dihapus, penunjuknya ikut hilang
  const transactionIds: string[] = [];
  if (deleteTransactions) {
    if (split.transactionId) transactionIds.push(split.transactionId);
    const repayments = await db
      .select({ transactionId: splitPayments.transactionId })
      .from(splitPayments)
      .innerJoin(splitMembers, eq(splitPayments.memberId, splitMembers.id))
      .where(
        and(eq(splitMembers.splitId, id), eq(splitPayments.userId, userId))
      );
    for (const r of repayments) {
      if (r.transactionId) transactionIds.push(r.transactionId);
    }
  }

  await db
    .delete(splits)
    .where(and(eq(splits.id, id), eq(splits.userId, userId)));
  if (transactionIds.length > 0) {
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.id, transactionIds)
        )
      );
  }

  revalidateAll();
  return { success: true };
}

// Tambah orang baru (memberId kosong) atau ubah nama/nominal orang yang ada
export async function saveSplitMember(
  splitId: string,
  memberId: string | null,
  input: SplitMemberInputValues
) {
  const userId = await requireUserId();
  const parsed = splitMemberSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;
  const amount = d.amount ? d.amount : null;

  const loaded = await loadSplit(userId, splitId);
  if (!loaded) return { error: "Talangan tidak ditemukan" };

  const current = memberId
    ? loaded.members.find((m) => m.id === memberId)
    : undefined;
  if (memberId && !current) return { error: "Orang tidak ditemukan" };

  if (current) {
    if (amount === null && current.paid > 0) {
      return { error: "Orang ini sudah membayar, nominalnya tidak bisa dikosongkan" };
    }
    if (amount !== null && amount < current.paid) {
      return { error: "Nominal tidak boleh lebih kecil dari yang sudah dibayar" };
    }
  }

  const others = loaded.members.filter((m) => m.id !== memberId);
  const next = [
    ...others,
    {
      id: memberId ?? "new",
      name: d.name,
      isSelf: current?.isSelf ?? false,
      amount,
      paid: current?.paid ?? 0,
    },
  ];
  if (summarizeSplit(Number(loaded.split.total), next).over) {
    return { error: "Jumlah yang ditentukan melebihi total" };
  }

  if (current) {
    await db
      .update(splitMembers)
      .set({
        // nama bagianmu sendiri tetap "Saya"
        name: current.isSelf ? current.name : d.name,
        amount: amount === null ? null : String(amount),
      })
      .where(eq(splitMembers.id, current.id));
  } else {
    await db.insert(splitMembers).values({
      splitId,
      userId,
      name: d.name,
      isSelf: false,
      amount: amount === null ? null : String(amount),
      sortOrder:
        loaded.members.reduce((max, m) => Math.max(max, m.row.sortOrder), 0) + 1,
    });
  }

  revalidateAll();
  return { success: true };
}

export async function deleteSplitMember(memberId: string) {
  const userId = await requireUserId();
  const member = await db.query.splitMembers.findFirst({
    where: and(eq(splitMembers.id, memberId), eq(splitMembers.userId, userId)),
  });
  if (!member) return { error: "Orang tidak ditemukan" };

  const paid = await db
    .select({ id: splitPayments.id })
    .from(splitPayments)
    .where(eq(splitPayments.memberId, memberId))
    .limit(1);
  if (paid.length > 0) {
    return {
      error: "Orang ini sudah punya pembayaran. Hapus pembayarannya dulu.",
    };
  }

  await db.delete(splitMembers).where(eq(splitMembers.id, memberId));
  revalidateAll();
  return { success: true };
}

// Bagi rata sisa yang belum dibagi ke semua orang yang nominalnya belum
// ditentukan (termasuk bagianmu kalau kamu ikut dan belum menentukannya)
export async function splitRemainingEqually(splitId: string) {
  const userId = await requireUserId();
  const loaded = await loadSplit(userId, splitId);
  if (!loaded) return { error: "Talangan tidak ditemukan" };

  const summary = summarizeSplit(Number(loaded.split.total), loaded.members);
  const targets = loaded.members.filter((m) => m.amount === null);
  if (targets.length === 0) {
    return { error: "Semua orang sudah punya nominal" };
  }
  if (summary.remaining <= 0) {
    return { error: "Tidak ada sisa yang bisa dibagi" };
  }

  const shares = equalShares(summary.remaining, targets.length);
  await Promise.all(
    targets.map((m, i) =>
      db
        .update(splitMembers)
        .set({ amount: String(shares[i]) })
        .where(eq(splitMembers.id, m.id))
    )
  );

  revalidateAll();
  return { success: true };
}

// Catat uang yang dikembalikan satu orang. Kalau dompet dipilih, uangnya juga
// tercatat sebagai pemasukan di dompet itu supaya saldonya benar.
export async function addSplitPayment(input: SplitPaymentInput) {
  const userId = await requireUserId();
  const parsed = splitPaymentSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const member = await db.query.splitMembers.findFirst({
    where: and(eq(splitMembers.id, d.memberId), eq(splitMembers.userId, userId)),
  });
  if (!member || member.isSelf) return { error: "Orang tidak ditemukan" };
  if (member.amount === null) {
    return { error: "Tentukan nominal orang ini dulu" };
  }

  const loaded = await loadSplit(userId, member.splitId);
  if (!loaded) return { error: "Talangan tidak ditemukan" };
  const paid = loaded.members.find((m) => m.id === member.id)?.paid ?? 0;
  const outstanding = Number(member.amount) - paid;
  if (outstanding <= 0) return { error: "Orang ini sudah lunas" };
  if (d.amount > outstanding) {
    return { error: "Jumlah melebihi yang masih harus dibayar" };
  }

  let transactionId: string | null = null;
  if (d.walletId) {
    const wallet = await db.query.wallets.findFirst({
      where: and(eq(wallets.id, d.walletId), eq(wallets.userId, userId)),
    });
    if (!wallet) return { error: "Dompet tidak ditemukan" };
    const categoryId = await ensureRepaymentCategory(userId);
    transactionId = crypto.randomUUID();
    await db.insert(transactions).values({
      id: transactionId,
      userId,
      walletId: d.walletId,
      categoryId,
      type: "income",
      amount: String(d.amount),
      date: d.date,
      note: `Dari ${member.name}: ${loaded.split.title}`,
      transferToWalletId: null,
    });
  }

  await db.insert(splitPayments).values({
    memberId: member.id,
    userId,
    amount: String(d.amount),
    date: d.date,
    transactionId,
  });

  revalidateAll();
  return { success: true };
}

export async function deleteSplitPayment(paymentId: string) {
  const userId = await requireUserId();
  const payment = await db.query.splitPayments.findFirst({
    where: and(
      eq(splitPayments.id, paymentId),
      eq(splitPayments.userId, userId)
    ),
  });
  if (!payment) return { error: "Pembayaran tidak ditemukan" };

  if (payment.transactionId) {
    // menghapus pemasukannya ikut menghapus catatan pembayaran (cascade)
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, payment.transactionId),
          eq(transactions.userId, userId)
        )
      );
  }
  await db.delete(splitPayments).where(eq(splitPayments.id, paymentId));

  revalidateAll();
  return { success: true };
}
