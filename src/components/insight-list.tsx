import {
  CalendarDays,
  ChartPie,
  Gauge,
  Repeat,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Insight, InsightIcon, InsightTone } from "@/lib/insights";
import { cn } from "@/lib/utils";

const ICONS: Record<InsightIcon, LucideIcon> = {
  category: ChartPie,
  "trend-up": TrendingUp,
  "trend-down": TrendingDown,
  calendar: CalendarDays,
  repeat: Repeat,
  projection: Gauge,
};

// Warna hanya penguat. Maknanya tetap terbaca lewat bentuk ikon, isi
// kalimat, dan label tersembunyi untuk pembaca layar.
const TONE: Record<InsightTone, { chip: string; sr: string }> = {
  warn: {
    chip: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    sr: "Perlu perhatian: ",
  },
  good: {
    chip: "bg-green-500/10 text-green-800 dark:text-green-300",
    sr: "Kabar baik: ",
  },
  info: { chip: "bg-muted text-foreground", sr: "" },
};

// Bungkus nominal rupiah dengan kelas "money" supaya ikut ter-blur saat
// mode sembunyikan saldo aktif.
function withMoney(text: string) {
  return text.split(/(Rp\s[\d.]+)/g).map((part, i) =>
    /^Rp\s[\d.]+$/.test(part) ? (
      <span key={i} className="money">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <ul className="divide-y">
      {insights.map((insight) => {
        const Icon = ICONS[insight.icon];
        const tone = TONE[insight.tone];
        return (
          <li key={insight.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                tone.chip
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">
                {tone.sr && <span className="sr-only">{tone.sr}</span>}
                {insight.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {withMoney(insight.detail)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
