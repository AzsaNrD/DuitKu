// Periode keuangan yang mengikuti tanggal gajian. Tanpa import supaya mudah
// diuji langsung.
//
// Sebuah periode diberi kunci "YYYY-MM" = bulan tempat periode itu DIMULAI.
// Dengan gajian tanggal 21, kunci "2026-10" berarti 21 Okt 2026 sampai
// 20 Nov 2026. Tanggal gajian 1 berarti bulan kalender biasa, jadi semua
// pengguna yang tidak mengatur apa pun tetap bekerja seperti sebelumnya.
//
// Tanggal gajian dibatasi 1 sampai 28 supaya setiap bulan punya tanggal itu.

export const MIN_PAYDAY = 1;
export const MAX_PAYDAY = 28;

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

function lastDayOfMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// Rentang tanggal (inklusif) periode berkunci `key`
export function periodRange(
  key: string,
  payday: number
): { start: string; end: string } {
  if (payday <= 1) {
    return { start: `${key}-01`, end: `${key}-${pad(lastDayOfMonth(key))}` };
  }
  const start = `${key}-${pad(payday)}`;
  const nextStart = `${shiftPeriodKey(key, 1)}-${pad(payday)}`;
  return { start, end: addDays(nextStart, -1) };
}

// Kunci periode yang memuat tanggal `date`
export function periodKeyOf(date: string, payday: number): string {
  const month = date.slice(0, 7);
  if (payday <= 1) return month;
  return Number(date.slice(8, 10)) >= payday ? month : shiftPeriodKey(month, -1);
}

export function daysBetweenInclusive(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const ms = Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);
  return Math.round(ms / 86_400_000) + 1;
}

export function periodLength(key: string, payday: number): number {
  const { start, end } = periodRange(key, payday);
  return daysBetweenInclusive(start, end);
}

function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTH_SHORT[m - 1]}`;
}

// "Oktober 2026" untuk bulan kalender, "21 Okt sampai 20 Nov 2026" untuk
// periode gajian (tahun ditulis sekali, di akhir rentang)
export function periodLabel(key: string, payday: number): string {
  const [y, m] = key.split("-").map(Number);
  if (payday <= 1) return `${MONTH_LONG[m - 1]} ${y}`;
  const { start, end } = periodRange(key, payday);
  return `${shortDate(start)} sampai ${shortDate(end)} ${end.slice(0, 4)}`;
}

// kata untuk satuan waktunya: "bulan" atau "periode"
export function periodNoun(payday: number): "bulan" | "periode" {
  return payday <= 1 ? "bulan" : "periode";
}
