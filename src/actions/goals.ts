"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals, wallets } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import {
  goalSchema,
  goalSavingSchema,
  type GoalInput,
  type GoalSavingInput,
} from "@/lib/zod-schemas";

const PATHS = ["/goals", "/dashboard"];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

// null kalau walletId kosong (progres manual) atau dompetnya bukan milik user
async function resolveWalletId(
  userId: string,
  walletId: string | undefined
): Promise<{ walletId: string | null } | { error: string }> {
  if (!walletId) return { walletId: null };
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.userId, userId)),
  });
  return wallet ? { walletId: wallet.id } : { error: "Dompet tidak ditemukan" };
}

async function toValues(userId: string, data: GoalInput) {
  const wallet = await resolveWalletId(userId, data.walletId);
  if ("error" in wallet) return wallet;
  return {
    values: {
      userId,
      name: data.name,
      targetAmount: String(data.targetAmount),
      color: data.color,
      targetDate: data.targetDate || null,
      walletId: wallet.walletId,
    },
  };
}

export async function createGoal(input: GoalInput) {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const result = await toValues(userId, parsed.data);
  if ("error" in result) return { error: result.error };

  await db.insert(goals).values(result.values);
  revalidateAll();
  return { success: true };
}

export async function updateGoal(id: string, input: GoalInput) {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const result = await toValues(userId, parsed.data);
  if ("error" in result) return { error: result.error };

  await db
    .update(goals)
    .set(result.values)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  revalidateAll();
  return { success: true };
}

// Tambah (direction=1) atau ambil (direction=-1) tabungan impian manual.
// Hanya catatan progres, saldo dompet tidak berubah. Impian yang terhubung
// ke dompet tidak bisa diubah di sini karena progresnya ikut saldo dompet.
export async function adjustGoalSavings(
  id: string,
  input: GoalSavingInput,
  direction: 1 | -1
) {
  const userId = await requireUserId();
  const parsed = goalSavingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const goal = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, userId)),
  });
  if (!goal) return { error: "Impian tidak ditemukan" };
  if (goal.walletId) {
    return { error: "Progres impian ini mengikuti saldo dompet" };
  }

  const next = Number(goal.savedAmount) + direction * parsed.data.amount;
  if (next < 0) {
    return { error: "Jumlah melebihi tabungan yang terkumpul" };
  }

  await db
    .update(goals)
    .set({ savedAmount: String(next) })
    .where(eq(goals.id, goal.id));
  revalidateAll();
  return { success: true };
}

export async function deleteGoal(id: string) {
  const userId = await requireUserId();
  await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  revalidateAll();
  return { success: true };
}
