"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonth, shiftMonth } from "@/lib/format";

// `label` menggantikan nama bulan saat periodenya tidak sejajar bulan kalender
// (mis. "21 Okt sampai 20 Nov 2026"); kunci `month` tetap dipakai untuk
// berpindah antar periode.
export function MonthNav({ month, label }: { month: string; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(delta: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", shiftMonth(month, delta));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => go(-1)}
        aria-label="Sebelumnya"
        className="max-sm:size-11"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span
        className={
          label
            ? "min-w-40 text-center text-sm font-medium"
            : "min-w-32 text-center text-sm font-medium"
        }
        aria-live="polite"
      >
        {label ?? formatMonth(month)}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => go(1)}
        aria-label="Berikutnya"
        className="max-sm:size-11"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
