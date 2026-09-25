import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AllocationBucketProgress } from "@/db/queries";

// Bar tipis berisi proporsi tiap pos, dipakai berulang (pilihan preset,
// kartu pemasukan, dashboard) sebagai penanda visual fitur alokasi.
export function AllocationSplitBar({
  buckets,
  className,
}: {
  buckets: { id?: string; name: string; percent: number; color: string }[];
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={buckets.map((b) => `${b.name} ${b.percent}%`).join(", ")}
      className={cn("flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full", className)}
    >
      {buckets.map((b, i) => (
        <div
          key={b.id ?? i}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${b.percent}%`, backgroundColor: b.color }}
        />
      ))}
    </div>
  );
}

// Pos pengeluaran memakai ambang warna yang sama dengan BudgetProgressItem
// (hijau < 75%, kuning 75-100%, merah > 100%). Pos tabungan kebalikannya:
// mencapai target itu bagus (hijau), belum tercapai netral.
function barColor(kind: AllocationBucketProgress["kind"], pct: number) {
  if (kind === "savings") return pct >= 100 ? "bg-green-500" : "bg-primary";
  if (pct > 100) return "bg-red-500";
  if (pct >= 75) return "bg-yellow-500";
  return "bg-green-500";
}

function statusText(bucket: AllocationBucketProgress) {
  const diff = bucket.planned - bucket.actual;
  if (bucket.kind === "savings") {
    if (bucket.actual < 0) {
      return { text: `ditarik ${formatIDR(-bucket.actual)}`, tone: "bad" as const };
    }
    if (bucket.planned === 0) {
      return bucket.actual > 0
        ? { text: "tersimpan", tone: "good" as const }
        : { text: "menunggu pemasukan", tone: "muted" as const };
    }
    if (diff <= 0) return { text: "target tercapai", tone: "good" as const };
    return { text: `kurang ${formatIDR(diff)}`, tone: "muted" as const };
  }
  if (diff < 0) return { text: `lebih ${formatIDR(-diff)}`, tone: "bad" as const };
  if (bucket.planned === 0) {
    return { text: "menunggu pemasukan", tone: "muted" as const };
  }
  return { text: `sisa ${formatIDR(diff)}`, tone: "muted" as const };
}

export function AllocationBucketRow({
  bucket,
  compact = false,
}: {
  bucket: AllocationBucketProgress;
  compact?: boolean;
}) {
  const pct = bucket.planned > 0 ? (bucket.actual / bucket.planned) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, pct));
  const status = statusText(bucket);
  const verb = bucket.kind === "savings" ? "tersimpan" : "terpakai";

  return (
    <div className={cn("space-y-2", compact ? "py-2" : "py-3.5")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: bucket.color }}
          />
          <span className="truncate text-sm font-medium">{bucket.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {bucket.percent}%
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 text-xs font-medium",
            status.tone === "bad" && "text-red-600 dark:text-red-400",
            status.tone === "good" && "text-green-600 dark:text-green-400",
            status.tone === "muted" && "text-muted-foreground"
          )}
        >
          {status.text}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor(bucket.kind, pct))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="money text-xs text-muted-foreground">
        {formatIDR(bucket.actual)} {verb} dari rencana {formatIDR(bucket.planned)}
      </p>
      {!compact && bucket.linkedCount === 0 && (
        <p className="text-xs text-muted-foreground">
          {bucket.kind === "savings"
            ? "Belum ada dompet tabungan di pos ini, atur lewat tombol Atur."
            : "Belum ada kategori di pos ini, atur lewat tombol Atur."}
        </p>
      )}
    </div>
  );
}
