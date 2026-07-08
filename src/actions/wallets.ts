"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { wallets } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { walletSchema, type WalletInput } from "@/lib/zod-schemas";

const PATHS = ["/wallets", "/dashboard", "/transactions", "/reports"];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

export async function createWallet(input: WalletInput) {
  const userId = await requireUserId();
  const parsed = walletSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db.insert(wallets).values({
    userId,
    name: parsed.data.name,
    type: parsed.data.type,
    initialBalance: String(parsed.data.initialBalance),
    color: parsed.data.color,
  });
  revalidateAll();
  return { success: true };
}

export async function updateWallet(id: string, input: WalletInput) {
  const userId = await requireUserId();
  const parsed = walletSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await db
    .update(wallets)
    .set({
      name: parsed.data.name,
      type: parsed.data.type,
      initialBalance: String(parsed.data.initialBalance),
      color: parsed.data.color,
    })
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)));
  revalidateAll();
  return { success: true };
}

export async function deleteWallet(id: string) {
  const userId = await requireUserId();
  // transaksi pada dompet ini ikut terhapus (cascade)
  await db
    .delete(wallets)
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)));
  revalidateAll();
  return { success: true };
}
