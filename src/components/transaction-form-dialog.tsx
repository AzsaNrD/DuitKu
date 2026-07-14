"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actionToast } from "@/lib/action-toast";
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
import { todayString } from "@/lib/format";
import type { Category, Wallet, TransactionType } from "@/db/schema";

export type EditableTransaction = {
  id: string;
  type: TransactionType;
  amount: string | number;
  walletId: string;
  categoryId: string | null;
  transferToWalletId: string | null;
  date: string;
  note: string | null;
};

export function TransactionFormDialog({
  open,
  onOpenChange,
  wallets,
  categories,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: Pick<Wallet, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "type">[];
  editing?: EditableTransaction | null;
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
        }
      : {
          type: "expense",
          amount: undefined,
          walletId: wallets[0]?.id ?? "",
          categoryId: undefined,
          transferToWalletId: undefined,
          date: todayString(),
          note: "",
        },
  });

  const type = useWatch({ control, name: "type" });
  const walletId = useWatch({ control, name: "walletId" });

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
    actionToast(
      editing ? updateTransaction(editing.id, data) : createTransaction(data),
      {
        loading: "Menyimpan transaksi...",
        success: editing ? "Transaksi diperbarui" : "Transaksi dicatat",
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Transaksi" : "Catat Transaksi"}
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
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

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
