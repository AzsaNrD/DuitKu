import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import { getGoals } from "@/db/queries";
import { GoalsClient } from "./goals-client";

export const metadata: Metadata = { title: "Impian" };

export default async function GoalsPage() {
  const userId = await requireUserId();
  const goals = await getGoals(userId);

  return <GoalsClient goals={goals} />;
}
