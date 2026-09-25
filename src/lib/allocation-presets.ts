import type { AllocationBucketKind } from "@/db/schema";

// Kelompok kategori bawaan untuk pemetaan otomatis saat preset dipilih.
// Dicocokkan lewat IKON, bukan nama: nama kategori bawaan sering diganti
// user (mis. "Makanan & Minuman" jadi "Makanan"), ikonnya jarang.
// Ikon-ikon ini sama dengan yang ada di default-categories.ts.
export const NEEDS_ICONS = [
  "utensils",
  "car",
  "circle-parking",
  "receipt",
  "heart-pulse",
  "graduation-cap",
];
export const WANTS_ICONS = ["gamepad-2", "shopping-cart", "circle-ellipsis"];

// ikon kategori pemasukan "Gaji" bawaan, dipilih otomatis sebagai dasar
// pembagian kalau user belum memilih kategori pemasukan sendiri
export const SALARY_ICON = "banknote";

type AutoMapGroup = "needs" | "wants";

export type AllocationPresetBucket = {
  name: string;
  percent: number;
  kind: AllocationBucketKind;
  color: string;
  autoMap: AutoMapGroup[];
};

export type AllocationPreset = {
  id: string;
  label: string;
  description: string;
  buckets: AllocationPresetBucket[];
};

export const ALLOCATION_PRESETS: AllocationPreset[] = [
  {
    id: "50-30-20",
    label: "50/30/20",
    description:
      "Setengah untuk kebutuhan pokok, sisanya dibagi untuk keinginan dan tabungan.",
    buckets: [
      { name: "Kebutuhan", percent: 50, kind: "expense", color: "#3b82f6", autoMap: ["needs"] },
      { name: "Keinginan", percent: 30, kind: "expense", color: "#ec4899", autoMap: ["wants"] },
      { name: "Tabungan", percent: 20, kind: "savings", color: "#22c55e", autoMap: [] },
    ],
  },
  {
    id: "70-20-10",
    label: "70/20/10",
    description:
      "Semua biaya hidup jadi satu pos, ditambah tabungan dan sedekah.",
    buckets: [
      { name: "Biaya Hidup", percent: 70, kind: "expense", color: "#3b82f6", autoMap: ["needs", "wants"] },
      { name: "Tabungan", percent: 20, kind: "savings", color: "#22c55e", autoMap: [] },
      { name: "Sedekah & Lainnya", percent: 10, kind: "expense", color: "#f97316", autoMap: [] },
    ],
  },
  {
    id: "40-30-20-10",
    label: "40/30/20/10",
    description:
      "Memisahkan cicilan dan sosial dari kebutuhan. Proporsinya sering berbeda antar sumber, sesuaikan saja.",
    buckets: [
      { name: "Kebutuhan", percent: 40, kind: "expense", color: "#3b82f6", autoMap: ["needs"] },
      { name: "Cicilan & Utang", percent: 30, kind: "expense", color: "#ef4444", autoMap: [] },
      { name: "Tabungan & Investasi", percent: 20, kind: "savings", color: "#22c55e", autoMap: [] },
      { name: "Sosial & Sedekah", percent: 10, kind: "expense", color: "#f97316", autoMap: [] },
    ],
  },
];

export const ALLOCATION_PRESET_IDS = ALLOCATION_PRESETS.map((p) => p.id) as [
  string,
  ...string[],
];

export function iconsForGroups(groups: AutoMapGroup[]): string[] {
  return groups.flatMap((g) => (g === "needs" ? NEEDS_ICONS : WANTS_ICONS));
}
