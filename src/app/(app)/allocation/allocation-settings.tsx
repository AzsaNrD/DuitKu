"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryIcon } from "@/components/category-icon";
import { AllocationSplitBar } from "@/components/allocation-progress";
import {
  saveAllocationBuckets,
  setAllocationCategoryBucket,
  setAllocationIncomeCategories,
  setAllocationWalletBucket,
} from "@/actions/allocation";
import { ALLOCATION_PRESETS } from "@/lib/allocation-presets";
import { allocationBucketsSchema } from "@/lib/zod-schemas";
import { WALLET_TYPE_LABELS } from "@/lib/wallet-types";
import { cn } from "@/lib/utils";
import type { AllocationPlan } from "@/db/queries";
import type { AllocationBucketKind, Category, Wallet } from "@/db/schema";

export type SettingsTab = "buckets" | "categories" | "wallets" | "income";

const NONE = "__none__";
const BUCKET_COLORS = [
  "#3b82f6",
  "#ec4899",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#eab308",
];
const KIND_ITEMS = [
  { value: "expense", label: "Pengeluaran" },
  { value: "savings", label: "Tabungan" },
];

type BucketDraft = {
  key: string;
  id?: string;
  name: string;
  percent: string;
  kind: AllocationBucketKind;
  color: string;
};

// pembagian awal kalau user memilih "Buat sendiri" sebelum punya rencana
export const CUSTOM_STARTER: Omit<BucketDraft, "key">[] = [
  { name: "Pengeluaran", percent: "80", kind: "expense", color: BUCKET_COLORS[0] },
  { name: "Tabungan", percent: "20", kind: "savings", color: BUCKET_COLORS[2] },
];

export function AllocationSettingsDialog({
  open,
  onOpenChange,
  initialTab,
  plan,
  starter,
  expenseCategories,
  incomeCategories,
  wallets,
  onRequestPreset,
  onRequestDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab: SettingsTab;
  plan: AllocationPlan;
  // diisi saat belum ada rencana (alur "Buat sendiri")
  starter?: Omit<BucketDraft, "key">[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  wallets: Wallet[];
  onRequestPreset: (presetId: string) => void;
  onRequestDelete: () => void;
}) {
  const hasPlan = plan.buckets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{hasPlan ? "Atur Alokasi" : "Buat Alokasi Sendiri"}</DialogTitle>
          <DialogDescription>
            {hasPlan
              ? "Ubah pos, pilih kategori dan dompet untuk tiap pos, serta pemasukan yang dijadikan dasar pembagian."
              : "Tentukan pos dan persentasenya dulu. Kategori dan dompet bisa dipetakan setelah disimpan."}
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0 + grid 4 kolom: tanpa ini deretan tab lebih lebar dari
            dialog di layar HP dan ikut melebarkan seluruh isi dialog */}
        {hasPlan ? (
          <Tabs defaultValue={initialTab} className="min-w-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="buckets" className="min-w-0 px-1 text-xs sm:text-sm">
                Pos
              </TabsTrigger>
              <TabsTrigger value="categories" className="min-w-0 px-1 text-xs sm:text-sm">
                Kategori
              </TabsTrigger>
              <TabsTrigger value="wallets" className="min-w-0 px-1 text-xs sm:text-sm">
                Tabungan
              </TabsTrigger>
              <TabsTrigger value="income" className="min-w-0 px-1 text-xs sm:text-sm">
                Pemasukan
              </TabsTrigger>
            </TabsList>
            <TabsContent value="buckets" className="mt-4">
              <BucketEditor
                initial={plan.buckets.map((b) => ({
                  id: b.id,
                  name: b.name,
                  percent: String(b.percent),
                  kind: b.kind,
                  color: b.color,
                }))}
                onSaved={() => onOpenChange(false)}
              />
              <PresetSwitcher onRequestPreset={onRequestPreset} />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">Hapus rencana</p>
                  <p className="text-xs text-muted-foreground">
                    Transaksi, kategori, dan dompet tidak ikut terhapus.
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={onRequestDelete}>
                  <Trash2 /> Hapus Rencana
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="categories" className="mt-4">
              <CategoryMapping plan={plan} categories={expenseCategories} />
            </TabsContent>
            <TabsContent value="wallets" className="mt-4">
              <WalletMapping plan={plan} wallets={wallets} />
            </TabsContent>
            <TabsContent value="income" className="mt-4">
              <IncomeCategoryPicker
                plan={plan}
                categories={incomeCategories}
                onSaved={() => onOpenChange(false)}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <BucketEditor
            initial={starter ?? CUSTOM_STARTER}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BucketEditor({
  initial,
  onSaved,
}: {
  initial: Omit<BucketDraft, "key">[];
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<BucketDraft[]>(() =>
    initial.map((b) => ({ ...b, key: crypto.randomUUID() }))
  );

  const total = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0);
  const parsed = allocationBucketsSchema.safeParse({
    buckets: rows.map(({ id, name, percent, kind, color }) => ({
      id,
      name,
      percent,
      kind,
      color,
    })),
  });

  function update(key: string, patch: Partial<BucketDraft>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const used = new Set(rows.map((r) => r.color));
    const color = BUCKET_COLORS.find((c) => !used.has(c)) ?? BUCKET_COLORS[0];
    setRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: "",
        percent: String(Math.max(0, 100 - total)),
        kind: "expense",
        color,
      },
    ]);
  }

  function save() {
    if (!parsed.success) return;
    onSaved();
    actionToast(saveAllocationBuckets(parsed.data), {
      loading: "Menyimpan pos...",
      success: "Pos alokasi disimpan",
    });
  }

  return (
    <div className="space-y-3">
      <AllocationSplitBar
        buckets={rows.map((r) => ({
          name: r.name || "Tanpa nama",
          percent: Number(r.percent) || 0,
          color: r.color,
        }))}
      />
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <Input
              aria-label="Nama pos"
              placeholder="Nama pos"
              className="min-w-0 flex-1"
              value={row.name}
              maxLength={40}
              onChange={(e) => update(row.key, { name: e.target.value })}
            />
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative w-20 shrink-0">
                <Input
                  aria-label="Persen"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  className="pr-6"
                  value={row.percent}
                  onChange={(e) => update(row.key, { percent: e.target.value })}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <Select
                items={KIND_ITEMS}
                value={row.kind}
                onValueChange={(v) =>
                  update(row.key, { kind: (v as AllocationBucketKind) ?? "expense" })
                }
              >
                <SelectTrigger aria-label="Tipe pos" className="min-w-0 flex-1 sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Hapus pos ${row.name || ""}`.trim()}
                disabled={rows.length <= 1}
                onClick={() =>
                  setRows((prev) => prev.filter((r) => r.key !== row.key))
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={rows.length >= 8}
        >
          <Plus /> Tambah Pos
        </Button>
        <p
          className={cn(
            "text-sm font-medium",
            total === 100
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          Total {total}%
          {total !== 100 &&
            (total < 100 ? ` (kurang ${100 - total}%)` : ` (lebih ${total - 100}%)`)}
        </p>
      </div>
      {!parsed.success && total === 100 && (
        <p className="text-sm text-destructive">
          {parsed.error.issues[0]?.message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Pos tipe Pengeluaran diisi kategori pengeluaran; pos tipe Tabungan diisi
        dompet tabungan. Mengganti tipe pos menghapus pemetaan lamanya.
      </p>
      <DialogFooter>
        <Button onClick={save} disabled={!parsed.success}>
          Simpan Pos
        </Button>
      </DialogFooter>
    </div>
  );
}

function PresetSwitcher({
  onRequestPreset,
}: {
  onRequestPreset: (presetId: string) => void;
}) {
  return (
    <div className="mt-6 space-y-2 border-t pt-4">
      <p className="text-sm font-medium">Ganti ke preset</p>
      <div className="flex flex-wrap gap-2">
        {ALLOCATION_PRESETS.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            size="sm"
            onClick={() => onRequestPreset(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function CategoryMapping({
  plan,
  categories,
}: {
  plan: AllocationPlan;
  categories: Category[];
}) {
  const expenseBuckets = plan.buckets.filter((b) => b.kind === "expense");
  const [links, setLinks] = useState(
    () => new Map(plan.categoryLinks.map((l) => [l.categoryId, l.bucketId]))
  );
  const items = [
    { value: NONE, label: "Belum masuk pos" },
    ...expenseBuckets.map((b) => ({ value: b.id, label: b.name })),
  ];

  if (expenseBuckets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada pos bertipe Pengeluaran. Tambahkan dulu di tab Pos.
      </p>
    );
  }
  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada kategori pengeluaran. Buat dulu di halaman Kategori.
      </p>
    );
  }

  function change(categoryId: string, value: string | null) {
    const bucketId = !value || value === NONE ? null : value;
    setLinks((prev) => {
      const next = new Map(prev);
      if (bucketId) next.set(categoryId, bucketId);
      else next.delete(categoryId);
      return next;
    });
    actionToast(setAllocationCategoryBucket(categoryId, bucketId), {
      loading: "Menyimpan...",
      success: "Pemetaan kategori disimpan",
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Pengeluaran di kategori ini dihitung sebagai pemakaian pos yang dipilih.
        Kategori baru seperti Cicilan atau Sedekah bisa dibuat di halaman
        Kategori.
      </p>
      <div className="divide-y rounded-lg border">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: c.color }}
              >
                <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-sm">{c.name}</span>
            </div>
            <Select
              items={items}
              value={links.get(c.id) ?? NONE}
              onValueChange={(v) => change(c.id, v as string | null)}
            >
              <SelectTrigger aria-label={`Pos untuk ${c.name}`} className="w-40 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletMapping({
  plan,
  wallets,
}: {
  plan: AllocationPlan;
  wallets: Wallet[];
}) {
  const savingsBuckets = plan.buckets.filter((b) => b.kind === "savings");
  const [links, setLinks] = useState(
    () => new Map(plan.walletLinks.map((l) => [l.walletId, l.bucketId]))
  );
  const items = [
    { value: NONE, label: "Bukan tabungan" },
    ...savingsBuckets.map((b) => ({ value: b.id, label: b.name })),
  ];

  if (savingsBuckets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada pos bertipe Tabungan. Tambahkan dulu di tab Pos.
      </p>
    );
  }
  if (wallets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada dompet. Buat dulu di halaman Dompet.
      </p>
    );
  }

  function change(walletId: string, value: string | null) {
    const bucketId = !value || value === NONE ? null : value;
    setLinks((prev) => {
      const next = new Map(prev);
      if (bucketId) next.set(walletId, bucketId);
      else next.delete(walletId);
      return next;
    });
    actionToast(setAllocationWalletBucket(walletId, bucketId), {
      loading: "Menyimpan...",
      success: "Dompet tabungan disimpan",
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Transfer ke dompet tabungan dihitung sebagai tabungan bulan itu,
        transfer keluar darinya mengurangi. Pemasukan yang langsung masuk ke
        dompet ini tetap dihitung sebagai pemasukan.
      </p>
      <div className="divide-y rounded-lg border">
        {wallets.map((w) => (
          <div key={w.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: w.color }}
              />
              <span className="truncate text-sm">{w.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {WALLET_TYPE_LABELS[w.type]}
              </span>
            </div>
            <Select
              items={items}
              value={links.get(w.id) ?? NONE}
              onValueChange={(v) => change(w.id, v as string | null)}
            >
              <SelectTrigger aria-label={`Pos untuk ${w.name}`} className="w-40 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function IncomeCategoryPicker({
  plan,
  categories,
  onSaved,
}: {
  plan: AllocationPlan;
  categories: Category[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState(
    () => new Set(plan.incomeCategoryIds)
  );

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada kategori pemasukan. Buat dulu di halaman Kategori.
      </p>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    onSaved();
    actionToast(setAllocationIncomeCategories([...selected]), {
      loading: "Menyimpan...",
      success: "Kategori pemasukan disimpan",
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pemasukan dari kategori yang dipilih dijumlah tiap bulan sebagai dasar
        pembagian. Misalnya pilih Gaji saja kalau bonus tidak mau ikut dibagi.
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const active = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" />
              {c.name}
            </button>
          );
        })}
      </div>
      <DialogFooter>
        <Button onClick={save}>Simpan Pemasukan</Button>
      </DialogFooter>
    </div>
  );
}
