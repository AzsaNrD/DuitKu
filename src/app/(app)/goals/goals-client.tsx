"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Minus,
  PartyPopper,
  Pencil,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
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
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/amount-input";
import { ColorPicker } from "@/components/color-picker";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  adjustGoalSavings,
} from "@/actions/goals";
import {
  goalSchema,
  goalSavingSchema,
  type GoalInput,
  type GoalSavingInput,
} from "@/lib/zod-schemas";
import { formatIDR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Goal } from "@/db/schema";

export function GoalsClient({ goals }: { goals: Goal[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [saving, setSaving] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    const res = await deleteGoal(deleting.id);
    if (res.success) toast.success("Impian dihapus");
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Impian</h1>
          <p className="text-sm text-muted-foreground">
            Target nabung untuk hal yang kamu inginkan — catat progresnya di
            sini
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus /> Impian Baru
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Sparkles}
              title="Belum ada impian"
              description="Mouse baru? HP baru? Liburan? Tentukan targetnya, nabung sedikit demi sedikit, dan rayakan saat tercapai 🎉"
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus /> Buat Impian Pertama
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {goals.map((goal) => {
            const target = Number(goal.targetAmount);
            const saved = Number(goal.savedAmount);
            const pct = target > 0 ? (saved / target) * 100 : 0;
            const done = saved >= target;
            return (
              <Card
                key={goal.id}
                className={cn(
                  "transition-all hover:-translate-y-0.5 hover:shadow-md",
                  done && "border-green-500"
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: goal.color }}
                    >
                      {done ? (
                        <PartyPopper className="h-5 w-5" />
                      ) : (
                        <PiggyBank className="h-5 w-5" />
                      )}
                    </span>
                    <div>
                      <CardTitle className="text-base">{goal.name}</CardTitle>
                      {goal.targetDate && (
                        <p className="text-xs text-muted-foreground">
                          target: {formatDate(goal.targetDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(goal);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(goal)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-lg font-bold">
                        {formatIDR(saved)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        dari {formatIDR(target)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: done ? "#22c55e" : goal.color,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.floor(pct)}%
                      {!done && ` · kurang ${formatIDR(target - saved)}`}
                    </p>
                  </div>
                  {done ? (
                    <Badge className="bg-green-600 text-white">
                      🎉 Tercapai! Saatnya beli
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setSaving(goal)}
                    >
                      <PiggyBank /> Nabung
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {formOpen && (
        <GoalFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
        />
      )}

      {saving && (
        <SavingDialog
          open={!!saving}
          onOpenChange={(o) => !o && setSaving(null)}
          goal={saving}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus impian?</DialogTitle>
            <DialogDescription>
              Impian &quot;{deleting?.name}&quot; beserta catatan progresnya
              akan dihapus.
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

function GoalFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Goal | null;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          targetAmount: Number(editing.targetAmount),
          color: editing.color,
          targetDate: editing.targetDate ?? "",
        }
      : { name: "", targetAmount: undefined, color: "#6366f1", targetDate: "" },
  });

  async function onSubmit(data: GoalInput) {
    const res = editing
      ? await updateGoal(editing.id, data)
      : await createGoal(data);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(editing ? "Impian diperbarui" : "Impian dibuat — semangat nabung!");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Impian" : "Impian Baru"}</DialogTitle>
          <DialogDescription>
            Tentukan target, lalu catat setiap kali kamu menyisihkan uang.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nama</Label>
            <Input
              id="goal-name"
              placeholder="cth: Mouse gaming"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target (Rp)</Label>
              <AmountInput
                id="goal-target"
                min={1}
                placeholder="cth: 500.000"
                {...register("targetAmount")}
              />
              {errors.targetAmount && (
                <p className="text-sm text-destructive">
                  {errors.targetAmount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-date">Target Tanggal (opsional)</Label>
              <Input id="goal-date" type="date" {...register("targetDate")} />
            </div>
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

function SavingDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
}) {
  const [direction, setDirection] = useState<1 | -1>(1);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalSavingInput>({
    resolver: zodResolver(goalSavingSchema),
    defaultValues: { amount: undefined },
  });

  async function onSubmit(data: GoalSavingInput) {
    const res = await adjustGoalSavings(goal.id, data, direction);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      direction === 1 ? "Tabungan bertambah 💪" : "Tabungan dikurangi"
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nabung — {goal.name}</DialogTitle>
          <DialogDescription>
            Terkumpul {formatIDR(Number(goal.savedAmount))} dari{" "}
            {formatIDR(Number(goal.targetAmount))}. Catatan ini tidak mengubah
            saldo dompet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === 1 ? "default" : "outline"}
              onClick={() => setDirection(1)}
            >
              <Plus /> Tambah
            </Button>
            <Button
              type="button"
              variant={direction === -1 ? "default" : "outline"}
              onClick={() => setDirection(-1)}
            >
              <Minus /> Ambil
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="saving-amount">Jumlah (Rp)</Label>
            <AmountInput
              id="saving-amount"
              min={1}
              placeholder="cth: 50.000"
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
