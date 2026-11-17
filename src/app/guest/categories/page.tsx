"use client";

import {
  CategoriesClient,
  type CategoryGuestActions,
} from "@/app/(app)/categories/categories-client";
import { useMemo } from "react";
import { currentMonth } from "@/lib/format";
import {
  computeCategoryTotals,
  createGuestCategory,
  deleteGuestCategory,
  updateGuestCategory,
  useGuestData,
} from "@/lib/guest-store";

const GUEST_ACTIONS: CategoryGuestActions = {
  createCategory: createGuestCategory,
  updateCategory: updateGuestCategory,
  deleteCategory: deleteGuestCategory,
};

export default function GuestCategoriesPage() {
  const data = useGuestData();
  const totals = useMemo(
    () => computeCategoryTotals(data, currentMonth()),
    [data]
  );
  return (
    <CategoriesClient
      categories={data.categories}
      totals={totals}
      noun="bulan"
      guest={GUEST_ACTIONS}
    />
  );
}
