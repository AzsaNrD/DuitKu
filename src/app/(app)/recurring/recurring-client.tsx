"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { CategoryIcon } from "@/components/category-icon";
import {
  createRecurring,
  updateRecurring,
  toggleRecurring,
  deleteRecurring,
} from "@/actions/recurring";
import { recurringSchema, type RecurringInput } from "@/lib/zod-schemas";
import { formatIDR, formatDate, todayString } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RecurringRow } from "@/db/queries";
import type { Category, Wallet } from "@/db/schema";

const FREQUENCY_LABELS = {
  daily: "Setiap hari",
  weekly: "Setiap minggu",
  monthly: "Setiap bulan",
} as const;

export function RecurringClient({
  rules,
  wallets,
  categories,
}: {
  rules: RecurringRow[];
  wallets: Wallet[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRow | null>(null);
  const [deleting, setDeleting] = useState<RecurringRow | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    const res = await deleteRecurring(deleting.id);
    if (res.success) toast.success("Jadwal dihapus");
    setDeleting(null);
  }

  async function handleToggle(rule: RecurringRow) {
    const res = await toggleRecurring(rule.id, !rule.active);
    if (res.success)
      toast.success(rule.active ? "Jadwal dijeda" : "Jadwal diaktifkan");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transaksi Berulang</h1>
          <p className="text-sm text-muted-foreground">
            Gaji, langganan, cicilan — tercatat otomatis sesuai jadwal
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={wallets.length === 0}
        >
          <Plus /> Tambah
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Belum ada jadwal berulang. Contoh: gaji bulanan, langganan
            streaming, atau cicilan — sekali diatur, transaksinya tercatat
            otomatis setiap periode.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {rules.map((rule) => {
              const isTransfer = rule.type === "transfer";
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    !rule.active && "opacity-50"
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{
                      backgroundColor: isTransfer
                        ? "#64748b"
                        : (rule.categoryColor ?? "#737373"),
                    }}
                  >
                    {isTransfer ? (
                      <ArrowLeftRight className="h-4 w-4" />
                    ) : rule.categoryIcon ? (
                      <CategoryIcon
                        icon={rule.categoryIcon}
                        className="h-4 w-4"
                      />
                    ) : (
                      <Repeat className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {isTransfer
                        ? `Transfer: ${rule.walletName} → ${rule.transferToWalletName ?? "?"}`
                        : (rule.categoryName ?? "Tanpa Kategori")}
                      {rule.note && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {rule.note}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {FREQUENCY_LABELS[rule.frequency]}
                      {!isTransfer && ` · ${rule.walletName}`}
                      {rule.active &&
                        ` · berikutnya: ${formatDate(rule.nextRun)}`}
                    </p>
                  </div>
                  {!rule.active && <Badge variant="secondary">Dijeda</Badge>}
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      rule.type === "income" &&
                        "text-green-600 dark:text-green-400",
                      rule.type === "expense" &&
                        "text-red-600 dark:text-red-400"
                    )}
                  >
                    {rule.type === "income"
                      ? "+"
                      : rule.type === "expense"
                        ? "-"
                        : ""}
                    {formatIDR(Number(rule.amount))}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={rule.active ? "Jeda" : "Aktifkan"}
                      onClick={() => handleToggle(rule)}
                    >
                      {rule.active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(rule);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(rule)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {open && (
        <RecurringFormDialog
          open={open}
          onOpenChange={setOpen}
          wallets={wallets}
          categories={categories}
          editing={editing}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus jadwal berulang?</DialogTitle>
            <DialogDescription>
              Jadwal {formatIDR(Number(deleting?.amount ?? 0))} (
              {deleting ? FREQUENCY_LABELS[deleting.frequency] : ""}) akan
              dihapus. Transaksi yang sudah tercatat tidak ikut terhapus.
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

function RecurringFormDialog({
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
  editing: RecurringRow | null;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: editing
      ? {
          type: editing.type,
          amount: Number(editing.amount),
          walletId: editing.walletId,
          categoryId: editing.categoryId ?? undefined,
          transferToWalletId: editing.transferToWalletId ?? undefined,
          frequency: editing.frequency,
          startDate: editing.startDate,
          note: editing.note ?? "",
        }
      : {
          type: "expense",
          amount: undefined,
          walletId: wallets[0]?.id ?? "",
          categoryId: undefined,
          transferToWalletId: undefined,
          frequency: "monthly",
          startDate: todayString(),
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
  const frequencyItems = [
    { value: "daily", label: "Setiap hari" },
    { value: "weekly", label: "Setiap minggu" },
    { value: "monthly", label: "Setiap bulan" },
  ];

  async function onSubmit(data: RecurringInput) {
    const res = editing
      ? await updateRecurring(editing.id, data)
      : await createRecurring(data);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(editing ? "Jadwal diperbarui" : "Jadwal dibuat");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Jadwal Berulang" : "Jadwal Berulang Baru"}
          </DialogTitle>
          <DialogDescription>
            Transaksi akan dicatat otomatis setiap periode, dimulai dari
            tanggal mulai.
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
            <Label htmlFor="rec-amount">Jumlah (Rp)</Label>
            <AmountInput
              id="rec-amount"
              min={1}
              placeholder="cth: 5.000.000"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Frekuensi</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select
                    items={frequencyItems}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyItems.map((item) => (
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
              <Label htmlFor="rec-start">Mulai Tanggal</Label>
              <Input id="rec-start" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-sm text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rec-note">Catatan (opsional)</Label>
            <Input
              id="rec-note"
              placeholder="cth: gaji bulanan, Netflix"
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
