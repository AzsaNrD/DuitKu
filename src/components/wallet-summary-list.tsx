import { WALLET_TYPE_ICONS, WALLET_TYPE_LABELS, WALLET_TYPE_ORDER } from "@/lib/wallet-types";
import { formatIDR } from "@/lib/format";
import type { WalletWithBalance } from "@/db/queries";

// Ringkasan dompet di dashboard, dikelompokkan per tipe (Cash/Bank/E-Wallet)
// supaya kartunya tidak makin memanjang ke bawah kalau dompetnya banyak:
// rincian per dompet hanya ditampilkan untuk kelompok berisi 2-3 dompet.
// Kelompok berisi 1 dompet tidak perlu rincian (subtotalnya sama persis),
// cukup nama dompetnya di samping judul; kelompok > 3 cukup subtotal saja,
// rinciannya tetap bisa dilihat di halaman Dompet.
export function WalletSummaryList({ wallets }: { wallets: WalletWithBalance[] }) {
  const groups = WALLET_TYPE_ORDER.map((type) => ({
    type,
    items: wallets.filter((w) => w.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map(({ type, items }) => {
        const Icon = WALLET_TYPE_ICONS[type];
        const label = WALLET_TYPE_LABELS[type];
        const subtotal = items.reduce((sum, w) => sum + w.balance, 0);
        const showIndividual = items.length >= 2 && items.length <= 3;
        const singleName =
          items.length === 1 &&
          items[0].name.trim().toLowerCase() !== label.toLowerCase()
            ? items[0].name
            : null;

        return (
          <div key={type}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="shrink-0 text-sm font-medium">{label}</span>
                {singleName ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {singleName}
                  </span>
                ) : (
                  items.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      ({items.length})
                    </span>
                  )
                )}
              </div>
              <span className="money shrink-0 text-sm font-semibold">
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
