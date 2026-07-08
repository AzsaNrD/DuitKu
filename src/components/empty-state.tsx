import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Tampilan kosong yang ramah: ikon dalam lingkaran lembut,
// judul, deskripsi singkat, dan (opsional) tombol aksi.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 text-center",
        compact ? "py-8" : "py-14"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-primary/10 text-primary",
          compact ? "h-12 w-12" : "h-16 w-16"
        )}
      >
        <Icon className={compact ? "h-6 w-6" : "h-8 w-8"} />
      </div>
      <div className="space-y-1.5">
        <p className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
          {title}
        </p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
