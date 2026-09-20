"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actionToast, type ActionResult } from "@/lib/action-toast";
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
import { AmountInput } from "@/components/amount-input";
import { Label } from "@/components/ui/label";
import { adjustWalletBalance } from "@/actions/transactions";
import {
  adjustBalanceSchema,
  type AdjustBalanceInput,
} from "@/lib/zod-schemas";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WalletWithBalance } from "@/db/queries";

export function AdjustBalanceDialog({
  open,
  onOpenChange,
  wallet,
  adjustAction = adjustWalletBalance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletWithBalance;
  // override untuk mode tanpa akun (localStorage) — defaultnya action
  // server asli, jadi halaman yang sudah ada tidak perlu berubah sama sekali
  adjustAction?: (id: string, input: AdjustBalanceInput) => Promise<ActionResult>;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AdjustBalanceInput>({
    resolver: zodResolver(adjustBalanceSchema),
    defaultValues: { actualBalance: wallet.balance, note: "" },
  });

  // AmountInput menyimpan nilai berformat ("200.000") sebelum divalidasi,
  // jadi selisih di sini dihitung dari string mentahnya, sama seperti zod.
  const rawActual = useWatch({ control, name: "actualBalance" });
  const actualNumber = Number(String(rawActual ?? "").replaceAll(".", "")) || 0;
  const diff = actualNumber - wallet.balance;

  function onSubmit(data: AdjustBalanceInput) {
    onOpenChange(false);
    actionToast(adjustAction(wallet.id, data), {
      loading: "Menyesuaikan saldo...",
      success: "Saldo disesuaikan",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sesuaikan Saldo {wallet.name}</DialogTitle>
          <DialogDescription>
            Kalau saldo di sini beda dengan saldo asli (misalnya ada
            transaksi yang lupa dicatat), masukkan saldo yang sebenarnya.
            Selisihnya otomatis dicatat sebagai penyesuaian, bukan menimpa
            riwayat transaksi yang sudah ada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Saldo tercatat saat ini:{" "}
            <span className="money font-medium text-foreground">
              {formatIDR(wallet.balance)}
            </span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="actual-balance">Saldo Sebenarnya (Rp)</Label>
            <AmountInput
              id="actual-balance"
              min={0}
              {...register("actualBalance")}
            />
            {errors.actualBalance && (
              <p className="text-sm text-destructive">
                {errors.actualBalance.message}
              </p>
            )}
          </div>
          {diff !== 0 && (
            <p
              className={cn(
                "money text-sm font-medium",
                diff > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              Selisih: {diff > 0 ? "+" : "-"}
              {formatIDR(Math.abs(diff))}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="adjust-note">Alasan Penyesuaian</Label>
            <Input
              id="adjust-note"
              placeholder="cth: lupa catat jajan kemarin"
              {...register("note")}
            />
            {errors.note && (
              <p className="text-sm text-destructive">{errors.note.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || diff === 0}>
              {isSubmitting ? "Menyimpan..." : "Sesuaikan Saldo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
