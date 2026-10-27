// Hitungan jatah jajan. Modul ini sengaja tanpa import supaya mudah diuji
// langsung dan tidak bergantung pada database maupun komponen.

export const HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

// Jatah dibulatkan ke bawah per Rp 100: angka seperti "Rp 33.300" lebih
// mudah dipegang daripada "Rp 33.333", dan pembulatan ke bawah menjamin
// jumlah jatah semua hari tidak pernah melebihi sisa batas.
const STEP = 100;

function floorTo(n: number, step = STEP) {
  return Math.floor(n / step) * step;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

// 0 = Minggu, sama dengan extract(dow ...) di Postgres
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// berapa kali tiap hari dalam seminggu muncul di rentang [from, to]
export function countWeekdays(from: string, to: string): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (let d = from; d <= to; d = addDays(d, 1)) counts[weekdayOf(d)]++;
  return counts;
}

export type SnackStatus = "aman" | "hati-hati" | "lewat" | "habis";

export type DailyAllowance = {
  daysLeft: number;
  allowanceToday: number;
  spentToday: number;
  leftToday: number;
  monthRemaining: number;
  tomorrowAllowance: number | null;
  status: SnackStatus;
};

// Jatah hari ini dihitung dari sisa batas pada AWAL hari ini (belanja
// sebelum hari ini sudah terpotong, belanja hari ini belum), dibagi sisa
// hari termasuk hari ini. Dengan begitu jatah tidak mengecil sepanjang
// hari saat kamu jajan; yang berubah hanya sisa jatahnya.
export function computeDailyAllowance(input: {
  limit: number;
  spentMonth: number;
  spentToday: number;
  today: string;
}): DailyAllowance {
  const { limit, spentMonth, spentToday, today } = input;
  const dim = daysInMonth(today.slice(0, 7));
  const day = Number(today.slice(8, 10));
  const daysLeft = dim - day + 1;

  const spentBeforeToday = Math.max(0, spentMonth - spentToday);
  const budgetForRest = limit - spentBeforeToday;
  const allowanceToday =
    budgetForRest > 0 ? floorTo(budgetForRest / daysLeft) : 0;
  const monthRemaining = limit - spentMonth;
  const tomorrowAllowance =
    daysLeft > 1
      ? monthRemaining > 0
        ? floorTo(monthRemaining / (daysLeft - 1))
        : 0
      : null;

  let status: SnackStatus;
  if (budgetForRest <= 0) status = "habis";
  else if (allowanceToday === 0) status = spentToday === 0 ? "habis" : "lewat";
  else if (spentToday > allowanceToday) status = "lewat";
  else if (spentToday >= allowanceToday * 0.75) status = "hati-hati";
  else status = "aman";

  return {
    daysLeft,
    allowanceToday,
    spentToday,
    leftToday: allowanceToday - spentToday,
    monthRemaining,
    tomorrowAllowance,
    status,
  };
}

// Proyeksi akhir bulan: rata-rata harian sejauh ini dikali jumlah hari
export function projectMonthEnd(
  spentSoFar: number,
  daysElapsed: number,
  monthDays: number
): number {
  if (daysElapsed < 1) return spentSoFar;
  return Math.round((spentSoFar / daysElapsed) * monthDays);
}
