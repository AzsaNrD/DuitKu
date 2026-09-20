"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions, wallets } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { guestImportSchema, type GuestImportInput } from "@/lib/zod-schemas";

const PATHS = [
  "/dashboard",
  "/wallets",
  "/transactions",
  "/categories",
  "/budgets",
  "/reports",
];

// Pindahkan data yang sebelumnya tercatat di localStorage (mode tanpa akun)
// ke akun yang baru login/daftar. ID dari localStorage dipakai apa adanya
// (UUID acak, praktis mustahil bentrok) supaya relasi wallet/category yang
// direferensikan transaksi tetap utuh tanpa perlu tabel pemetaan ulang.
//
// Kategori BAWAAN (isDefault) sengaja TIDAK PERNAH dibuat ulang di sini —
// setiap akun sudah pasti punya set kategori bawaannya sendiri sejak dibuat
// (lihat seedDefaultCategories), jadi kalau dicocokkan lewat importGuestData
// tapi gagal ketemu (mis. usernya sudah mengganti nama "Makanan & Minuman"
// jadi "Makanan"), yang lebih aman adalah MEMBIARKAN transaksi terkait jadi
// tanpa kategori — bukan diam-diam membuat kategori bawaan baru yang dobel
// dengan yang sudah ada. Cocokkan lewat ikon (lebih jarang diubah user
// dibanding nama), bukan nama persis.
export async function importGuestData(input: GuestImportInput) {
  const userId = await requireUserId();
  const parsed = guestImportSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Data lokal tidak valid untuk dipindahkan" };
  }
  const data = parsed.data;

  const existingCategories = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
  });

  const categoryIdMap = new Map<string, string>();
  const categoriesToInsert: (typeof categories.$inferInsert)[] = [];
  for (const c of data.categories) {
    if (c.isDefault) {
      const match = existingCategories.find(
        (ec) => ec.isDefault && ec.type === c.type && ec.icon === c.icon
      );
      if (match) categoryIdMap.set(c.id, match.id);
      // tidak ketemu -> sengaja tidak di-insert; transaksi yang memakainya
      // nanti jatuh ke "tanpa kategori" lewat fallback (?? null) di bawah
      continue;
    }
    const match = existingCategories.find(
      (ec) => ec.name === c.name && ec.type === c.type
    );
    if (match) {
      categoryIdMap.set(c.id, match.id);
    } else {
      categoryIdMap.set(c.id, c.id);
      categoriesToInsert.push({
        id: c.id,
        userId,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        isDefault: c.isDefault,
      });
    }
  }

  if (categoriesToInsert.length > 0) {
    await db.insert(categories).values(categoriesToInsert);
  }

  if (data.wallets.length > 0) {
    await db.insert(wallets).values(
      data.wallets.map((w) => ({
        id: w.id,
        userId,
        name: w.name,
        type: w.type,
        initialBalance: w.initialBalance,
        color: w.color,
      }))
    );
  }

  if (data.transactions.length > 0) {
    await db.insert(transactions).values(
      data.transactions.map((t) => ({
        id: t.id,
        userId,
        walletId: t.walletId,
        categoryId: t.categoryId ? (categoryIdMap.get(t.categoryId) ?? null) : null,
        type: t.type,
        amount: t.amount,
        date: t.date,
        note: t.note,
        transferToWalletId: t.transferToWalletId,
      }))
    );
  }

  PATHS.forEach((p) => revalidatePath(p));
  return {
    success: true,
    walletsImported: data.wallets.length,
    transactionsImported: data.transactions.length,
  };
}
