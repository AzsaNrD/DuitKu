import { db } from "@/db";
import { categories } from "@/db/schema";
import type { CategoryType } from "@/db/schema";

const DEFAULT_CATEGORIES: {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}[] = [
  { name: "Makanan & Minuman", type: "expense", icon: "utensils", color: "#f97316" },
  { name: "Transportasi", type: "expense", icon: "car", color: "#3b82f6" },
  { name: "Parkir", type: "expense", icon: "circle-parking", color: "#0ea5e9" },
  { name: "Belanja Online", type: "expense", icon: "shopping-cart", color: "#ec4899" },
  { name: "Tagihan & Utilitas", type: "expense", icon: "receipt", color: "#ef4444" },
  { name: "Hiburan", type: "expense", icon: "gamepad-2", color: "#8b5cf6" },
  { name: "Kesehatan", type: "expense", icon: "heart-pulse", color: "#10b981" },
  { name: "Pendidikan", type: "expense", icon: "graduation-cap", color: "#6366f1" },
  { name: "Lainnya", type: "expense", icon: "circle-ellipsis", color: "#737373" },
  { name: "Gaji", type: "income", icon: "banknote", color: "#22c55e" },
  { name: "Bonus", type: "income", icon: "gift", color: "#eab308" },
  { name: "Pemasukan Lain", type: "income", icon: "trending-up", color: "#14b8a6" },
];

export async function seedDefaultCategories(userId: string) {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isDefault: true }))
  );
}
