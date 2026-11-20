"use client";

import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clearPaydayOverride,
  savePayday,
  savePaydayOverride,
} from "@/actions/settings";
import { actionToast } from "@/lib/action-toast";
import { formatDate, todayString } from "@/lib/format";
import {
  isValidPayday,
  isValidPeriodStart,
  MAX_PAYDAY,
  MIN_PAYDAY,
  periodKeyOf,
  periodLabel,
  periodMonthName,
  periodStart,
  shiftPeriodKey,
  type PaydayPlan,
} from "@/lib/period";

export function PaydayButton({ payday }: { payday: PaydayPlan }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // dialog dilepas saat ditutup, jadi fokus dikembalikan ke tombol pembuka
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        onClick={() => setOpen(true)}
        className="max-sm:min-h-11"
      >
        <CalendarDays />
        {payday.day > 1 ? `Gajian tgl ${payday.day}` : "Periode"}
      </Button>
      {open && (
        <PaydayDialog
          open={open}
          onOpenChange={handleOpenChange}
          plan={payday}
        />
      )}
    </>
  );
}

function PaydayDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PaydayPlan;
}) {
  const [value, setValue] = useState(String(plan.day));
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(value);
  const valid = value.trim() !== "" && isValidPayday(parsed);
  const today = todayString();
  const previewPlan = { ...plan, day: parsed };
  const preview = valid
    ? periodLabel(periodKeyOf(today, previewPlan), previewPlan)
    : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError(`Isi tanggal ${MIN_PAYDAY} sampai ${MAX_PAYDAY}`);
      return;
    }
    onOpenChange(false);
    actionToast(savePayday(parsed), {
      loading: "Menyimpan tanggal gajian...",
      success:
        parsed > 1
          ? `Periode sekarang dihitung dari tanggal ${parsed}`
          : "Kembali memakai bulan kalender",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Periode dan tanggal gajian</DialogTitle>
          <DialogDescription>
            Alokasi dan jatah jajan dihitung dari tanggal gajian sampai sehari
            sebelum gajian berikutnya. Isi 1 kalau kamu tidak punya gaji tetap
            atau mengikuti bulan kalender biasa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-2" noValidate>
          <Label htmlFor="payday-day">Gajian biasanya tiap tanggal</Label>
          <div className="flex gap-2">
            <Input
              id="payday-day"
              type="number"
              inputMode="numeric"
              min={MIN_PAYDAY}
              max={MAX_PAYDAY}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "payday-error" : "payday-preview"}
              className="max-sm:h-11"
            />
            <Button type="submit" className="max-sm:min-h-11">
              Simpan
            </Button>
          </div>
          {error && (
            <p id="payday-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!error && (
            <p
              id="payday-preview"
              className="text-sm text-muted-foreground"
              aria-live="polite"
            >
              {preview
                ? `Periode berjalan: ${preview}`
                : `Isi tanggal ${MIN_PAYDAY} sampai ${MAX_PAYDAY}`}
            </p>
          )}
        </form>

        <ShiftSection plan={plan} onDone={() => onOpenChange(false)} />

        <DialogFooter className="max-sm:flex-col-reverse">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="max-sm:min-h-11"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function lastDayOf(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// Gaji cair di tanggal yang tidak biasa: pilih bulan periodenya dimulai,
// lalu isi tanggal sebenarnya.
function ShiftSection({
  plan,
  onDone,
}: {
  plan: PaydayPlan;
  onDone: () => void;
}) {
  const thisMonth = todayString().slice(0, 7);
  // bulan lalu, ini, dan depan, ditambah bulan mana pun yang sudah digeser
  const monthKeys = Array.from(
    new Set([
      shiftPeriodKey(thisMonth, -1),
      thisMonth,
      shiftPeriodKey(thisMonth, 1),
      ...Object.keys(plan.overrides),
    ])
  ).sort();

  const defaultStart = (key: string) =>
    periodStart(key, { day: plan.day, overrides: {} });
  const startFor = (key: string) => plan.overrides[key] ?? defaultStart(key);

  const [month, setMonth] = useState(thisMonth);
  const [date, setDate] = useState(startFor(thisMonth));

  const hasOverride = !!plan.overrides[month];
  const dateValid = isValidPeriodStart(month, date);
  const nextPlan: PaydayPlan = {
    day: plan.day,
    overrides: { ...plan.overrides, [month]: dateValid ? date : defaultStart(month) },
  };

  const items = monthKeys.map((key) => ({
    value: key,
    label: plan.overrides[key]
      ? `${periodMonthName(key)} (cair tgl ${Number(plan.overrides[key].slice(8))})`
      : periodMonthName(key),
  }));

  function changeMonth(key: string) {
    setMonth(key);
    setDate(startFor(key));
  }

  function onSave() {
    if (!dateValid) return;
    onDone();
    if (date === defaultStart(month)) {
      // sama dengan tanggal biasa: tidak perlu disimpan sebagai pengecualian
      actionToast(clearPaydayOverride(month), {
        loading: "Menyimpan...",
        success: `${periodMonthName(month)} memakai tanggal gajian biasa`,
      });
      return;
    }
    actionToast(savePaydayOverride(month, date), {
      loading: "Menyimpan tanggal gajian...",
      success: `Periode ${periodMonthName(month)} mulai ${formatDate(date)}`,
    });
  }

  function onReset() {
    onDone();
    actionToast(clearPaydayOverride(month), {
      loading: "Mengembalikan...",
      success: `${periodMonthName(month)} kembali ke tanggal gajian biasa`,
    });
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Gajian bulan tertentu bergeser?</p>
        <p className="text-sm text-muted-foreground">
          Kalau gaji cair di tanggal yang lain dari biasanya, pilih bulannya dan
          isi tanggal cairnya. Periode sebelumnya otomatis berakhir sehari
          sebelumnya.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Gaji bulan</Label>
          <Select
            items={items}
            value={month}
            onValueChange={(v) => v && changeMonth(v as string)}
          >
            <SelectTrigger className="w-full max-sm:h-11" aria-label="Bulan gaji">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payday-shift-date">Cair tanggal</Label>
          <Input
            id="payday-shift-date"
            type="date"
            min={`${month}-01`}
            max={`${month}-${String(lastDayOf(month)).padStart(2, "0")}`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!dateValid}
            className="max-sm:h-11"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {dateValid
          ? `Periode ${periodLabel(shiftPeriodKey(month, -1), nextPlan)}, lalu periode ${periodLabel(month, nextPlan)}.`
          : `Isi tanggal yang ada di ${periodMonthName(month)}.`}
      </p>
      <div className="flex flex-wrap gap-2 max-sm:flex-col-reverse">
        {hasOverride && (
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="max-sm:min-h-11"
          >
            Kembali ke tanggal {plan.day}
          </Button>
        )}
        <Button
          type="button"
          onClick={onSave}
          disabled={!dateValid}
          className="max-sm:min-h-11"
        >
          Simpan tanggal
        </Button>
      </div>
    </div>
  );
}
