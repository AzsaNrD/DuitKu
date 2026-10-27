"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, snackCategories, snackPlans } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { snackPlanSchema, type SnackPlanInput } from "@/lib/zod-schemas";

const PATHS = ["/dashboard", "/reports"];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

export async function saveSnackPlan(input: SnackPlanInput) {
  const userId = await requireUserId();
  const parsed = snackPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  // hanya kategori pengeluaran milik user ini yang boleh dipilih
  const expenseCategories = await db.query.categories.findMany({
    where: and(eq(categories.userId, userId), eq(categories.type, "expense")),
  });
  const validIds = new Set(expenseCategories.map((c) => c.id));
  const selected = [...new Set(parsed.data.categoryIds)].filter((id) =>
    validIds.has(id)
  );
  if (selected.length === 0) {
    return { error: "Pilih minimal satu kategori pengeluaran" };
  }

  // kategori diganti dulu, batas ditulis terakhir: kalau langkah di tengah
  // gagal, hasilnya "belum diatur" (aman), bukan batas tanpa kategori
  await db.delete(snackCategories).where(eq(snackCategories.userId, userId));
  await db
    .insert(snackCategories)
    .values(selected.map((categoryId) => ({ categoryId, userId })));

  const monthlyLimit = String(parsed.data.monthlyLimit);
  await db
    .insert(snackPlans)
    .values({ userId, monthlyLimit })
    .onConflictDoUpdate({
      target: snackPlans.userId,
      set: { monthlyLimit, updatedAt: new Date() },
    });

  revalidateAll();
  return { success: true };
}

export async function clearSnackPlan() {
  const userId = await requireUserId();
  await db.delete(snackPlans).where(eq(snackPlans.userId, userId));
  await db.delete(snackCategories).where(eq(snackCategories.userId, userId));
  revalidateAll();
  return { success: true };
}
