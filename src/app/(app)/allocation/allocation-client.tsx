"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings2 } from "lucide-react";
import { actionToast } from "@/lib/action-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/amount-input";
import { MonthNav } from "@/components/month-nav";
import {
  AllocationBucketRow,
  AllocationSplitBar,
} from "@/components/allocation-progress";
import {
  applyAllocationPreset,
  clearAllocationIncomeOverride,
  deleteAllocationPlan,
  setAllocationIncomeOverride,
} from "@/actions/allocation";
import { ALLOCATION_PRESETS } from "@/lib/allocation-presets";
import {
  allocationOverrideSchema,
  type AllocationOverrideInput,
} from "@/lib/zod-schemas";
import { formatIDR, formatMonth } from "@/lib/format";
import type { AllocationOverview, AllocationPlan } from "@/db/queries";
import type { Category, Wallet } from "@/db/schema";
import {
  AllocationSettingsDialog,
  CUSTOM_STARTER,
  type SettingsTab,
} from "./allocation-settings";

export function AllocationClient({
  month,
  overview,
  plan,
  expenseCategories,
  incomeCategories,
  wallets,
}: {
  month: string;
  overview: AllocationOverview;
  plan: AllocationPlan;
  expenseCategories: Category[];
  incomeCategories: Category[];
  wallets: Wallet[];
}) {
  const [settings, setSettings] = useState<SettingsTab | null>(null);
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const pending = ALLOCATION_PRESETS.find((p) => p.id === pendingPreset);

  function applyPreset(presetId: string) {
    const preset = ALLOCATION_PRESETS.find((p) => p.id === presetId);
    actionToast(applyAllocationPreset(presetId), {
      loading: "Menerapkan preset...",
      success: `Preset ${preset?.label ?? ""} diterapkan`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Alokasi</h1>
          <p className="text-sm text-muted-foreground">
            Bagi pemasukan ke pos kebutuhan, keinginan, dan tabungan
          </p>
        </div>
        {overview.hasPlan && (
          <div className="flex items-center gap-2">
            <MonthNav month={month} />
            <Button variant="outline" onClick={() => setSettings("buckets")}>
              <Settings2 /> Atur
            </Button>
          </div>
        )}
      </div>

      {overview.hasPlan ? (
        <>
          <IncomeCard
            month={month}
            overview={overview}
            incomeCategories={incomeCategories}
            incomeCategoryIds={plan.incomeCategoryIds}
            onEditOverride={() => setOverrideOpen(true)}
            onPickCategories={() => setSettings("income")}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rencana vs Realisasi</CardTitle>
            </CardHeader>
            <CardContent className="divide-y pt-0">
              {overview.buckets.map((bucket) => (
                <AllocationBucketRow key={bucket.id} bucket={bucket} />
              ))}
            </CardContent>
          </Card>

          {overview.unmapped.total > 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">
                    Belum masuk pos:{" "}
                    <span className="money">
                      {formatIDR(overview.unmapped.total)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dari {overview.unmapped.items.map((i) => i.name).join(", ")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings("categories")}
                >
                  Petakan Kategori
                </Button>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Pembagian ini aturan umum, sesuaikan dengan kondisimu. Tabungan
            dihitung dari transfer ke dan dari dompet tabungan.
          </p>
        </>
      ) : (
        <PresetPicker
          onPick={applyPreset}
          onCustom={() => setSettings("buckets")}
        />
      )}

      {settings && (
        <AllocationSettingsDialog
          open={!!settings}
          onOpenChange={(o) => !o && setSettings(null)}
          initialTab={settings}
          plan={plan}
          starter={overview.hasPlan ? undefined : CUSTOM_STARTER}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          wallets={wallets}
          onRequestPreset={(id) => {
            setSettings(null);
            setPendingPreset(id);
          }}
          onRequestDelete={() => {
            setSettings(null);
            setConfirmDelete(true);
          }}
        />
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus rencana alokasi?</DialogTitle>
            <DialogDescription>
              Semua pos, pemetaan kategori dan dompet tabungan, pilihan
              kategori pemasukan, serta nominal manual akan dihapus. Transaksi,
              kategori, dan dompet tidak ikut terhapus. Kamu bisa membuat
              rencana baru kapan saja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                actionToast(deleteAllocationPlan(), {
                  loading: "Menghapus rencana...",
                  success: "Rencana alokasi dihapus",
                });
              }}
            >
              Hapus Rencana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {overrideOpen && (
        <OverrideDialog
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          month={month}
          current={overview.income.used}
        />
      )}

      <Dialog
        open={!!pendingPreset}
        onOpenChange={(o) => !o && setPendingPreset(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti ke preset {pending?.label}?</DialogTitle>
            <DialogDescription>
              Pos dan pemetaan kategori serta dompet tabungan yang sekarang
              akan diganti. Pilihan kategori pemasukan dan nominal manual tetap
              tersimpan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingPreset(null)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (pendingPreset) applyPreset(pendingPreset);
                setPendingPreset(null);
              }}
            >
              Ganti Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IncomeCard({
  month,
  overview,
  incomeCategories,
  incomeCategoryIds,
  onEditOverride,
  onPickCategories,
}: {
  month: string;
  overview: AllocationOverview;
  incomeCategories: Category[];
  incomeCategoryIds: string[];
  onEditOverride: () => void;
  onPickCategories: () => void;
}) {
  const { income } = overview;
  const sourceNames = incomeCategories
    .filter((c) => incomeCategoryIds.includes(c.id))
    .map((c) => c.name);

  function resetOverride() {
    actionToast(clearAllocationIncomeOverride(month), {
      loading: "Mengembalikan...",
      success: "Kembali memakai hitungan otomatis",
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pemasukan {formatMonth(month)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="money text-3xl font-bold tracking-tight">
              {formatIDR(income.used)}
            </p>
            <p className="text-xs text-muted-foreground">
              {income.override !== null
                ? `Diketik manual (hitungan otomatis: ${formatIDR(income.auto)})`
                : sourceNames.length > 0
                  ? `Otomatis dari kategori ${sourceNames.join(", ")}`
                  : "Belum ada kategori pemasukan yang dipilih"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {income.override !== null && (
              <Button variant="ghost" size="sm" onClick={resetOverride}>
                Pakai Otomatis
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEditOverride}>
              Ketik Manual
            </Button>
          </div>
        </div>

        {income.used === 0 && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            {sourceNames.length === 0 ? (
              <>
                Pilih kategori pemasukan yang dijadikan dasar pembagian.{" "}
                <button
                  type="button"
                  onClick={onPickCategories}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Pilih kategori
                </button>
              </>
            ) : (
              "Belum ada pemasukan dari kategori terpilih bulan ini. Catat pemasukannya dulu, atau ketik nominalnya manual."
            )}
          </p>
        )}

        <AllocationSplitBar buckets={overview.buckets} />
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {overview.buckets.map((b) => (
            <span key={b.id} className="flex items-center gap-1.5 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: b.color }}
              />
              {b.name}{" "}
              <span className="money font-medium">{formatIDR(b.planned)}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PresetPicker({
  onPick,
  onCustom,
}: {
  onPick: (presetId: string) => void;
  onCustom: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {ALLOCATION_PRESETS.map((preset) => (
          <Card key={preset.id} className="flex flex-col">
            <CardHeader className="space-y-3 pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {preset.label}
              </CardTitle>
              <AllocationSplitBar buckets={preset.buckets} />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-1.5">
                {preset.buckets.map((b) => (
                  <li
                    key={b.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      {b.name}
                    </span>
                    <span className="text-muted-foreground">{b.percent}%</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {preset.description}
              </p>
              <Button className="mt-auto" onClick={() => onPick(preset.id)}>
                Pakai {preset.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Mau bikin pembagian sendiri?</p>
            <p className="text-xs text-muted-foreground">
              Tentukan nama pos dan persentasenya sesuai kebutuhanmu. Preset di
              atas juga tetap bisa diubah setelah dipakai.
            </p>
          </div>
          <Button variant="outline" onClick={onCustom}>
            Buat Sendiri
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Pembagian ini aturan umum, sesuaikan dengan kondisimu.
      </p>
    </div>
  );
}

function OverrideDialog({
  open,
  onOpenChange,
  month,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  current: number;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AllocationOverrideInput>({
    resolver: zodResolver(allocationOverrideSchema),
    defaultValues: { month, amount: current },
  });

  function onSubmit(data: AllocationOverrideInput) {
    onOpenChange(false);
    actionToast(setAllocationIncomeOverride(data), {
      loading: "Menyimpan...",
      success: "Nominal pemasukan disimpan",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pemasukan {formatMonth(month)}</DialogTitle>
          <DialogDescription>
            Nominal ini dipakai untuk bulan {formatMonth(month)} saja,
            menggantikan hitungan otomatis dari transaksi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("month")} />
          <div className="space-y-2">
            <Label htmlFor="override-amount">Pemasukan (Rp)</Label>
            <AmountInput id="override-amount" min={0} {...register("amount")} />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
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
            <Button type="submit" disabled={isSubmitting}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
