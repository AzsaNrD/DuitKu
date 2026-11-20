// Laju menabung untuk sebuah impian. Tanpa import supaya mudah diuji;
// semua tanggal berupa string "YYYY-MM-DD".
//
// Dua angka yang dihitung:
//  1. kebutuhan per gajian supaya tercapai sebelum tanggal target
//  2. perkiraan kapan tercapai kalau lajunya sama dengan perubahan saldo
//     dompet pada jendela waktu terakhir

export type GoalPace = {
  // sisa yang masih harus terkumpul
  remaining: number;
  // hanya kalau ada tanggal target
  targetDate: string | null;
  // jumlah tanggal gajian dari hari ini sampai tanggal target (termasuk
  // hari ini kalau pas gajian); 0 berarti target jatuh sebelum gajian berikut
  paydaysLeft: number | null;
  needPerPayday: number | null;
  targetPassed: boolean;
  // laju rata-rata per 30 hari dari perubahan saldo dompet; null kalau
  // impian dicatat manual (tidak ada data untuk dihitung)
  perMonth: number | null;
  windowDays: number;
  // perkiraan tanggal tercapai; null kalau lajunya nol/negatif atau terlalu jauh
  projectedDate: string | null;
  // null kalau tidak ada tanggal target atau tidak ada perkiraan
  onTrack: boolean | null;
};

const MAX_PROJECTION_DAYS = 365 * 5;

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDaysTo(date: string, delta: number): string {
  return new Date(toUtc(date) + delta * 86_400_000).toISOString().slice(0, 10);
}

// Berapa kali tanggal `payday` muncul dari `from` sampai `to` (keduanya
// inklusif). Gajian dibatasi 1 sampai 28, jadi tiap bulan pasti punya tanggal itu.
export function countPaydays(from: string, to: string, payday: number): number {
  if (to < from) return 0;
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let count = 0;
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    const day = `${y}-${String(m).padStart(2, "0")}-${String(payday).padStart(2, "0")}`;
    if (day >= from && day <= to) count++;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return count;
}

export function computeGoalPace(input: {
  target: number;
  saved: number;
  targetDate: string | null;
  today: string;
  payday: number;
  // perubahan bersih saldo dompet dalam `windowDays` hari terakhir;
  // null kalau impian tidak terhubung ke dompet
  windowChange: number | null;
  windowDays: number;
}): GoalPace {
  const { target, saved, targetDate, today, payday, windowChange, windowDays } =
    input;
  const remaining = Math.max(0, target - saved);

  const targetPassed = !!targetDate && targetDate < today;
  const paydaysLeft =
    targetDate && !targetPassed ? countPaydays(today, targetDate, payday) : null;
  const needPerPayday =
    targetDate && !targetPassed && remaining > 0
      ? Math.ceil(remaining / Math.max(1, paydaysLeft ?? 1))
      : null;

  const perDay =
    windowChange !== null && windowDays > 0 ? windowChange / windowDays : null;
  const perMonth = perDay === null ? null : Math.round(perDay * 30);

  let projectedDate: string | null = null;
  if (remaining > 0 && perDay !== null && perDay > 0) {
    const days = Math.ceil(remaining / perDay);
    if (days <= MAX_PROJECTION_DAYS) projectedDate = addDaysTo(today, days);
  }

  let onTrack: boolean | null = null;
  if (targetDate && !targetPassed && remaining > 0 && perDay !== null) {
    onTrack = projectedDate !== null && projectedDate <= targetDate;
  }

  return {
    remaining,
    targetDate,
    paydaysLeft,
    needPerPayday,
    targetPassed,
    perMonth,
    windowDays,
    projectedDate,
    onTrack,
  };
}
