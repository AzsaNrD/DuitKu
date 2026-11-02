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
import { savePayday } from "@/actions/settings";
import { actionToast } from "@/lib/action-toast";
import { todayString } from "@/lib/format";
import {
  isValidPayday,
  MAX_PAYDAY,
  MIN_PAYDAY,
  periodKeyOf,
  periodLabel,
} from "@/lib/period";

export function PaydayButton({ payday }: { payday: number }) {
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
        {payday > 1 ? `Gajian tgl ${payday}` : "Tanggal gajian"}
      </Button>
      {open && (
        <PaydayDialog
          open={open}
          onOpenChange={handleOpenChange}
          payday={payday}
        />
      )}
    </>
  );
}

function PaydayDialog({
  open,
  onOpenChange,
  payday,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payday: number;
}) {
  const [value, setValue] = useState(String(payday));
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(value);
  const valid = value.trim() !== "" && isValidPayday(parsed);
  const today = todayString();
  const preview = valid
    ? periodLabel(periodKeyOf(today, parsed), parsed)
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
          <DialogTitle>Tanggal gajian</DialogTitle>
          <DialogDescription>
            Alokasi dan jatah jajan dihitung dari tanggal gajian sampai sehari
            sebelum gajian berikutnya. Isi 1 kalau kamu mengikuti bulan
            kalender biasa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="payday-day">Gajian tiap tanggal</Label>
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
          </div>
          <p className="text-xs text-muted-foreground">
            Kalau gaji masuk lebih awal dari tanggal ini (misalnya jatuh di
            akhir pekan), catat transaksinya dengan tanggal gajian supaya
            masuk ke periode yang benar.
          </p>
          <DialogFooter className="max-sm:flex-col-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="max-sm:min-h-11"
            >
              Batal
            </Button>
            <Button type="submit" className="max-sm:min-h-11">
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
