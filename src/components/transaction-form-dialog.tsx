"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { QuickAmounts } from "@/components/quick-amounts";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createTransaction,
  updateTransaction,
} from "@/actions/transactions";
import { transactionSchema, type TransactionInput } from "@/lib/zod-schemas";
import { formatIDR, todayString } from "@/lib/format";
import { FEE_PRESETS } from "@/lib/fee";
import type { Category, Wallet, TransactionType } from "@/db/schema";

// override untuk mode tanpa akun (localStorage) — defaultnya action server
// asli, jadi halaman yang sudah ada (login) tidak perlu berubah sama sekali
export type TransactionGuestActions = {
  createTransaction: (input: TransactionInput) => Promise<ActionResult>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<ActionResult>;
};

export type EditableTransaction = {
  id: string;
  // "adjustment" tidak pernah dibuka lewat form ini (lihat R-26: tombol edit
  // disembunyikan untuk baris penyesuaian di transactions-client.tsx)
  type: Exclude<TransactionType, "adjustment">;
  amount: string | number;
  walletId: string;
  categoryId: string | null;
  transferToWalletId: string | null;
  date: string;
  note: string | null;
  // biaya admin yang menempel di transaksi ini (0 = tidak ada)
  fee?: number;
};

// Isian awal untuk transaksi baru (bukan edit), mis. tombol Transfer di
// kartu dompet yang langsung memilih dompet asalnya
export type TransactionPreset = {
  type?: Exclude<TransactionType, "adjustment">;
  walletId?: string;
  transferToWalletId?: string;
};

export function TransactionFormDialog({
  open,
  onOpenChange,
  wallets,
  categories,
  editing,
  preset,
  guest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: Pick<Wallet, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "type">[];
  editing?: EditableTransaction | null;
  preset?: TransactionPreset;
  guest?: TransactionGuestActions;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: editing
      ? {
          type: editing.type,
          amount: Number(editing.amount),
          walletId: editing.walletId,
          categoryId: editing.categoryId ?? undefined,
          transferToWalletId: editing.transferToWalletId ?? undefined,
          date: editing.date,
          note: editing.note ?? "",
          fee: editing.fee ? editing.fee : undefined,
        }
      : {
          type: preset?.type ?? "expense",
          amount: undefined,
          walletId: preset?.walletId ?? wallets[0]?.id ?? "",
          categoryId: undefined,
          transferToWalletId: preset?.transferToWalletId,
          date: todayString(),
          note: "",
          fee: undefined,
        },
  });

  // Biaya admin jarang dipakai di pengeluaran tunai, jadi disembunyikan
  // sampai dibutuhkan. Terbuka otomatis kalau sedang mengedit transaksi yang
  // punya biaya, atau saat memilih Transfer.
  const [feeOpen, setFeeOpen] = useState(
    !!editing?.fee || preset?.type === "transfer"
  );
  const type = useWatch({ control, name: "type" });
  const walletId = useWatch({ control, name: "walletId" });
  const amountText = useWatch({ control, name: "amount" });
  const feeText = useWatch({ control, name: "fee" });

  // nominal diketik dengan titik ribuan ("2.500"), jadi dibersihkan dulu
  const toNumber = (v: unknown) => Number(String(v ?? "").replace(/\D/g, "")) || 0;
  const feeAmount = toNumber(feeText);
  const totalOut = toNumber(amountText) + feeAmount;
  const sourceWalletName = wallets.find((w) => w.id === walletId)?.name;

  const filteredCategories = categories.filter((c) =>
    type === "income" ? c.type === "income" : c.type === "expense"
  );
  const walletItems = wallets.map((w) => ({ value: w.id, label: w.name }));
  const categoryItems = filteredCategories.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const transferTargetItems = wallets
    .filter((w) => w.id !== walletId)
    .map((w) => ({ value: w.id, label: w.name }));

  function onSubmit(data: TransactionInput) {
    // tutup dialog seketika; proses berjalan di latar dengan toast
    onOpenChange(false);
    const createFn = guest?.createTransaction ?? createTransaction;
    const updateFn = guest?.updateTransaction ?? updateTransaction;
    actionToast(
      editing ? updateFn(editing.id, data) : createFn(data),
      {
        loading: "Menyimpan transaksi...",
        success: editing ? "Transaksi diperbarui" : "Transaksi dicatat",
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? "Edit Transaksi"
              : preset?.type === "transfer"
                ? "Transfer Antar Dompet"
                : "Catat Transaksi"}
          </DialogTitle>
          <DialogDescription>
            Catat uang masuk, keluar, atau transfer antar dompet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Tabs
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  // reset pilihan yang tidak relevan dengan tipe baru
                  setValue("categoryId", undefined);
                  setValue("transferToWalletId", undefined);
                  // biaya admin tidak berlaku untuk pemasukan
                  if (v === "income") setValue("fee", undefined);
                  // transfer paling sering kena biaya
                  if (v === "transfer") setFeeOpen(true);
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="expense" className="flex-1">
                    Keluar
                  </TabsTrigger>
                  <TabsTrigger value="income" className="flex-1">
                    Masuk
                  </TabsTrigger>
                  <TabsTrigger value="transfer" className="flex-1">
                    Transfer
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="tx-amount">Jumlah (Rp)</Label>
            <AmountInput
              id="tx-amount"
              min={1}
              placeholder="cth: 25.000"
              {...register("amount")}
            />
            <QuickAmounts targetId="tx-amount" />
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          {type !== "income" && !feeOpen && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mt-2 justify-start text-muted-foreground"
              onClick={() => setFeeOpen(true)}
            >
              <Plus /> Biaya admin
            </Button>
          )}
          {type !== "income" && feeOpen && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tx-fee">Biaya admin (opsional)</Label>
                <button
                  type="button"
                  onClick={() => {
                    setValue("fee", undefined);
                    setFeeOpen(false);
                  }}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline max-sm:py-2"
                >
                  Sembunyikan
                </button>
              </div>
              <AmountInput
                id="tx-fee"
                min={0}
                placeholder="cth: 2.500"
                {...register("fee")}
              />
              <QuickAmounts targetId="tx-fee" presets={FEE_PRESETS} replace />
              {errors.fee && (
                <p className="text-sm text-destructive">{errors.fee.message}</p>
              )}
              {feeAmount > 0 && sourceWalletName && (
                <p className="text-xs text-muted-foreground">
                  Total keluar dari {sourceWalletName}:{" "}
                  <span className="money font-medium text-foreground">
                    {formatIDR(totalOut)}
                  </span>
                  . Biaya dicatat sebagai pengeluaran Biaya Admin.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{type === "transfer" ? "Dari Dompet" : "Dompet"}</Label>
            <Controller
              control={control}
              name="walletId"
              render={({ field }) => (
                <Select
                  items={walletItems}
                  value={field.value || null}
                  onValueChange={(v) => field.onChange(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih dompet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.walletId && (
              <p className="text-sm text-destructive">
                {errors.walletId.message}
              </p>
            )}
          </div>

          {type === "transfer" ? (
            <div className="space-y-2">
              <Label>Ke Dompet</Label>
              <Controller
                control={control}
                name="transferToWalletId"
                render={({ field }) => (
                  <Select
                    items={transferTargetItems}
                    value={field.value || null}
                    onValueChange={(v) => field.onChange(v ?? undefined)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih dompet tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {transferTargetItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.transferToWalletId && (
                <p className="text-sm text-destructive">
                  {errors.transferToWalletId.message}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    items={categoryItems}
                    value={field.value || null}
                    onValueChange={(v) => field.onChange(v ?? undefined)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-sm text-destructive">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tx-date">Tanggal</Label>
            <Input id="tx-date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-note">Catatan (opsional)</Label>
            <Input
              id="tx-note"
              placeholder="cth: makan siang di warteg"
              {...register("note")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
