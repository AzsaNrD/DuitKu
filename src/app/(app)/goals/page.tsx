import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import {
  getGoalsWithProgress,
  getPayday,
  getWalletNetChange,
  getWalletsWithBalances,
} from "@/db/queries";
import { todayString } from "@/lib/format";
import { isCustomPeriod } from "@/lib/period";
import { addDaysTo, computeGoalPace, type GoalPace } from "@/lib/goal-pace";
import { GoalsClient } from "./goals-client";

export const metadata: Metadata = { title: "Impian" };

// jendela untuk menghitung laju menabung dari perubahan saldo dompet
const PACE_WINDOW_DAYS = 60;

export default async function GoalsPage() {
  const userId = await requireUserId();
  const today = todayString();
  const [goals, wallets, payday, walletChange] = await Promise.all([
    getGoalsWithProgress(userId),
    getWalletsWithBalances(userId),
    getPayday(userId),
    getWalletNetChange(userId, addDaysTo(today, -(PACE_WINDOW_DAYS - 1))),
  ]);

  // dihitung di server supaya tanggal "hari ini" sama antara server dan klien
  const paces: Record<string, GoalPace> = {};
  for (const g of goals) {
    paces[g.id] = computeGoalPace({
      target: Number(g.targetAmount),
      saved: g.saved,
      targetDate: g.targetDate,
      today,
      payday,
      windowChange: g.walletId ? (walletChange.get(g.walletId) ?? 0) : null,
      windowDays: PACE_WINDOW_DAYS,
    });
  }

  return (
    <GoalsClient
      goals={goals}
      wallets={wallets}
      paces={paces}
      paceUnit={isCustomPeriod(payday) ? "gajian" : "bulan"}
    />
  );
}
