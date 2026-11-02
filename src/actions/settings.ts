"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { isValidPayday, MAX_PAYDAY, MIN_PAYDAY } from "@/lib/period";

const PATHS = ["/allocation", "/dashboard", "/reports"];

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

  PATHS.forEach((p) => revalidatePath(p));
  return { success: true };
}
