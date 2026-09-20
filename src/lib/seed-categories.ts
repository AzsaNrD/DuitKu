import { db } from "@/db";
import { categories } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

export async function seedDefaultCategories(userId: string) {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isDefault: true }))
  );
}
