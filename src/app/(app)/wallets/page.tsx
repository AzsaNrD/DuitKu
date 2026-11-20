import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import { getWalletsWithBalances, getWalletUsage } from "@/db/queries";
import { WalletsClient } from "./wallets-client";

export const metadata: Metadata = { title: "Dompet" };

export default async function WalletsPage() {
  const userId = await requireUserId();
  const [wallets, usage] = await Promise.all([
    getWalletsWithBalances(userId),
    getWalletUsage(userId),
  ]);

  return <WalletsClient wallets={wallets} usage={usage} />;
}
