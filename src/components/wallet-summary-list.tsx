import { WALLET_TYPE_ICONS, WALLET_TYPE_LABELS, WALLET_TYPE_ORDER } from "@/lib/wallet-types";
import { formatIDR } from "@/lib/format";
import type { WalletWithBalance } from "@/db/queries";

// Ringkasan dompet di dashboard, dikelompokkan per tipe (Cash/Bank/E-Wallet)
// supaya kartunya tidak makin memanjang ke bawah kalau dompetnya banyak:
// tiap kelompok cuma menampilkan daftar dompetnya satu per satu kalau
// jumlahnya sedikit (maks 3); kalau lebih, cukup subtotal + jumlah dompetnya
// saja, rinciannya tetap bisa dilihat di halaman Dompet.
export function WalletSummaryList({ wallets }: { wallets: WalletWithBalance[] }) {
  const groups = WALLET_TYPE_ORDER.map((type) => ({
    type,
    items: wallets.filter((w) => w.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map(({ type, items }) => {
        const Icon = WALLET_TYPE_ICONS[type];
        const subtotal = items.reduce((sum, w) => sum + w.balance, 0);
        const showIndividual = items.length <= 3;

        return (
          <div key={type}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="text-sm font-medium">
                  {WALLET_TYPE_LABELS[type]}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({items.length})
                </span>
              </div>
              <span className="money text-sm font-semibold">
                {formatIDR(subtotal)}
              </span>
            </div>
            {showIndividual && (
              <div className="mt-2 space-y-1.5 pl-[42px]">
                {items.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate text-xs text-muted-foreground">
                      {wallet.name}
                    </span>
                    <span className="money shrink-0 text-xs text-muted-foreground">
                      {formatIDR(wallet.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
