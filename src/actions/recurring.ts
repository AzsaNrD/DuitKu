"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringRules } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { recurringSchema, type RecurringInput } from "@/lib/zod-schemas";

const PATHS = ["/recurring", "/transactions", "/dashboard", "/wallets", "/budgets", "/reports"];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

function toValues(userId: string, data: RecurringInput) {
  return {
    userId,
    walletId: data.walletId,
    categoryId: data.type === "transfer" ? null : (data.categoryId ?? null),
    type: data.type,
    amount: String(data.amount),
    note: data.note || null,
    transferToWalletId:
      data.type === "transfer" ? (data.transferToWalletId ?? null) : null,
    frequency: data.frequency,
    startDate: data.startDate,
  };
}

export async function createRecurring(input: RecurringInput) {
  const userId = await requireUserId();
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db.insert(recurringRules).values({
    ...toValues(userId, parsed.data),
    nextRun: parsed.data.startDate,
  });
  revalidateAll();
  return { success: true };
}

export async function updateRecurring(id: string, input: RecurringInput) {
  const userId = await requireUserId();
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await db.query.recurringRules.findFirst({
    where: and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)),
  });
  if (!existing) return { error: "Jadwal tidak ditemukan" };

  await db
    .update(recurringRules)
    .set({
      ...toValues(userId, parsed.data),
      // jika tanggal mulai diganti ke masa depan, jadwalkan ulang;
      // jika tidak, pertahankan nextRun yang sudah berjalan
      nextRun:
        parsed.data.startDate !== existing.startDate
          ? parsed.data.startDate
          : existing.nextRun,
    })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
  revalidateAll();
  return { success: true };
}

export async function toggleRecurring(id: string, active: boolean) {
  const userId = await requireUserId();
  await db
    .update(recurringRules)
    .set({ active })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
  revalidateAll();
  return { success: true };
}

export async function deleteRecurring(id: string) {
  const userId = await requireUserId();
  // hanya aturannya yang dihapus; transaksi yang sudah dibuat tetap ada
  await db
    .delete(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
  revalidateAll();
  return { success: true };
}
