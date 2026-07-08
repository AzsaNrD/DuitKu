"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
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

function toValues(userId: string, data: GoalInput) {
  return {
    userId,
    name: data.name,
    targetAmount: String(data.targetAmount),
    color: data.color,
    targetDate: data.targetDate || null,
  };
}

export async function createGoal(input: GoalInput) {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db.insert(goals).values(toValues(userId, parsed.data));
  revalidateAll();
  return { success: true };
}

export async function updateGoal(id: string, input: GoalInput) {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db
    .update(goals)
    .set(toValues(userId, parsed.data))
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  revalidateAll();
  return { success: true };
}

// Tambah (direction=1) atau ambil (direction=-1) tabungan impian.
// Ini hanya catatan progres — saldo dompet tidak berubah.
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
