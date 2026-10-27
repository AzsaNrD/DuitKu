// Insight kebiasaan belanja, dibangun dari angka yang sudah dihitung.
// Tanpa import supaya mudah diuji; pemformat rupiah dikirim dari luar.
// Aturannya sengaja sederhana dan bisa dijelaskan: setiap kalimat di bawah
// hanya memakai angka dari data pengguna, tidak ada klaim yang diada-adakan.

export type InsightTone = "good" | "warn" | "info";
export type InsightIcon =
  | "category"
  | "trend-up"
  | "trend-down"
  | "calendar"
  | "repeat"
  | "projection";

export type Insight = {
  id: string;
  tone: InsightTone;
  icon: InsightIcon;
  title: string;
  detail: string;
};

type CategoryTotal = { id: string | null; name: string; total: number };

export type InsightInput = {
  money: (n: number) => string;
  monthLabel: string;
  isCurrentMonth: boolean;
  daysElapsed: number;
  daysInMonth: number;
  totalExpense: number;
  prevTotalExpense: number;
  byCategory: CategoryTotal[];
  prevByCategory: CategoryTotal[];
  // pengeluaran per hari dalam seminggu selama 13 minggu terakhir
  weekday: {
    scopeLabel: string;
    // frasa jendela waktu, mis. "13 minggu terakhir" atau
    // "13 minggu sampai akhir Agustus 2026" untuk bulan yang sudah lewat
    windowLabel?: string;
    rows: { dow: number; total: number; occurrences: number }[];
  } | null;
  // null = jatah jajan belum diatur
  snack: { limit: number; spentMonth: number; count: number } | null;
};

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// perubahan kecil tidak layak disebut insight
const MIN_CHANGE = 50_000;
const MIN_CHANGE_RATIO = 0.2;

function keyOf(c: CategoryTotal) {
  return c.id ?? `name:${c.name}`;
}

export function buildInsights(input: InsightInput): Insight[] {
  const { money, monthLabel, isCurrentMonth, daysElapsed, daysInMonth } = input;
  const insights: Insight[] = [];

  // 1. Proyeksi jajan terhadap batas (hanya bulan berjalan, setelah 5 hari
  //    supaya rata-ratanya tidak terlalu goyah)
  if (
    input.snack &&
    isCurrentMonth &&
    daysElapsed >= 5 &&
    input.snack.spentMonth > 0
  ) {
    const projected = Math.round(
      (input.snack.spentMonth / daysElapsed) * daysInMonth
    );
    if (projected > input.snack.limit) {
      insights.push({
        id: "snack-projection",
        tone: "warn",
        icon: "projection",
        title: "Jajan diproyeksi melewati batas",
        detail: `Dengan pola sejauh ini, jajan akhir bulan sekitar ${money(projected)}, sedangkan batasmu ${money(input.snack.limit)}. Selisihnya ${money(projected - input.snack.limit)}.`,
      });
    } else {
      insights.push({
        id: "snack-projection",
        tone: "good",
        icon: "projection",
        title: "Jajan masih di jalur aman",
        detail: `Proyeksi akhir bulan sekitar ${money(projected)} dari batas ${money(input.snack.limit)}.`,
      });
    }
  }

  // 2. Laju total pengeluaran bulan berjalan dibanding bulan lalu
  if (
    isCurrentMonth &&
    daysElapsed >= 5 &&
    input.totalExpense > 0 &&
    input.prevTotalExpense > 0
  ) {
    const projected = Math.round(
      (input.totalExpense / daysElapsed) * daysInMonth
    );
    const ratio = projected / input.prevTotalExpense;
    insights.push({
      id: "month-pace",
      tone: ratio > 1.1 ? "warn" : ratio < 0.9 ? "good" : "info",
      icon: "projection",
      title:
        ratio > 1.1
          ? "Pengeluaran bulan ini melaju lebih tinggi"
          : ratio < 0.9
            ? "Pengeluaran bulan ini lebih hemat"
            : "Pengeluaran bulan ini sebanding bulan lalu",
      detail: `Kalau lajunya sama sampai akhir bulan, totalnya sekitar ${money(projected)}. Bulan lalu ${money(input.prevTotalExpense)}.`,
    });
  }

  // 3. Kategori dengan kenaikan terbesar dibanding bulan lalu; kategori
  //    dengan penurunan terbesar hanya dilaporkan untuk bulan yang sudah
  //    selesai, karena bulan berjalan belum utuh.
  const prevByKey = new Map(input.prevByCategory.map((c) => [keyOf(c), c.total]));
  const deltas = input.byCategory.map((c) => {
    const prev = prevByKey.get(keyOf(c)) ?? 0;
    return { name: c.name, total: c.total, prev, delta: c.total - prev };
  });
  if (!isCurrentMonth) {
    // kategori yang hilang sama sekali bulan ini juga ikut dihitung
    const currentKeys = new Set(input.byCategory.map(keyOf));
    for (const p of input.prevByCategory) {
      if (!currentKeys.has(keyOf(p))) {
        deltas.push({ name: p.name, total: 0, prev: p.total, delta: -p.total });
      }
    }
  }

  const worthy = (d: { prev: number; delta: number }) =>
    Math.abs(d.delta) >= Math.max(MIN_CHANGE, d.prev * MIN_CHANGE_RATIO);

  const biggestUp = deltas
    .filter((d) => d.delta > 0 && worthy(d))
    .sort((a, b) => b.delta - a.delta)[0];
  if (biggestUp) {
    insights.push({
      id: "category-up",
      tone: "warn",
      icon: "trend-up",
      title:
        biggestUp.prev > 0
          ? `${biggestUp.name} naik ${Math.round((biggestUp.delta / biggestUp.prev) * 100)}% dari bulan lalu`
          : `${biggestUp.name} baru muncul bulan ini`,
      detail:
        biggestUp.prev > 0
          ? `Dari ${money(biggestUp.prev)} menjadi ${money(biggestUp.total)}, bertambah ${money(biggestUp.delta)}. Ini yang paling menambah pengeluaranmu.`
          : `Bulan lalu belum ada pengeluaran di kategori ini. Bulan ini sudah ${money(biggestUp.total)}.`,
    });
  }

  // 4. Pola hari dalam seminggu
  if (input.weekday) {
    const { rows, scopeLabel } = input.weekday;
    const windowLabel = input.weekday.windowLabel ?? "13 minggu terakhir";
    const totalSum = rows.reduce((s, r) => s + r.total, 0);
    const occSum = rows.reduce((s, r) => s + r.occurrences, 0);
    if (totalSum >= 100_000 && occSum > 0) {
      const overall = totalSum / occSum;
      const perDay = rows
        .filter((r) => r.occurrences > 0)
        .map((r) => ({ dow: r.dow, avg: r.total / r.occurrences }));
      const top = perDay.sort((a, b) => b.avg - a.avg)[0];
      if (top && top.avg >= overall * 1.3 && top.avg - overall >= 5_000) {
        insights.push({
          id: "weekday",
          tone: "warn",
          icon: "calendar",
          title: `Hari ${HARI[top.dow]} paling boros`,
          detail: `Rata-rata ${scopeLabel} ${money(Math.round(top.avg))} tiap hari ${HARI[top.dow]} selama ${windowLabel}, sedangkan rata-rata semua hari ${money(Math.round(overall))}.`,
        });
      } else {
        insights.push({
          id: "weekday",
          tone: "info",
          icon: "calendar",
          title: `Pengeluaranmu cukup merata antar hari`,
          detail: `Selama ${windowLabel} tidak ada hari yang menonjol. Rata-rata ${scopeLabel} ${money(Math.round(overall))} per hari.`,
        });
      }
    }
  }

  // 5. Seberapa sering jajan dan nilai rata-ratanya
  if (input.snack && input.snack.count >= 3) {
    const avg = Math.round(input.snack.spentMonth / input.snack.count);
    insights.push({
      id: "snack-frequency",
      tone: "info",
      icon: "repeat",
      title: `${input.snack.count} kali jajan di ${monthLabel}`,
      detail: `Rata-rata ${money(avg)} sekali jajan. Kalau berkurang satu kali per minggu, sekitar ${money(avg * 4)} per bulan bisa tersisa.`,
    });
  }

  // 6. Kategori terbesar
  const top = [...input.byCategory].sort((a, b) => b.total - a.total)[0];
  if (top && top.total > 0 && input.totalExpense > 0) {
    insights.push({
      id: "top-category",
      tone: "info",
      icon: "category",
      title: `${top.name} jadi pengeluaran terbesar`,
      detail: `${money(top.total)}, atau ${Math.round((top.total / input.totalExpense) * 100)}% dari seluruh pengeluaran di ${monthLabel}.`,
    });
  }

  // 7. Penurunan terbesar (bulan selesai saja)
  const biggestDown = deltas
    .filter((d) => d.delta < 0 && worthy(d))
    .sort((a, b) => a.delta - b.delta)[0];
  if (!isCurrentMonth && biggestDown) {
    insights.push({
      id: "category-down",
      tone: "good",
      icon: "trend-down",
      title: `${biggestDown.name} turun ${Math.round((Math.abs(biggestDown.delta) / biggestDown.prev) * 100)}% dari bulan lalu`,
      detail: `Dari ${money(biggestDown.prev)} menjadi ${money(biggestDown.total)}, berkurang ${money(Math.abs(biggestDown.delta))}.`,
    });
  }

  return insights.slice(0, 6);
}
