import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { recurringRules, transactions } from "@/db/schema";
import type { RecurringFrequency } from "@/db/schema";
import { todayString } from "@/lib/format";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Maju satu periode dari `current`. Untuk bulanan, tanggal patokan
// diambil dari startDate (mis. patokan 31: Jan 31 -> Feb 28 -> Mar 31).
export function nextOccurrence(
  current: string,
  frequency: RecurringFrequency,
  anchorDay: number
): string {
  const [y, m, d] = current.split("-").map(Number);

  if (frequency === "daily" || frequency === "weekly") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + (frequency === "daily" ? 1 : 7));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }

  // monthly: bulan berikutnya, tanggal di-clamp ke akhir bulan
  const nextMonthIndex = m; // m sudah 1-based, jadi index bulan berikutnya
  const year = y + Math.floor(nextMonthIndex / 12);
  const month = (nextMonthIndex % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(anchorDay, lastDay);
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Buat transaksi untuk semua jadwal berulang yang sudah jatuh tempo.
// Dipanggil saat user membuka halaman utama — idempoten karena nextRun
// selalu dimajukan setelah transaksi dibuat.
export async function processDueRecurring(userId: string) {
  const today = todayString();
  const due = await db.query.recurringRules.findMany({
    where: and(
      eq(recurringRules.userId, userId),
      eq(recurringRules.active, true),
      lte(recurringRules.nextRun, today)
    ),
  });

  for (const rule of due) {
    const anchorDay = Number(rule.startDate.split("-")[2]);
    let run = rule.nextRun;
    const rows: (typeof transactions.$inferInsert)[] = [];

    // batas 100 iterasi sebagai pengaman terhadap loop tak berujung
    for (let i = 0; run <= today && i < 100; i++) {
      rows.push({
        userId,
        walletId: rule.walletId,
        categoryId: rule.type === "transfer" ? null : rule.categoryId,
        type: rule.type,
        amount: rule.amount,
        date: run,
        note: rule.note,
        transferToWalletId:
          rule.type === "transfer" ? rule.transferToWalletId : null,
      });
      run = nextOccurrence(run, rule.frequency, anchorDay);
    }

    if (rows.length > 0) {
      await db.insert(transactions).values(rows);
      await db
        .update(recurringRules)
        .set({ nextRun: run })
        .where(eq(recurringRules.id, rule.id));
    }
  }

  return due.length;
}
