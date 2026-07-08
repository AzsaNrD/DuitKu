import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import { getUserCategories } from "@/db/queries";
import { CategoriesClient } from "./categories-client";

export const metadata: Metadata = { title: "Kategori" };

export default async function CategoriesPage() {
  const userId = await requireUserId();
  const categories = await getUserCategories(userId);

  return <CategoriesClient categories={categories} />;
}
