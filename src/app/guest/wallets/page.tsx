"use client";

import { useMemo } from "react";
import { WalletsClient, type WalletGuestActions } from "@/app/(app)/wallets/wallets-client";
import {
  adjustGuestWalletBalance,
  computeWalletsWithBalances,
  createGuestWallet,
  deleteGuestWallet,
  updateGuestWallet,
  useGuestData,
} from "@/lib/guest-store";

const GUEST_ACTIONS: WalletGuestActions = {
  createWallet: createGuestWallet,
  updateWallet: updateGuestWallet,
  deleteWallet: deleteGuestWallet,
  adjustWalletBalance: adjustGuestWalletBalance,
};

export default function GuestWalletsPage() {
  const data = useGuestData();
  const wallets = useMemo(() => computeWalletsWithBalances(data), [data]);

  return <WalletsClient wallets={wallets} guest={GUEST_ACTIONS} />;
}
