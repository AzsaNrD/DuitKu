"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actionToast } from "@/lib/action-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountInput } from "@/components/amount-input";
import { QuickAmounts } from "@/components/quick-amounts";
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
import { formatIDR, formatDate, formatMonth } from "@/lib/format";
import type { GoalPace } from "@/lib/goal-pace";
import { cn } from "@/lib/utils";
import type { GoalWithProgress } from "@/db/queries";
import type { Wallet } from "@/db/schema";

const MANUAL = "__manual__";

export function GoalsClient({
  goals,
  wallets,
  paces,
  paceUnit,
}: {
  goals: GoalWithProgress[];
  wallets: Wallet[];
  // panduan laju per impian (id impian -> hasil hitung di server)
  paces: Record<string, GoalPace>;
  // satuan kebutuhan: "gajian" kalau tanggal gajian diatur, selain itu "bulan"
  paceUnit: "gajian" | "bulan";
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalWithProgress | null>(null);
  const [saving, setSaving] = useState<GoalWithProgress | null>(null);
  const [deleting, setDeleting] = useState<GoalWithProgress | null>(null);

  function handleDelete() {
    if (!deleting) return;
    setDeleting(null);
    actionToast(deleteGoal(deleting.id), {
      loading: "Menghapus impian...",
      success: "Impian dihapus",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Impian</h1>
          <p className="text-sm text-muted-foreground">
            Target nabung untuk hal yang kamu inginkan. Progresnya bisa ikut
            saldo dompet tabungan, atau dicatat manual.
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
            const saved = goal.saved;
            const pct = target > 0 ? (saved / target) * 100 : 0;
            const done = saved >= target;
            return (
              <Card
                key={goal.id}
                className={cn(
                  "transition-all hover:-translate-y-0.5 hover:shadow-md",
                  done && "border-income"
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
                      aria-label={`Edit impian ${goal.name}`}
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
                      aria-label={`Hapus impian ${goal.name}`}
                      onClick={() => setDeleting(goal)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="money text-lg font-bold">
                        {formatIDR(saved)}
                      </span>
                      <span className="money text-xs text-muted-foreground">
                        dari {formatIDR(target)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: done ? "var(--income)" : goal.color,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.floor(pct)}%
                      {!done && ` · kurang ${formatIDR(target - saved)}`}
                    </p>
                  </div>
                  {goal.walletId && (
                    <p className="text-xs text-muted-foreground">
                      Progres mengikuti saldo dompet{" "}
                      <span className="font-medium text-foreground">
                        {goal.walletName}
                      </span>
                    </p>
                  )}
                  {!done && paces[goal.id] && (
                    <PaceNote pace={paces[goal.id]} unit={paceUnit} />
                  )}
                  {done ? (
                    <Badge className="bg-income text-background">
                      🎉 Tercapai! Saatnya beli
                    </Badge>
                  ) : (
                    !goal.walletId && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => setSaving(goal)}
                      >
                        <PiggyBank /> Nabung
                      </Button>
                    )
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
          wallets={wallets}
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

// Panduan laju: berapa yang perlu disisihkan supaya sampai tanggal target, dan
// kapan tercapai kalau lajunya sama dengan 60 hari terakhir.
function PaceNote({ pace, unit }: { pace: GoalPace; unit: "gajian" | "bulan" }) {
  const lines: { key: string; tone: "good" | "warn" | "info"; node: React.ReactNode }[] = [];

  if (pace.targetPassed) {
    lines.push({
      key: "passed",
      tone: "warn",
      node: "Tanggal target sudah lewat. Ubah tanggalnya kalau masih ingin dikejar.",
    });
  } else if (pace.needPerPayday !== null) {
    lines.push({
      key: "need",
      tone: "info",
      node:
        pace.paydaysLeft && pace.paydaysLeft >= 1 ? (
          <>
            Perlu{" "}
            <span className="money font-medium text-foreground">
              {formatIDR(pace.needPerPayday)}
            </span>{" "}
            per {unit}, {pace.paydaysLeft} {unit} lagi sampai tanggal target.
          </>
        ) : (
          <>
            Perlu{" "}
            <span className="money font-medium text-foreground">
              {formatIDR(pace.needPerPayday)}
            </span>{" "}
            sebelum tanggal target, tidak ada {unit} lagi di antaranya.
          </>
        ),
    });
  }

  if (pace.perMonth !== null) {
    if (pace.perMonth <= 0) {
      lines.push({
        key: "rate",
        tone: "warn",
        node: `Dalam ${pace.windowDays} hari terakhir saldo dompet ini belum bertambah.`,
      });
    } else if (pace.projectedDate) {
      lines.push({
        key: "rate",
        tone: pace.onTrack === null ? "info" : pace.onTrack ? "good" : "warn",
        node: (
          <>
            Dengan laju {pace.windowDays} hari terakhir (sekitar{" "}
            <span className="money font-medium text-foreground">
              {formatIDR(pace.perMonth)}
            </span>{" "}
            per bulan), tercapai sekitar{" "}
            <span className="font-medium text-foreground">
              {formatMonth(pace.projectedDate.slice(0, 7))}
            </span>
            {pace.onTrack === true && ", sesuai target."}
            {pace.onTrack === false && ", lebih lambat dari target."}
            {pace.onTrack === null && "."}
          </>
        ),
      });
    } else {
      lines.push({
        key: "rate",
        tone: "warn",
        node: "Dengan laju sekarang butuh lebih dari 5 tahun.",
      });
    }
  }

  if (lines.length === 0) return null;
  return (
    <ul className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
      {lines.map((l) => (
        <li
          key={l.key}
          className={cn(
            "border-l-2 pl-2",
            l.tone === "good" && "border-income",
            l.tone === "warn" && "border-warning",
            l.tone === "info" && "border-border"
          )}
        >
          {l.node}
        </li>
      ))}
    </ul>
  );
}

function GoalFormDialog({
  open,
  onOpenChange,
  editing,
  wallets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GoalWithProgress | null;
  wallets: Wallet[];
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
          walletId: editing.walletId ?? "",
        }
      : {
          name: "",
          targetAmount: undefined,
          color: "#6366f1",
          targetDate: "",
          walletId: "",
        },
  });

  const sourceItems = [
    { value: MANUAL, label: "Catat manual" },
    ...wallets.map((w) => ({ value: w.id, label: `Saldo dompet ${w.name}` })),
  ];

  function onSubmit(data: GoalInput) {
    onOpenChange(false);
    actionToast(
      editing ? updateGoal(editing.id, data) : createGoal(data),
      {
        loading: "Menyimpan impian...",
        success: editing
          ? "Impian diperbarui"
          : "Impian dibuat, semangat nabung!",
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Impian" : "Impian Baru"}</DialogTitle>
          <DialogDescription>
            Tentukan target. Progresnya bisa otomatis dari saldo dompet
            tabungan, atau dicatat manual setiap kali kamu menyisihkan uang.
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
            <Label>Sumber progres</Label>
            <Controller
              control={control}
              name="walletId"
              render={({ field }) => (
                <Select
                  items={sourceItems}
                  value={field.value || MANUAL}
                  onValueChange={(v) =>
                    field.onChange(!v || v === MANUAL ? "" : (v as string))
                  }
                >
                  <SelectTrigger aria-label="Sumber progres" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Pilih dompet khusus tabungan supaya progresnya selalu sama
              dengan saldo dompet itu.
            </p>
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
  goal: GoalWithProgress;
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

  function onSubmit(data: GoalSavingInput) {
    onOpenChange(false);
    actionToast(adjustGoalSavings(goal.id, data, direction), {
      loading: "Menyimpan...",
      success: direction === 1 ? "Tabungan bertambah 💪" : "Tabungan dikurangi",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nabung: {goal.name}</DialogTitle>
          <DialogDescription>
            Terkumpul {formatIDR(goal.saved)} dari{" "}
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
            <QuickAmounts targetId="saving-amount" />
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
