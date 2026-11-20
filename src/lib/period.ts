// Periode keuangan yang mengikuti tanggal gajian. Tanpa import supaya mudah
// diuji langsung.
//
// Sebuah periode diberi kunci "YYYY-MM" = bulan tempat periode itu DIMULAI.
// Dengan gajian tanggal 21, kunci "2026-10" berarti 21 Okt 2026 sampai
// 20 Nov 2026. Tanggal gajian 1 berarti bulan kalender biasa, jadi semua
// pengguna yang tidak mengatur apa pun tetap bekerja seperti sebelumnya.
//
// Tanggal gajian dibatasi 1 sampai 28 supaya setiap bulan punya tanggal itu.
//
// Gaji tidak selalu cair di tanggal yang sama. Karena itu satu periode bisa
// punya tanggal mulai khusus (override), misalnya periode "2026-11" mulai
// 24 Nov karena gajinya terlambat. Tanggal khusus harus jatuh di bulan yang
// sama dengan kuncinya, jadi urutan periode selalu tetap menurut bulan.
// Periode berakhir sehari sebelum periode berikutnya dimulai.

export const MIN_PAYDAY = 1;
export const MAX_PAYDAY = 28;

// day = tanggal gajian biasa; overrides = kunci periode -> tanggal mulai
// sebenarnya ("YYYY-MM-DD") untuk bulan yang gajiannya bergeser
export type PaydayPlan = {
  day: number;
  overrides: Readonly<Record<string, string>>;
};

export const CALENDAR_PLAN: PaydayPlan = { day: 1, overrides: {} };

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function isValidPayday(day: number): boolean {
  return Number.isInteger(day) && day >= MIN_PAYDAY && day <= MAX_PAYDAY;
}

// true kalau periodenya bukan bulan kalender biasa (tanggal gajian diatur,
// atau ada bulan yang digeser); dipakai untuk memilih kata "periode" dan
// menampilkan rentang tanggal
export function isCustomPeriod(plan: PaydayPlan): boolean {
  return plan.day > 1 || Object.keys(plan.overrides).length > 0;
}

// Apakah `date` boleh jadi tanggal mulai periode berkunci `key`: format
// tanggal benar, tanggalnya ada di kalender, dan jatuh di bulan `key`
export function isValidPeriodStart(key: string, date: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(key) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  if (date.slice(0, 7) !== key) return false;
  const [y, m, d] = date.split("-").map(Number);
  const real = new Date(Date.UTC(y, m - 1, d));
  return (
    real.getUTCFullYear() === y &&
    real.getUTCMonth() === m - 1 &&
    real.getUTCDate() === d
  );
}

// geser kunci "YYYY-MM" sebanyak delta bulan
export function shiftPeriodKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

// Tanggal mulai periode berkunci `key`: tanggal khusus kalau ada dan
// valid, selain itu tanggal gajian biasa
export function periodStart(key: string, plan: PaydayPlan): string {
  const custom = plan.overrides[key];
  if (custom && isValidPeriodStart(key, custom)) return custom;
  return `${key}-${pad(Math.max(MIN_PAYDAY, plan.day))}`;
}

// Rentang tanggal (inklusif) periode berkunci `key`
export function periodRange(
  key: string,
  plan: PaydayPlan
): { start: string; end: string } {
  const start = periodStart(key, plan);
  const nextStart = periodStart(shiftPeriodKey(key, 1), plan);
  return { start, end: addDays(nextStart, -1) };
}

// Kunci periode yang memuat tanggal `date`. Tanggal mulai tiap periode selalu
// di bulannya sendiri, jadi cukup bandingkan dengan awal periode bulan itu.
export function periodKeyOf(date: string, plan: PaydayPlan): string {
  const month = date.slice(0, 7);
  return periodStart(month, plan) <= date ? month : shiftPeriodKey(month, -1);
}

export function daysBetweenInclusive(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const ms = Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);
  return Math.round(ms / 86_400_000) + 1;
}

export function periodLength(key: string, plan: PaydayPlan): number {
  const { start, end } = periodRange(key, plan);
  return daysBetweenInclusive(start, end);
}

function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTH_SHORT[m - 1]}`;
}

// "21 Okt": awal periode, dipakai sebagai label sumbu grafik
export function periodShortLabel(key: string, plan: PaydayPlan): string {
  return shortDate(periodStart(key, plan));
}

// "Oktober 2026" untuk bulan kalender utuh, "21 Okt sampai 20 Nov 2026" untuk
// periode gajian (tahun ditulis sekali, di akhir rentang)
export function periodLabel(key: string, plan: PaydayPlan): string {
  const [y, m] = key.split("-").map(Number);
  const { start, end } = periodRange(key, plan);
  const isWholeMonth =
    start === `${key}-01` &&
    end === `${key}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
  if (isWholeMonth) return `${MONTH_LONG[m - 1]} ${y}`;
  return `${shortDate(start)} sampai ${shortDate(end)} ${end.slice(0, 4)}`;
}

// kata untuk satuan waktunya: "bulan" atau "periode"
export function periodNoun(plan: PaydayPlan): "bulan" | "periode" {
  return isCustomPeriod(plan) ? "periode" : "bulan";
}

// "November 2026": nama bulan kunci periode, untuk pilihan bulan di pengaturan
export function periodMonthName(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_LONG[m - 1]} ${y}`;
}
