import type { Metadata } from "next";
import { requireUserId } from "@/lib/require-user";
import { getWalletsWithBalances } from "@/db/queries";
import { WalletsClient } from "./wallets-client";

export const metadata: Metadata = { title: "Dompet" };

export default async function WalletsPage() {
  const userId = await requireUserId();
  const wallets = await getWalletsWithBalances(userId);

  return <WalletsClient wallets={wallets} />;
}
