"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonth, shiftMonth } from "@/lib/format";

export function MonthNav({ month }: { month: string }) {
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
      <Button variant="outline" size="icon" onClick={() => go(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-32 text-center text-sm font-medium">
        {formatMonth(month)}
      </span>
      <Button variant="outline" size="icon" onClick={() => go(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
