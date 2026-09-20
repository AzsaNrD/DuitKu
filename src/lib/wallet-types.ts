import { Banknote, CreditCard, Smartphone, type LucideIcon } from "lucide-react";
import type { WalletType } from "@/db/schema";

// Satu sumber label & ikon per tipe dompet, dipakai di halaman Dompet
// maupun ringkasan dashboard (login dan mode tanpa akun) supaya konsisten.
export const WALLET_TYPE_ORDER: WalletType[] = ["cash", "bank", "ewallet"];

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-Wallet",
};

export const WALLET_TYPE_ICONS: Record<WalletType, LucideIcon> = {
  cash: Banknote,
  bank: CreditCard,
  ewallet: Smartphone,
};
