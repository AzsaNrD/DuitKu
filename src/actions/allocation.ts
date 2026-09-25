"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  allocationBuckets,
  allocationCategoryLinks,
  allocationIncomeCategories,
  allocationIncomeOverrides,
  allocationWalletLinks,
  categories,
  wallets,
} from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import {
  ALLOCATION_PRESETS,
  SALARY_ICON,
  iconsForGroups,
} from "@/lib/allocation-presets";
import {
  allocationBucketsSchema,
  allocationOverrideSchema,
  type AllocationBucketsInput,
  type AllocationOverrideInput,
} from "@/lib/zod-schemas";

const PATHS = ["/allocation", "/dashboard"];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

// Ganti seluruh rencana dengan preset: pos lama dihapus (pemetaan kategori &
// dompetnya ikut terhapus lewat cascade), lalu kategori pengeluaran bawaan
// dipetakan otomatis berdasarkan ikonnya.
export async function applyAllocationPreset(presetId: string) {
  const userId = await requireUserId();
  const preset = ALLOCATION_PRESETS.find((p) => p.id === presetId);
  if (!preset) return { error: "Preset tidak dikenal" };

  await db
    .delete(allocationBuckets)
    .where(eq(allocationBuckets.userId, userId));

  const bucketRows = preset.buckets.map((b, i) => ({
    id: crypto.randomUUID(),
    userId,
    name: b.name,
    percent: b.percent,
    kind: b.kind,
    color: b.color,
    sortOrder: i,
  }));
  await db.insert(allocationBuckets).values(bucketRows);

  const userCategories = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
  });

  const links: { categoryId: string; bucketId: string; userId: string }[] = [];
  const taken = new Set<string>();
  preset.buckets.forEach((b, i) => {
    const icons = iconsForGroups(b.autoMap);
    for (const c of userCategories) {
      if (
        c.type === "expense" &&
        c.isDefault &&
        icons.includes(c.icon) &&
        !taken.has(c.id)
      ) {
        links.push({ categoryId: c.id, bucketId: bucketRows[i].id, userId });
        taken.add(c.id);
      }
    }
  });
  if (links.length > 0) {
    await db.insert(allocationCategoryLinks).values(links);
  }

  // pilihan kategori pemasukan tidak ikut diganti; kalau belum pernah
  // dipilih, pakai kategori Gaji bawaan sebagai titik awal
  const existingIncome = await db
    .select({ categoryId: allocationIncomeCategories.categoryId })
    .from(allocationIncomeCategories)
    .where(eq(allocationIncomeCategories.userId, userId));
  if (existingIncome.length === 0) {
    const salary = userCategories.filter(
      (c) => c.type === "income" && c.isDefault && c.icon === SALARY_ICON
    );
    if (salary.length > 0) {
      await db
        .insert(allocationIncomeCategories)
        .values(salary.map((c) => ({ categoryId: c.id, userId })));
    }
  }

  revalidateAll();
  return { success: true };
}

// Hapus seluruh rencana alokasi: pos (pemetaan kategori & dompet ikut lewat
// cascade), pilihan kategori pemasukan, dan nominal manual semua bulan.
// Transaksi, kategori, dan dompet tidak tersentuh.
export async function deleteAllocationPlan() {
  const userId = await requireUserId();

  await db
    .delete(allocationBuckets)
    .where(eq(allocationBuckets.userId, userId));
  await db
    .delete(allocationIncomeCategories)
    .where(eq(allocationIncomeCategories.userId, userId));
  await db
    .delete(allocationIncomeOverrides)
    .where(eq(allocationIncomeOverrides.userId, userId));

  revalidateAll();
  return { success: true };
}

export async function saveAllocationBuckets(input: AllocationBucketsInput) {
  const userId = await requireUserId();
  const parsed = allocationBucketsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await db.query.allocationBuckets.findMany({
    where: eq(allocationBuckets.userId, userId),
  });
  const existingById = new Map(existing.map((b) => [b.id, b]));
  const keepIds = new Set<string>();

  for (const [i, b] of parsed.data.buckets.entries()) {
    const values = {
      name: b.name,
      percent: b.percent,
      kind: b.kind,
      color: b.color,
      sortOrder: i,
    };
    const prev = b.id ? existingById.get(b.id) : undefined;
    if (prev) {
      await db
        .update(allocationBuckets)
        .set(values)
        .where(
          and(
            eq(allocationBuckets.id, prev.id),
            eq(allocationBuckets.userId, userId)
          )
        );
      // pos berganti tipe: pemetaan dari tipe lamanya tidak berlaku lagi
      if (prev.kind !== b.kind) {
        if (b.kind === "savings") {
          await db
            .delete(allocationCategoryLinks)
            .where(eq(allocationCategoryLinks.bucketId, prev.id));
        } else {
          await db
            .delete(allocationWalletLinks)
            .where(eq(allocationWalletLinks.bucketId, prev.id));
        }
      }
      keepIds.add(prev.id);
    } else {
      await db.insert(allocationBuckets).values({ ...values, userId });
    }
  }

  const removedIds = existing
    .filter((b) => !keepIds.has(b.id))
    .map((b) => b.id);
  if (removedIds.length > 0) {
    await db
      .delete(allocationBuckets)
      .where(
        and(
          eq(allocationBuckets.userId, userId),
          inArray(allocationBuckets.id, removedIds)
        )
      );
  }

  revalidateAll();
  return { success: true };
}

async function findUserBucket(userId: string, bucketId: string) {
  return db.query.allocationBuckets.findFirst({
    where: and(
      eq(allocationBuckets.id, bucketId),
      eq(allocationBuckets.userId, userId)
    ),
  });
}

// bucketId null = keluarkan kategori dari pos mana pun
export async function setAllocationCategoryBucket(
  categoryId: string,
  bucketId: string | null
) {
  const userId = await requireUserId();
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
  });
  if (!category || category.type !== "expense") {
    return { error: "Kategori tidak ditemukan" };
  }
  if (bucketId) {
    const bucket = await findUserBucket(userId, bucketId);
    if (!bucket || bucket.kind !== "expense") {
      return { error: "Pos tidak valid untuk kategori pengeluaran" };
    }
  }

  await db
    .delete(allocationCategoryLinks)
    .where(eq(allocationCategoryLinks.categoryId, categoryId));
  if (bucketId) {
    await db
      .insert(allocationCategoryLinks)
      .values({ categoryId, bucketId, userId });
  }

  revalidateAll();
  return { success: true };
}

// bucketId null = dompet ini bukan dompet tabungan
export async function setAllocationWalletBucket(
  walletId: string,
  bucketId: string | null
) {
  const userId = await requireUserId();
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.userId, userId)),
  });
  if (!wallet) return { error: "Dompet tidak ditemukan" };
  if (bucketId) {
    const bucket = await findUserBucket(userId, bucketId);
    if (!bucket || bucket.kind !== "savings") {
      return { error: "Pos tidak valid untuk dompet tabungan" };
    }
  }

  await db
    .delete(allocationWalletLinks)
    .where(eq(allocationWalletLinks.walletId, walletId));
  if (bucketId) {
    await db.insert(allocationWalletLinks).values({ walletId, bucketId, userId });
  }

  revalidateAll();
  return { success: true };
}

const categoryIdsSchema = z.array(z.string().min(1)).max(100);

export async function setAllocationIncomeCategories(categoryIds: string[]) {
  const userId = await requireUserId();
  const parsed = categoryIdsSchema.safeParse(categoryIds);
  if (!parsed.success) return { error: "Data tidak valid" };

  const incomeCategories = await db.query.categories.findMany({
    where: and(eq(categories.userId, userId), eq(categories.type, "income")),
  });
  const validIds = new Set(incomeCategories.map((c) => c.id));
  const selected = [...new Set(parsed.data)].filter((id) => validIds.has(id));

  await db
    .delete(allocationIncomeCategories)
    .where(eq(allocationIncomeCategories.userId, userId));
  if (selected.length > 0) {
    await db
      .insert(allocationIncomeCategories)
      .values(selected.map((categoryId) => ({ categoryId, userId })));
  }

  revalidateAll();
  return { success: true };
}

export async function setAllocationIncomeOverride(
  input: AllocationOverrideInput
) {
  const userId = await requireUserId();
  const parsed = allocationOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const amount = String(parsed.data.amount);
  await db
    .insert(allocationIncomeOverrides)
    .values({ userId, month: parsed.data.month, amount })
    .onConflictDoUpdate({
      target: [allocationIncomeOverrides.userId, allocationIncomeOverrides.month],
      set: { amount },
    });

  revalidateAll();
  return { success: true };
}

export async function clearAllocationIncomeOverride(month: string) {
  const userId = await requireUserId();
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Bulan tidak valid" };

  await db
    .delete(allocationIncomeOverrides)
    .where(
      and(
        eq(allocationIncomeOverrides.userId, userId),
        eq(allocationIncomeOverrides.month, month)
      )
    );

  revalidateAll();
  return { success: true };
}
