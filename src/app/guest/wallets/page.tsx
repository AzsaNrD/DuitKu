"use client";

import { useMemo } from "react";
import { WalletsClient, type WalletGuestActions } from "@/app/(app)/wallets/wallets-client";
import {
  adjustGuestWalletBalance,
  computeWalletsWithBalances,
  computeWalletUsage,
  createGuestTransaction,
  createGuestWallet,
  deleteGuestWallet,
  updateGuestTransaction,
  updateGuestWallet,
  useGuestData,
} from "@/lib/guest-store";

const GUEST_ACTIONS: WalletGuestActions = {
  createWallet: createGuestWallet,
  updateWallet: updateGuestWallet,
  deleteWallet: deleteGuestWallet,
  adjustWalletBalance: adjustGuestWalletBalance,
  transactions: {
    createTransaction: createGuestTransaction,
    updateTransaction: updateGuestTransaction,
  },
};

export default function GuestWalletsPage() {
  const data = useGuestData();
  const wallets = useMemo(() => computeWalletsWithBalances(data), [data]);
  const usage = useMemo(() => computeWalletUsage(data), [data]);

  return <WalletsClient wallets={wallets} usage={usage} guest={GUEST_ACTIONS} />;
}
