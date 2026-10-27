"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { QuickAmounts } from "@/components/quick-amounts";
import { CategoryIcon } from "@/components/category-icon";
import { clearSnackPlan, saveSnackPlan } from "@/actions/snack";
import { actionToast } from "@/lib/action-toast";
import { snackPlanSchema, type SnackPlanInput } from "@/lib/zod-schemas";
import { cn } from "@/lib/utils";

export type SnackCategoryOption = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

// Ikon kategori yang biasanya dianggap jajan (makan, kopi, hiburan, belanja
// online). Dipakai hanya untuk mencentang awal saat belum ada pengaturan.
const SUGGESTED_ICONS = new Set([
  "utensils",
  "coffee",
  "gamepad-2",
  "clapperboard",
  "shopping-cart",
]);

export function SnackSettingsButton({
  categories,
  plan,
  label,
  variant = "ghost",
  size = "sm",
}: {
  categories: SnackCategoryOption[];
  plan: { limit: number; categoryIds: string[] } | null;
  label: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Dialog dilepas dari pohon saat ditutup, jadi fokus keyboard tidak
  // otomatis kembali ke tombol pembuka. Dikembalikan di sini supaya
  // pengguna keyboard tidak kehilangan posisinya.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="max-sm:min-h-11"
      >
        {label}
      </Button>
      {open && (
        <SnackSettingsDialog
          open={open}
          onOpenChange={handleOpenChange}
          categories={categories}
          plan={plan}
        />
      )}
    </>
  );
}

function SnackSettingsDialog({
  open,
  onOpenChange,
  categories,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: SnackCategoryOption[];
  plan: { limit: number; categoryIds: string[] } | null;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SnackPlanInput>({
    resolver: zodResolver(snackPlanSchema),
    defaultValues: {
      monthlyLimit: plan?.limit,
      categoryIds: plan
        ? plan.categoryIds
        : categories.filter((c) => SUGGESTED_ICONS.has(c.icon)).map((c) => c.id),
    },
  });

  function onSubmit(data: SnackPlanInput) {
    onOpenChange(false);
    actionToast(saveSnackPlan(data), {
      loading: "Menyimpan jatah jajan...",
      success: plan ? "Jatah jajan diperbarui" : "Jatah jajan aktif",
    });
  }

  function onClear() {
    onOpenChange(false);
    actionToast(clearSnackPlan(), {
      loading: "Menghapus pengaturan...",
      success: "Jatah jajan dimatikan",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur jatah jajan</DialogTitle>
          <DialogDescription>
            Tentukan batas jajan sebulan dan kategori yang dihitung. Jatah
            harian dihitung dari sisa batas dibagi sisa hari.
          </DialogDescription>
        </DialogHeader>

        {categories.length === 0 ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Belum ada kategori pengeluaran, jadi belum ada yang bisa dihitung
              sebagai jajan. Buat kategori dulu, lalu atur jatahnya.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/categories" />}
              className="max-sm:min-h-11"
            >
              Buka Kategori
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="snack-limit">Batas jajan per bulan (Rp)</Label>
              <AmountInput
                id="snack-limit"
                placeholder="cth: 1.500.000"
                aria-invalid={!!errors.monthlyLimit}
                aria-describedby={
                  errors.monthlyLimit ? "snack-limit-error" : undefined
                }
                {...register("monthlyLimit")}
              />
              <QuickAmounts targetId="snack-limit" />
              {errors.monthlyLimit && (
                <p
                  id="snack-limit-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.monthlyLimit.message}
                </p>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Kategori yang dihitung jajan
              </legend>
              {!plan && (
                <p className="text-xs text-muted-foreground">
                  Kami centang dulu kategori yang biasanya masuk jajan. Ubah
                  sesuai kebiasaanmu.
                </p>
              )}
              <Controller
                control={control}
                name="categoryIds"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const selected = field.value.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            field.onChange(
                              selected
                                ? field.value.filter((id) => id !== c.id)
                                : [...field.value, c.id]
                            )
                          }
                          className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-9",
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background hover:bg-muted"
                          )}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
                            style={{ backgroundColor: c.color }}
                            aria-hidden="true"
                          >
                            <CategoryIcon icon={c.icon} className="h-3 w-3" />
                          </span>
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.categoryIds && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.categoryIds.message}
                </p>
              )}
            </fieldset>

            <DialogFooter className="max-sm:flex-col-reverse">
              {plan && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClear}
                  className="text-destructive max-sm:min-h-11 sm:mr-auto"
                >
                  Matikan jatah jajan
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="max-sm:min-h-11"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="max-sm:min-h-11"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
