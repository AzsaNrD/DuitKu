import { formatIDR } from "@/lib/format";

export function CategoryBars({
  title,
  items,
  total,
}: {
  title: string;
  items: { name: string; color: string; total: number }[];
  total: number;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada data.</p>
      ) : (
        items.map((item) => {
          const pct = total > 0 ? (item.total / total) * 100 : 0;
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                <span className="font-medium">
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
    </div>
  );
}
