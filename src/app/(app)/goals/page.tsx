import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import { getGoalsWithProgress, getWalletsWithBalances } from "@/db/queries";
import { GoalsClient } from "./goals-client";

export const metadata: Metadata = { title: "Impian" };

export default async function GoalsPage() {
  const userId = await requireUserId();
  const [goals, wallets] = await Promise.all([
    getGoalsWithProgress(userId),
    getWalletsWithBalances(userId),
  ]);

  return <GoalsClient goals={goals} wallets={wallets} />;
}
