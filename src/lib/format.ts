// Format angka ke Rupiah: 150000 -> "Rp 150.000"
export function formatIDR(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const MONTH_NAMES = [
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

// "2026-07" -> "Juli 2026"
export function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

// "2026-07-07" -> "7 Juli 2026"
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${Number(d)} ${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

// Semua logika tanggal memakai WIB, bukan jam server —
// server Vercel berjalan di UTC (beda 7 jam dari Indonesia).
export const TIMEZONE = "Asia/Jakarta";

// hari ini dalam format "YYYY-MM-DD" menurut waktu Indonesia
export function todayString(): string {
  // locale en-CA menghasilkan format YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

// bulan berjalan dalam format "YYYY-MM"
export function currentMonth(): string {
  return todayString().slice(0, 7);
}

// jam saat ini (0-23) menurut waktu Indonesia
export function currentHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
}

// geser "YYYY-MM" sebanyak delta bulan
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}
