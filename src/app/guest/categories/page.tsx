"use client";

import {
  CategoriesClient,
  type CategoryGuestActions,
} from "@/app/(app)/categories/categories-client";
import {
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
  return <CategoriesClient categories={data.categories} guest={GUEST_ACTIONS} />;
}
