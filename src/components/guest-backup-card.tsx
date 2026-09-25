"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadGuestDataJson,
  readGuestBackup,
  restoreGuestBackup,
  type GuestData,
} from "@/lib/guest-store";

// Satu-satunya cara memindahkan data mode tanpa akun ke perangkat lain
// (selain daftar akun), karena datanya hanya ada di localStorage.
export function GuestBackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<GuestData | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = readGuestBackup(await file.text());
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setPending(result.data);
  }

  function confirmRestore() {
    if (!pending) return;
    restoreGuestBackup(pending);
    setPending(null);
    toast.success("Data berhasil dipulihkan dari cadangan");
  }

  return (
    <Card className="lg:col-span-2">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="min-w-0 max-w-xl space-y-1">
          <p className="font-medium">Cadangan data</p>
          <p className="text-sm text-muted-foreground">
            Data mode tanpa akun cuma tersimpan di browser ini. Unduh cadangan
            sebelum ganti perangkat atau membersihkan browser, lalu pulihkan
            di perangkat baru.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadGuestDataJson()}>
            <Download /> Unduh Cadangan
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload /> Pulihkan dari File
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={onFile}
          />
        </div>
      </CardContent>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pulihkan dari cadangan?</DialogTitle>
            <DialogDescription>
              File ini berisi {pending?.wallets.length ?? 0} dompet,{" "}
              {pending?.categories.length ?? 0} kategori, dan{" "}
              {pending?.transactions.length ?? 0} transaksi. Semua data mode
              tanpa akun di browser ini akan diganti dengan isi file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Batal
            </Button>
            <Button onClick={confirmRestore}>Ganti dengan Cadangan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
