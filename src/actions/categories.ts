"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { categorySchema, type CategoryInput } from "@/lib/zod-schemas";

const PATHS = ["/categories", "/dashboard", "/transactions", "/budgets", "/reports"];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

export async function createCategory(input: CategoryInput) {
  const userId = await requireUserId();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db.insert(categories).values({ ...parsed.data, userId });
  revalidateAll();
  return { success: true };
}

export async function updateCategory(id: string, input: CategoryInput) {
  const userId = await requireUserId();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db
    .update(categories)
    .set(parsed.data)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  revalidateAll();
  return { success: true };
}

export async function deleteCategory(id: string) {
  const userId = await requireUserId();
  // transaksi dengan kategori ini tidak dihapus, hanya kategorinya
  // menjadi kosong (on delete set null)
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  revalidateAll();
  return { success: true };
}
