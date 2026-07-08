"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { budgetSchema, type BudgetInput } from "@/lib/zod-schemas";

const PATHS = ["/budgets", "/dashboard", "/reports"];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

// Insert atau update budget kategori+bulan (upsert)
export async function upsertBudget(input: BudgetInput) {
  const userId = await requireUserId();
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { categoryId, month, amount } = parsed.data;
  const existing = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.userId, userId),
      eq(budgets.categoryId, categoryId),
      eq(budgets.month, month)
    ),
  });

  if (existing) {
    await db
      .update(budgets)
      .set({ amount: String(amount) })
      .where(eq(budgets.id, existing.id));
  } else {
    await db.insert(budgets).values({
      userId,
      categoryId,
      month,
      amount: String(amount),
    });
  }
  revalidateAll();
  return { success: true };
}

export async function deleteBudget(id: string) {
  const userId = await requireUserId();
  await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  revalidateAll();
  return { success: true };
}
