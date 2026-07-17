import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

// Sliding window sederhana berbasis DB: hitung percobaan dengan key
// yang sama dalam rentang waktu; kalau masih di bawah batas, catat
// percobaan baru. Tanpa Redis — cukup untuk menahan brute force.
export async function isRateLimited(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  // bersihkan jejak lama sesekali supaya tabel tidak menumpuk
  if (Math.random() < 0.1) {
    await db
      .delete(rateLimits)
      .where(lt(rateLimits.createdAt, new Date(Date.now() - 24 * 3600_000)));
  }

  const cutoff = new Date(Date.now() - windowSeconds * 1000);
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), gt(rateLimits.createdAt, cutoff)));

  if (Number(row.count) >= max) return true;

  await db.insert(rateLimits).values({ key });
  return false;
}

// IP klien di belakang proxy Vercel ada di header x-forwarded-for
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
