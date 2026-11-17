import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

type WalletLike = { id: string; name: string; balance: number };

// Putih dengan kepekatan menurun, supaya terbaca di atas gradasi hijau
// tanpa bergantung pada warna dompet yang dipilih pengguna.
const SHADES = ["bg-white", "bg-white/70", "bg-white/45", "bg-white/25"];

// Rincian saldo di kartu Total Saldo: bilah proporsi dan tiga dompet terbesar.
// Maknanya ada di daftar angka; bilahnya hanya penguat visual.
export function HeroWalletBreakdown({
  wallets,
  addHref,
}: {
  wallets: WalletLike[];
  addHref: string;
}) {
  if (wallets.length === 0) {
    return (
      <Link
        href={addHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-white underline-offset-4 hover:underline"
      >
        Tambah dompet pertama <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  }

  const sorted = [...wallets].sort((a, b) => b.balance - a.balance);
  const shown = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const restTotal = rest.reduce((sum, w) => sum + w.balance, 0);

  const rows = [
    ...shown.map((w, i) => ({
      key: w.id,
      name: w.name,
      balance: w.balance,
      shade: SHADES[i],
    })),
    ...(rest.length > 0
      ? [
          {
            key: "rest",
            name: `${rest.length} dompet lainnya`,
            balance: restTotal,
            shade: SHADES[3],
          },
        ]
      : []),
  ];

  const positiveTotal = rows.reduce((sum, r) => sum + Math.max(0, r.balance), 0);

  return (
    <div className="space-y-3">
      {positiveTotal > 0 && (
        <div
          aria-hidden="true"
          className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-white/15"
        >
          {rows
            .filter((r) => r.balance > 0)
            .map((r) => (
              <div
                key={r.key}
                className={cn("h-full first:rounded-l-full last:rounded-r-full", r.shade)}
                style={{ width: `${(r.balance / positiveTotal) * 100}%` }}
              />
            ))}
        </div>
      )}
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={cn("h-2 w-2 shrink-0 rounded-full", r.shade)}
              />
              <span className="truncate text-white/85">{r.name}</span>
            </span>
            <span className="money shrink-0 font-medium">{formatIDR(r.balance)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
