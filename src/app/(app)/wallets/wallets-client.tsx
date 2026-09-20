"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actionToast, type ActionResult } from "@/lib/action-toast";
import { Pencil, Plus, Scale, Trash2, Wallet as WalletIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AdjustBalanceDialog } from "@/components/adjust-balance-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ColorPicker } from "@/components/color-picker";
import { createWallet, updateWallet, deleteWallet } from "@/actions/wallets";
import {
  walletSchema,
  type AdjustBalanceInput,
  type WalletInput,
} from "@/lib/zod-schemas";
import { formatIDR } from "@/lib/format";
import {
  WALLET_TYPE_ICONS,
  WALLET_TYPE_LABELS,
  WALLET_TYPE_ORDER,
} from "@/lib/wallet-types";
import type { WalletWithBalance } from "@/db/queries";

// override untuk mode tanpa akun (localStorage): defaultnya action server
// asli, jadi halaman yang sudah ada (login) tidak perlu berubah sama sekali
export type WalletGuestActions = {
  createWallet: (input: WalletInput) => Promise<ActionResult>;
  updateWallet: (id: string, input: WalletInput) => Promise<ActionResult>;
  deleteWallet: (id: string) => Promise<ActionResult>;
  adjustWalletBalance: (
    id: string,
    input: AdjustBalanceInput
  ) => Promise<ActionResult>;
};

const TYPE_ITEMS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-Wallet" },
];

export function WalletsClient({
  wallets,
  guest,
}: {
  wallets: WalletWithBalance[];
  guest?: WalletGuestActions;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WalletWithBalance | null>(null);
  const [deleting, setDeleting] = useState<WalletWithBalance | null>(null);
  const [adjusting, setAdjusting] = useState<WalletWithBalance | null>(null);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const deleteWalletFn = guest?.deleteWallet ?? deleteWallet;

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(wallet: WalletWithBalance) {
    setEditing(wallet);
    setOpen(true);
  }

  function handleDelete() {
    if (!deleting) return;
    setDeleting(null);
    actionToast(deleteWalletFn(deleting.id), {
      loading: "Menghapus dompet...",
      success: "Dompet dihapus",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Dompet</h1>
          <p className="text-sm text-muted-foreground">
            Total saldo: <span className="money font-semibold text-foreground">{formatIDR(totalBalance)}</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Tambah
        </Button>
      </div>

      {wallets.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={WalletIcon}
              title="Belum ada dompet"
              description="Dompet adalah tempat uangmu berada: cash di saku, rekening bank, atau e-wallet. Tambahkan satu untuk mulai mencatat transaksi."
              action={
                <Button onClick={openCreate}>
                  <Plus /> Tambah Dompet Pertama
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-7">
          {WALLET_TYPE_ORDER.filter((type) =>
            wallets.some((w) => w.type === type)
          ).map((type) => {
            const group = wallets.filter((w) => w.type === type);
            const GroupIcon = WALLET_TYPE_ICONS[type];
            const subtotal = group.reduce((sum, w) => sum + w.balance, 0);
            return (
              <div key={type}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <GroupIcon className="h-4 w-4 text-muted-foreground" />
                    {WALLET_TYPE_LABELS[type]}
                    <span className="font-normal text-muted-foreground">
                      ({group.length})
                    </span>
                  </div>
                  <span className="money text-sm font-semibold text-muted-foreground">
                    {formatIDR(subtotal)}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                  {group.map((wallet) => (
                    <Card
                      key={wallet.id}
                      className="transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
                            style={{ backgroundColor: wallet.color }}
                          >
                            <GroupIcon className="h-5 w-5" />
                          </span>
                          <CardTitle className="text-base">
                            {wallet.name}
                          </CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Sesuaikan saldo"
                            onClick={() => setAdjusting(wallet)}
                          >
                            <Scale className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit dompet"
                            onClick={() => openEdit(wallet)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus dompet"
                            onClick={() => setDeleting(wallet)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="money text-2xl font-bold">
                          {formatIDR(wallet.balance)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <WalletFormDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          guest={guest}
        />
      )}

      {adjusting && (
        <AdjustBalanceDialog
          open={!!adjusting}
          onOpenChange={(o) => !o && setAdjusting(null)}
          wallet={adjusting}
          adjustAction={guest?.adjustWalletBalance}
        />
      )}

      {/* Konfirmasi hapus */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus dompet?</DialogTitle>
            <DialogDescription>
              Dompet &quot;{deleting?.name}&quot; beserta{" "}
              <strong>semua transaksinya</strong> akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WalletFormDialog({
  open,
  onOpenChange,
  editing,
  guest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: WalletWithBalance | null;
  guest?: WalletGuestActions;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WalletInput>({
    resolver: zodResolver(walletSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          type: editing.type,
          initialBalance: Number(editing.initialBalance),
          color: editing.color,
        }
      : { name: "", type: "cash", initialBalance: 0, color: "#6366f1" },
  });

  function onSubmit(data: WalletInput) {
    onOpenChange(false);
    const createFn = guest?.createWallet ?? createWallet;
    const updateFn = guest?.updateWallet ?? updateWallet;
    actionToast(editing ? updateFn(editing.id, data) : createFn(data), {
      loading: "Menyimpan dompet...",
      success: editing ? "Dompet diperbarui" : "Dompet ditambahkan",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Dompet" : "Tambah Dompet"}</DialogTitle>
          <DialogDescription>
            Dompet adalah tempat uangmu berada: cash, rekening bank, atau
            e-wallet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet-name">Nama</Label>
            <Input
              id="wallet-name"
              placeholder="cth: Cash, BCA, GoPay"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Tipe</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  items={TYPE_ITEMS}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-balance">Saldo Awal (Rp)</Label>
            <AmountInput
              id="wallet-balance"
              min={0}
              {...register("initialBalance")}
            />
            {errors.initialBalance && (
              <p className="text-sm text-destructive">
                {errors.initialBalance.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Warna</Label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorPicker value={field.value} onChange={field.onChange} />
              )}
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
