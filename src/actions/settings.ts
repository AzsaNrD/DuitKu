"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paydayOverrides, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import {
  isValidPayday,
  isValidPeriodStart,
  MAX_PAYDAY,
  MIN_PAYDAY,
} from "@/lib/period";

const PATHS = [
  "/allocation",
  "/categories",
  "/dashboard",
  "/goals",
  "/reports",
];

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p));
}

export async function savePayday(day: number) {
  const userId = await requireUserId();
  if (!isValidPayday(day)) {
    return {
      error: `Tanggal gajian harus antara ${MIN_PAYDAY} dan ${MAX_PAYDAY}`,
    };
  }

  await db
    .insert(userSettings)
    .values({ userId, paydayDay: day })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { paydayDay: day, updatedAt: new Date() },
    });

  revalidateAll();
  return { success: true };
}

// Geser tanggal mulai satu periode, mis. gaji bulan "2026-11" baru cair
// tanggal 24. Tanggalnya harus ada di bulan yang sama dengan kuncinya.
export async function savePaydayOverride(month: string, startDate: string) {
  const userId = await requireUserId();
  if (!isValidPeriodStart(month, startDate)) {
    return { error: "Tanggal harus ada di bulan yang dipilih" };
  }

  await db
    .insert(paydayOverrides)
    .values({ userId, month, startDate })
    .onConflictDoUpdate({
      target: [paydayOverrides.userId, paydayOverrides.month],
      set: { startDate },
    });

  revalidateAll();
  return { success: true };
}

// Kembalikan satu periode ke tanggal gajian biasa
export async function clearPaydayOverride(month: string) {
  const userId = await requireUserId();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { error: "Bulan tidak valid" };
  }

  await db
    .delete(paydayOverrides)
    .where(
      and(eq(paydayOverrides.userId, userId), eq(paydayOverrides.month, month))
    );

  revalidateAll();
  return { success: true };
}
