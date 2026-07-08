import { CategoryIcon } from "@/components/category-icon";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BudgetWithProgress } from "@/db/queries";

// hijau < 75%, kuning 75-100%, merah > 100%
export function BudgetProgressItem({
  budget,
  actions,
}: {
  budget: BudgetWithProgress;
  actions?: React.ReactNode;
}) {
  const pct = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const clamped = Math.min(100, pct);
  const barColor =
    pct > 100 ? "bg-red-500" : pct >= 75 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: budget.categoryColor }}
          >
            <CategoryIcon icon={budget.categoryIcon} className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-medium">
            {budget.categoryName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-semibold",
              pct > 100
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            )}
          >
            {Math.round(pct)}%
          </span>
          {actions}
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatIDR(budget.spent)} dari {formatIDR(budget.amount)}
        {pct > 100 && (
          <span className="ml-1 font-medium text-red-600 dark:text-red-400">
            (lebih {formatIDR(budget.spent - budget.amount)})
          </span>
        )}
      </p>
    </div>
  );
}
