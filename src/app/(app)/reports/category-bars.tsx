"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatIDR } from "@/lib/format";

// Daftar panjang dipotong ke beberapa teratas supaya kartu tidak jauh lebih
// tinggi dari kartu di sebelahnya; sisanya dibuka lewat tombol, bukan scroll.
const LIMIT = 5;

export function CategoryBars({
  title,
  items,
  total,
}: {
  title: string;
  items: { name: string; color: string; total: number }[];
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, LIMIT);
  const hidden = items.length - LIMIT;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada data.</p>
      ) : (
        visible.map((item) => {
          const pct = total > 0 ? (item.total / total) * 100 : 0;
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="money shrink-0 font-medium">
                  {formatIDR(item.total)}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({pct.toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 rounded-md py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? (
            <>
              Tampilkan lebih sedikit <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Tampilkan {hidden} lainnya <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
