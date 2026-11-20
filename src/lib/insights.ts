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
  | "projection"
  | "payday"
  | "receipt";

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
  // satuan waktunya: "bulan" (bulan kalender) atau "periode" (periode gajian)
  noun?: "bulan" | "periode";
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
  // pengeluaran di hari-hari pertama periode (setelah gajian). Kebiasaan
  // menghabiskan uang di awal sering membuat uang habis sebelum periode usai.
  early?: {
    spent: number;
    days: number;
    // true kalau awal periode = hari gajian (tanggal gajian diatur)
    afterPayday: boolean;
  } | null;
  // pengeluaran tunggal terbesar di periode ini; dateLabel sudah diformat
  biggest?: {
    amount: number;
    categoryName: string;
    dateLabel: string;
    note: string | null;
  } | null;
  // null = jatah jajan belum diatur
  snack: {
    limit: number;
    spentMonth: number;
    count: number;
    // Diisi kalau batas jajan dihitung per periode gajian: proyeksi memakai
    // periode ini, bukan bulan kalender yang sedang dilihat. Kosong berarti
    // batasnya per bulan kalender.
    period?: {
      spent: number;
      daysElapsed: number;
      length: number;
      label: string;
    };
  } | null;
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
  const n = input.noun ?? "bulan";
  const insights: Insight[] = [];

  // 1. Proyeksi jajan terhadap batas (hanya bulan berjalan, setelah 5 hari
  //    supaya rata-ratanya tidak terlalu goyah)
  const snackBasis = input.snack
    ? (input.snack.period ??
      (isCurrentMonth
        ? {
            spent: input.snack.spentMonth,
            daysElapsed,
            length: daysInMonth,
            label: null,
          }
        : null))
    : null;
  if (
    input.snack &&
    snackBasis &&
    snackBasis.daysElapsed >= 5 &&
    snackBasis.spent > 0
  ) {
    const projected = Math.round(
      (snackBasis.spent / snackBasis.daysElapsed) * snackBasis.length
    );
    const endWord = snackBasis.label
      ? `akhir periode (${snackBasis.label})`
      : `akhir ${n}`;
    if (projected > input.snack.limit) {
      insights.push({
        id: "snack-projection",
        tone: "warn",
        icon: "projection",
        title: "Jajan diproyeksi melewati batas",
        detail: `Dengan pola sejauh ini, jajan ${endWord} sekitar ${money(projected)}, sedangkan batasmu ${money(input.snack.limit)}. Selisihnya ${money(projected - input.snack.limit)}.`,
      });
    } else {
      insights.push({
        id: "snack-projection",
        tone: "good",
        icon: "projection",
        title: "Jajan masih di jalur aman",
        detail: `Proyeksi ${endWord} sekitar ${money(projected)} dari batas ${money(input.snack.limit)}.`,
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
          ? `Pengeluaran ${n} ini melaju lebih tinggi`
          : ratio < 0.9
            ? `Pengeluaran ${n} ini lebih hemat`
            : `Pengeluaran ${n} ini sebanding ${n} lalu`,
      detail: `Kalau lajunya sama sampai akhir ${n}, totalnya sekitar ${money(projected)}. ${n[0].toUpperCase()}${n.slice(1)} lalu ${money(input.prevTotalExpense)}.`,
    });
  }

  // 2b. Seberapa besar bagian pengeluaran yang habis di hari-hari pertama.
  //     Periode berjalan baru dinilai setelah dua minggu supaya angkanya tidak
  //     sekadar 100% di hari ketujuh.
  if (
    input.early &&
    input.totalExpense >= 100_000 &&
    (!isCurrentMonth || daysElapsed >= 14)
  ) {
    const { spent, days, afterPayday } = input.early;
    const share = spent / input.totalExpense;
    const pct = Math.round(share * 100);
    const when = afterPayday ? "setelah gajian" : `${n} ini`;
    if (share >= 0.4) {
      insights.push({
        id: "early-spend",
        tone: "warn",
        icon: "payday",
        title: `${pct}% pengeluaran habis di ${days} hari pertama`,
        detail: `${money(spent)} dari ${money(input.totalExpense)} keluar dalam ${days} hari pertama ${when}, padahal itu cuma ${days} dari ${daysInMonth} hari. Tagihan tetap ikut terhitung, tapi belanja yang bisa ditunda lebih aman ditahan dulu di minggu pertama.`,
      });
    } else if (share <= 0.15) {
      insights.push({
        id: "early-spend",
        tone: "good",
        icon: "payday",
        title: `Awal ${n} terkendali`,
        detail: `Hanya ${pct}% pengeluaran (${money(spent)}) keluar dalam ${days} hari pertama ${when}, jadi uangmu tidak habis di awal.`,
      });
    }
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
        biggestUp.prev === 0
          ? `${biggestUp.name} baru muncul ${n} ini`
          : biggestUp.delta / biggestUp.prev >= 5
            ? `${biggestUp.name} naik sekitar ${Math.round(biggestUp.total / biggestUp.prev)} kali lipat dari ${n} lalu`
            : `${biggestUp.name} naik ${Math.round((biggestUp.delta / biggestUp.prev) * 100)}% dari ${n} lalu`,
      detail:
        biggestUp.prev > 0
          ? `Dari ${money(biggestUp.prev)} menjadi ${money(biggestUp.total)}, bertambah ${money(biggestUp.delta)}. Ini yang paling menambah pengeluaranmu.`
          : `${n[0].toUpperCase()}${n.slice(1)} lalu belum ada pengeluaran di kategori ini. ${n[0].toUpperCase()}${n.slice(1)} ini sudah ${money(biggestUp.total)}.`,
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
      detail: `Rata-rata ${money(avg)} sekali jajan. Kalau berkurang satu kali per minggu, sekitar ${money(avg * 4)} per ${n} bisa tersisa.`,
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

  // 6b. Satu pengeluaran yang sendirian menyumbang porsi besar
  if (
    input.biggest &&
    input.totalExpense > 0 &&
    input.biggest.amount >= 100_000 &&
    input.biggest.amount / input.totalExpense >= 0.15
  ) {
    const b = input.biggest;
    const pct = Math.round((b.amount / input.totalExpense) * 100);
    insights.push({
      id: "biggest-expense",
      tone: "info",
      icon: "receipt",
      title: `Satu pengeluaran ${money(b.amount)} di ${b.categoryName}`,
      detail: `Tercatat ${b.dateLabel}${b.note ? ` (${b.note})` : ""}, ${pct}% dari seluruh pengeluaran di ${monthLabel}. Kalau tidak direncanakan, ini yang paling layak dikurangi lain kali.`,
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
      title: `${biggestDown.name} turun ${Math.round((Math.abs(biggestDown.delta) / biggestDown.prev) * 100)}% dari ${n} lalu`,
      detail: `Dari ${money(biggestDown.prev)} menjadi ${money(biggestDown.total)}, berkurang ${money(Math.abs(biggestDown.delta))}.`,
    });
  }

  return insights.slice(0, 8);
}
