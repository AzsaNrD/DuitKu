"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importGuestData } from "@/actions/guest";
import { clearGuestData, loadGuestData } from "@/lib/guest-store";

// Ditampilkan sekali setelah login/daftar berhasil, kalau browser ini
// masih menyimpan data dari mode tanpa akun (lihat hasGuestData()).
export function GuestMigrationDialog({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function migrate() {
    setLoading(true);
    const data = loadGuestData();
    const res = await importGuestData({
      wallets: data.wallets.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        initialBalance: String(w.initialBalance),
        color: w.color,
      })),
      categories: data.categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        isDefault: c.isDefault,
      })),
      transactions: data.transactions.map((t) => ({
        id: t.id,
        walletId: t.walletId,
        categoryId: t.categoryId,
        type: t.type,
        amount: String(t.amount),
        date: t.date,
        note: t.note,
        transferToWalletId: t.transferToWalletId,
      })),
    });
    setLoading(false);

    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    clearGuestData();
    toast.success("Data lokal berhasil dipindahkan ke akunmu");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pindahkan data lokal ke akun ini?</DialogTitle>
          <DialogDescription>
            Kamu punya dompet & transaksi dari mode tanpa akun, tersimpan di
            browser ini. Pindahkan supaya tidak hilang kalau cache dibersihkan
            dan bisa diakses dari perangkat lain.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onDone} disabled={loading}>
            Nanti Saja
          </Button>
          <Button onClick={migrate} disabled={loading}>
            {loading ? "Memindahkan..." : "Pindahkan Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
