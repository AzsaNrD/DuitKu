import { Ban, CircleCheck, Cookie, TriangleAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  SnackSettingsButton,
  type SnackCategoryOption,
} from "@/components/snack-settings";
import { computeDailyAllowance, type SnackStatus } from "@/lib/snack";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Overview = {
  plan: { limit: number; categoryIds: string[] };
  spentMonth: number;
  spentToday: number;
} | null;

// Setiap status punya ikon dan kata sendiri, jadi artinya tidak bergantung
// pada warna. Warna isi progress dipilih >= 3:1 terhadap trek-nya.
const STATUS_STYLE: Record<
  SnackStatus,
  { label: string; Icon: typeof CircleCheck; chip: string }
> = {
  aman: {
    label: "Aman",
    Icon: CircleCheck,
    chip: "bg-green-500/10 text-green-800 dark:text-green-300",
  },
  "hati-hati": {
    label: "Hampir habis",
    Icon: TriangleAlert,
    chip: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  lewat: {
    label: "Lewat jatah",
    Icon: TriangleAlert,
    chip: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  habis: {
    label: "Batas habis",
    Icon: Ban,
    chip: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

function monthBarColor(ratio: number) {
  if (ratio > 1) return "bg-red-600 dark:bg-red-500";
  if (ratio >= 0.75) return "bg-amber-700 dark:bg-amber-500";
  return "bg-green-700 dark:bg-green-500";
}

export function SnackCard({
  overview,
  today,
  categories,
}: {
  overview: Overview;
  today: string;
  categories: SnackCategoryOption[];
}) {
  if (!overview) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Jatah Jajan Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            compact
            icon={Cookie}
            title="Belum ada jatah jajan"
            description="Isi batas jajan per bulan dan pilih kategori yang dihitung. Kamu akan tahu berapa yang aman dipakai tiap hari."
            action={
              <SnackSettingsButton
                categories={categories}
                plan={null}
                label="Atur Jatah Jajan"
                variant="default"
              />
            }
          />
        </CardContent>
      </Card>
    );
  }

  const { plan, spentMonth, spentToday } = overview;
  const a = computeDailyAllowance({
    limit: plan.limit,
    spentMonth,
    spentToday,
    today,
  });
  const status = STATUS_STYLE[a.status];
  const ratio = plan.limit > 0 ? spentMonth / plan.limit : 0;
  // bar berhenti di 100%, tetapi tulisannya tetap jujur kalau batas terlewat
  const realPct = Math.round(ratio * 100);
  const barPct = Math.min(100, realPct);

  // angka utama dan labelnya mengikuti status
  let headlineLabel = "Sisa jatah hari ini";
  let headlineValue = a.leftToday;
  if (a.status === "lewat") {
    headlineLabel = "Lewat dari jatah hari ini";
    headlineValue = Math.abs(a.leftToday);
  } else if (a.status === "habis") {
    if (a.monthRemaining < 0) {
      headlineLabel = "Lewat dari batas bulan ini";
      headlineValue = Math.abs(a.monthRemaining);
    } else {
      headlineLabel = "Sisa batas bulan ini";
      headlineValue = Math.max(0, a.monthRemaining);
    }
  }

  const counted = categories.filter((c) => plan.categoryIds.includes(c.id));
  const shownNames = counted.slice(0, 3).map((c) => c.name);
  const hidden = counted.length - shownNames.length;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Jatah Jajan Hari Ini</CardTitle>
        <SnackSettingsButton
          categories={categories}
          plan={plan}
          label="Atur"
        />
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center md:gap-10">
          {/* titik fokus: berapa yang masih aman dipakai hari ini */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{headlineLabel}</p>
            <p className="money text-3xl font-bold tracking-tight md:text-4xl">
              {formatIDR(headlineValue)}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
                  status.chip
                )}
              >
                <status.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {status.label}
              </span>
              {a.status !== "habis" && (
                <span className="text-sm text-muted-foreground">
                  Jatah hari ini{" "}
                  <span className="money">{formatIDR(a.allowanceToday)}</span>,
                  terpakai{" "}
                  <span className="money">{formatIDR(a.spentToday)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm text-muted-foreground">Jajan bulan ini</p>
              <p className="text-sm">
                <span className="money font-semibold">
                  {formatIDR(spentMonth)}
                </span>{" "}
                <span className="text-muted-foreground">
                  dari{" "}
                  <span className="money">{formatIDR(plan.limit)}</span>
                </span>
              </p>
            </div>
            <div
              role="progressbar"
              aria-label="Pemakaian batas jajan bulan ini"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={barPct}
              aria-valuetext={`${realPct} persen terpakai`}
              className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn("h-full rounded-full", monthBarColor(ratio))}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {realPct}% terpakai, sisa {a.daysLeft} hari bulan ini.
              </p>
              {a.tomorrowAllowance !== null && a.status !== "habis" && (
                <p>
                  Kalau hari ini tidak jajan lagi, jatah besok sekitar{" "}
                  <span className="money font-medium text-foreground">
                    {formatIDR(a.tomorrowAllowance)}
                  </span>
                  .
                </p>
              )}
              {counted.length > 0 && (
                <p className="text-xs">
                  Dihitung dari {shownNames.join(", ")}
                  {hidden > 0 ? ` dan ${hidden} kategori lain` : ""}.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
