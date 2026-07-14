"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actionToast } from "@/lib/action-toast";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
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
import { AmountInput } from "@/components/amount-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthNav } from "@/components/month-nav";
import { BudgetProgressItem } from "@/components/budget-progress";
import { upsertBudget, deleteBudget } from "@/actions/budgets";
import { budgetSchema, type BudgetInput } from "@/lib/zod-schemas";
import { formatMonth } from "@/lib/format";
import type { BudgetWithProgress } from "@/db/queries";
import type { Category } from "@/db/schema";

export function BudgetsClient({
  budgets,
  categories,
  month,
}: {
  budgets: BudgetWithProgress[];
  categories: Category[];
  month: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetWithProgress | null>(null);
  const [deleting, setDeleting] = useState<BudgetWithProgress | null>(null);

  // kategori yang belum punya budget bulan ini (untuk form tambah)
  const usedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = categories.filter(
    (c) => !usedCategoryIds.has(c.id)
  );

  function handleDelete() {
    if (!deleting) return;
    setDeleting(null);
    actionToast(deleteBudget(deleting.id), {
      loading: "Menghapus budget...",
      success: "Budget dihapus",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">
            Batasi pengeluaran per kategori supaya lebih hemat
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthNav month={month} />
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            disabled={availableCategories.length === 0}
          >
            <Plus /> Set Budget
          </Button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Target}
              title={`Belum ada budget untuk ${formatMonth(month)}`}
              description="Tentukan batas pengeluaran per kategori — indikatornya berubah warna saat mendekati limit, jadi kamu tahu kapan harus rem."
              action={
                availableCategories.length > 0 ? (
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setOpen(true);
                    }}
                  >
                    <Plus /> Set Budget Pertama
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y py-2">
            {budgets.map((budget) => (
              <BudgetProgressItem
                key={budget.id}
                budget={budget}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditing(budget);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDeleting(budget)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {open && (
        <BudgetFormDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          categories={editing ? categories : availableCategories}
          month={month}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus budget?</DialogTitle>
            <DialogDescription>
              Budget kategori &quot;{deleting?.categoryName}&quot; untuk{" "}
              {formatMonth(month)} akan dihapus.
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

function BudgetFormDialog({
  open,
  onOpenChange,
  editing,
  categories,
  month,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: BudgetWithProgress | null;
  categories: Category[];
  month: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: editing
      ? {
          categoryId: editing.categoryId,
          month: editing.month,
          amount: editing.amount,
        }
      : { categoryId: "", month, amount: undefined },
  });

  const categoryItems = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  function onSubmit(data: BudgetInput) {
    onOpenChange(false);
    actionToast(upsertBudget(data), {
      loading: "Menyimpan budget...",
      success: "Budget disimpan",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Budget" : "Set Budget"} — {formatMonth(month)}
          </DialogTitle>
          <DialogDescription>
            Tentukan batas pengeluaran untuk satu kategori dalam sebulan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("month")} />
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  items={categoryItems}
                  value={field.value || null}
                  onValueChange={(v) => field.onChange(v ?? "")}
                  disabled={!!editing}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih kategori pengeluaran" />
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
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Batas Pengeluaran (Rp)</Label>
            <AmountInput
              id="budget-amount"
              min={1}
              placeholder="cth: 1.000.000"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
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
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
