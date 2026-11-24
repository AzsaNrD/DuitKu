"use client";

import { useMemo, useState } from "react";
import {
  HandCoins,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuickAmounts } from "@/components/quick-amounts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addSplitPayment,
  createSplit,
  deleteSplit,
  deleteSplitMember,
  deleteSplitPayment,
  saveSplitMember,
  splitRemainingEqually,
  updateSplit,
} from "@/actions/splits";
import { actionToast } from "@/lib/action-toast";
import { formatDate, formatIDR } from "@/lib/format";
import { equalShares, groupByPerson, summarizeSplit } from "@/lib/split";
import { cn } from "@/lib/utils";
import type { SplitMemberView, SplitView } from "@/db/queries";

type Option = { id: string; name: string };

// nominal diketik dengan titik ribuan; "" = kosong
const formatThousands = (v: string) =>
  v
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const toNumber = (v: string) => Number(v.replace(/\D/g, "")) || 0;

function MoneyField({
  id,
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(formatThousands(e.target.value))}
      className={className}
    />
  );
}

const NO_WALLET = "__none__";

export function SplitsClient({
  bills,
  wallets,
  expenseCategories,
  today,
}: {
  bills: SplitView[];
  wallets: Option[];
  expenseCategories: Option[];
  today: string;
}) {
  const [view, setView] = useState<"bills" | "people">("bills");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SplitView | null>(null);
  const [deleting, setDeleting] = useState<SplitView | null>(null);
  const [memberForm, setMemberForm] = useState<{
    bill: SplitView;
    member: SplitMemberView | null;
  } | null>(null);
  const [paying, setPaying] = useState<{
    bill: SplitView;
    member: SplitMemberView;
  } | null>(null);
  const [removingMember, setRemovingMember] = useState<SplitMemberView | null>(
    null
  );
  const [removingPayment, setRemovingPayment] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const rows = useMemo(
    () =>
      bills
        .map((bill) => ({
          bill,
          summary: summarizeSplit(bill.total, bill.members),
        }))
        // yang belum lunas di atas, lalu yang terbaru
        .sort(
          (a, b) =>
            Number(a.summary.settled) - Number(b.summary.settled) ||
            (a.bill.date < b.bill.date ? 1 : a.bill.date > b.bill.date ? -1 : 0)
        ),
    [bills]
  );
  const people = useMemo(() => groupByPerson(bills), [bills]);
  // teman dari talangan sebelumnya (paling sering ikut di depan), jadi pintasan
  const knownNames = useMemo(
    () => [...people].sort((a, b) => b.billCount - a.billCount).map((p) => p.name),
    [people]
  );
  const totalOutstanding = rows.reduce((s, r) => s + r.summary.outstanding, 0);
  const totalCollected = rows.reduce((s, r) => s + r.summary.collected, 0);
  const owingPeople = people.filter((p) => p.outstanding > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Talangan</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Catat saat kamu membayar dulu untuk teman, bagi ke siapa saja yang
            ikut, lalu pantau siapa yang belum mengembalikan.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Talangan Baru
        </Button>
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={HandCoins}
              title="Belum ada talangan"
              description="Misalnya kamu membayar makan berempat Rp 100.000. Catat di sini, tentukan siapa yang ikut dan bagiannya, lalu tandai saat mereka membayar kembali."
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus /> Buat Talangan Pertama
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Belum dikembalikan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p
                  className={cn(
                    "money text-2xl font-bold",
                    totalOutstanding > 0 && "text-warning"
                  )}
                >
                  {formatIDR(totalOutstanding)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {owingPeople > 0
                    ? `dari ${owingPeople} orang`
                    : "Semua sudah dikembalikan"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sudah dikembalikan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="money text-2xl font-bold text-income">
                  {formatIDR(totalCollected)}
                </p>
                <p className="text-xs text-muted-foreground">
                  dari {bills.length} talangan
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "bills" | "people")}
          >
            <TabsList>
              <TabsTrigger value="bills">Per talangan</TabsTrigger>
              <TabsTrigger value="people">Per orang</TabsTrigger>
            </TabsList>
          </Tabs>

          {view === "bills" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map(({ bill, summary }) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  summary={summary}
                  onEdit={() => setEditing(bill)}
                  onDelete={() => setDeleting(bill)}
                  onAddMember={() => setMemberForm({ bill, member: null })}
                  onEditMember={(member) => setMemberForm({ bill, member })}
                  onRemoveMember={(member) => setRemovingMember(member)}
                  onPay={(member) => setPaying({ bill, member })}
                  onRemovePayment={(id, label) =>
                    setRemovingPayment({ id, label })
                  }
                  onSplitEqually={() =>
                    actionToast(splitRemainingEqually(bill.id), {
                      loading: "Membagi rata...",
                      success: "Sisa dibagi rata",
                    })
                  }
                />
              ))}
            </div>
          ) : people.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  compact
                  icon={Users}
                  title="Belum ada orang"
                  description="Tambahkan teman ke sebuah talangan, lalu rekap per orangnya muncul di sini."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {people.map((p) => (
                  <div
                    key={p.key}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5"
                  >
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.billCount} talangan
                        {p.unassigned > 0 &&
                          `, ${p.unassigned} belum ditentukan nominalnya`}
                        {p.paid > 0 && (
                          <>
                            {" "}
                            · sudah bayar{" "}
                            <span className="money">{formatIDR(p.paid)}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {p.outstanding > 0 ? (
                      <div className="text-right">
                        <p className="money text-sm font-semibold text-warning">
                          {formatIDR(p.outstanding)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          belum bayar
                        </p>
                      </div>
                    ) : (
                      <Badge className="bg-income/10 text-income">Lunas</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {creating && (
        <BillFormDialog
          open={creating}
          onOpenChange={setCreating}
          editing={null}
          wallets={wallets}
          categories={expenseCategories}
          today={today}
          knownNames={knownNames}
        />
      )}
      {editing && (
        <BillFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          editing={editing}
          wallets={wallets}
          categories={expenseCategories}
          today={today}
          knownNames={knownNames}
        />
      )}
      {memberForm && (
        <MemberDialog
          open={!!memberForm}
          onOpenChange={(o) => !o && setMemberForm(null)}
          bill={memberForm.bill}
          member={memberForm.member}
        />
      )}
      {paying && (
        <PaymentDialog
          open={!!paying}
          onOpenChange={(o) => !o && setPaying(null)}
          bill={paying.bill}
          member={paying.member}
          wallets={wallets}
          today={today}
        />
      )}

      {deleting && (
        <DeleteSplitDialog
          bill={deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
          onConfirm={(withTransactions) => {
            const id = deleting.id;
            setDeleting(null);
            actionToast(deleteSplit(id, withTransactions), {
              loading: "Menghapus talangan...",
              success: "Talangan dihapus",
            });
          }}
        />
      )}
      <ConfirmDialog
        open={!!removingMember}
        onOpenChange={(o) => !o && setRemovingMember(null)}
        title="Hapus orang ini?"
        description={
          removingMember
            ? `${removingMember.name} dihapus dari talangan ini. Bagiannya jadi sisa yang belum dibagi.`
            : ""
        }
        onConfirm={() => {
          if (!removingMember) return;
          const id = removingMember.id;
          setRemovingMember(null);
          actionToast(deleteSplitMember(id), {
            loading: "Menghapus...",
            success: "Orang dihapus",
          });
        }}
      />
      <ConfirmDialog
        open={!!removingPayment}
        onOpenChange={(o) => !o && setRemovingPayment(null)}
        title="Hapus pembayaran?"
        description={
          removingPayment
            ? `${removingPayment.label} dihapus. Kalau tadinya masuk ke dompet, pemasukannya ikut dihapus dan saldo kembali.`
            : ""
        }
        onConfirm={() => {
          if (!removingPayment) return;
          const id = removingPayment.id;
          setRemovingPayment(null);
          actionToast(deleteSplitPayment(id), {
            loading: "Menghapus pembayaran...",
            success: "Pembayaran dihapus",
          });
        }}
      />
    </div>
  );
}

function Avatar({ name, self = false }: { name: string; self?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        self ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function BillCard({
  bill,
  summary,
  onEdit,
  onDelete,
  onAddMember,
  onEditMember,
  onRemoveMember,
  onPay,
  onRemovePayment,
  onSplitEqually,
}: {
  bill: SplitView;
  summary: ReturnType<typeof summarizeSplit>;
  onEdit: () => void;
  onDelete: () => void;
  onAddMember: () => void;
  onEditMember: (m: SplitMemberView) => void;
  onRemoveMember: (m: SplitMemberView) => void;
  onPay: (m: SplitMemberView) => void;
  onRemovePayment: (id: string, label: string) => void;
  onSplitEqually: () => void;
}) {
  const pct =
    bill.total > 0 ? Math.min(100, (summary.assigned / bill.total) * 100) : 0;

  return (
    <Card className={cn(summary.settled && "border-income/40")}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <span className="break-words">{bill.title}</span>
            {summary.settled && (
              <Badge className="bg-income/10 text-income">Lunas</Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatDate(bill.date)}
            {bill.walletName && ` · dibayar dari ${bill.walletName}`}
            {bill.note && ` · ${bill.note}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <p className="money mr-1 text-lg font-bold">{formatIDR(bill.total)}</p>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit talangan ${bill.title}`}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Hapus talangan ${bill.title}`}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Berapa dari total yang sudah dibagi */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "bar-grow h-full rounded-full transition-all",
                summary.over ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p
            className={cn(
              "text-sm",
              summary.over
                ? "text-destructive"
                : summary.remaining > 0
                  ? "font-medium text-warning"
                  : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {summary.over ? (
              <>
                Kelebihan{" "}
                <span className="money">{formatIDR(-summary.remaining)}</span>.
                Kurangi nominal salah satu orang.
              </>
            ) : summary.remaining > 0 ? (
              <>
                Sisa{" "}
                <span className="money">{formatIDR(summary.remaining)}</span>{" "}
                belum dibagi
              </>
            ) : (
              "Semua sudah dibagi"
            )}
            {!summary.over && summary.remaining > 0 && (
              <span className="font-normal text-muted-foreground">
                {" "}
                dari <span className="money">{formatIDR(bill.total)}</span>
              </span>
            )}
          </p>
          {summary.remaining > 0 && summary.unassignedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {summary.unassignedCount} orang belum ditentukan. Kalau dibagi
              rata, masing-masing sekitar{" "}
              <span className="money">{formatIDR(summary.suggestedEach)}</span>.
            </p>
          )}
        </div>

        <ul className="divide-y">
          {bill.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              suggestedEach={summary.suggestedEach}
              onEdit={() => onEditMember(m)}
              onRemove={() => onRemoveMember(m)}
              onPay={() => onPay(m)}
              onRemovePayment={onRemovePayment}
            />
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          {summary.remaining > 0 && summary.unassignedCount > 0 && (
            <Button size="sm" onClick={onSplitEqually}>
              <Users /> Bagi rata sisa
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onAddMember}>
            <UserPlus /> Tambah orang
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberRow({
  member: m,
  suggestedEach,
  onEdit,
  onRemove,
  onPay,
  onRemovePayment,
}: {
  member: SplitMemberView;
  suggestedEach: number;
  onEdit: () => void;
  onRemove: () => void;
  onPay: () => void;
  onRemovePayment: (id: string, label: string) => void;
}) {
  const outstanding = m.amount === null ? 0 : Math.max(0, m.amount - m.paid);

  let status: React.ReactNode;
  if (m.isSelf) {
    status = m.amount === null ? "Bagianmu belum ditentukan" : "Bagianmu";
  } else if (m.amount === null) {
    status =
      suggestedEach > 0 ? (
        <>
          Belum ditentukan, kira-kira{" "}
          <span className="money">{formatIDR(suggestedEach)}</span>
        </>
      ) : (
        "Belum ditentukan"
      );
  } else if (outstanding === 0) {
    status = <span className="text-income">Lunas</span>;
  } else if (m.paid > 0) {
    status = (
      <>
        Dibayar <span className="money">{formatIDR(m.paid)}</span>, kurang{" "}
        <span className="money text-warning">{formatIDR(outstanding)}</span>
      </>
    );
  } else {
    status = "Belum bayar";
  }

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar name={m.name} self={m.isSelf} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {m.name}
            {m.isSelf && (
              <span className="font-normal text-muted-foreground"> (kamu)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
        <span className="money text-sm font-semibold">
          {m.amount === null ? "-" : formatIDR(m.amount)}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {!m.isSelf && outstanding > 0 && (
            <Button size="sm" variant="outline" onClick={onPay}>
              Terima bayar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ubah ${m.name}`}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Hapus ${m.name}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {m.payments.length > 0 && (
        <ul className="ml-12 space-y-1">
          {m.payments.map((p) => {
            const label = `Pembayaran ${formatIDR(p.amount)} dari ${m.name}`;
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span>
                  {formatDate(p.date)} ·{" "}
                  <span className="money">{formatIDR(p.amount)}</span>
                  {p.inWallet ? " · masuk ke dompet" : " · tidak dicatat ke dompet"}
                </span>
                <button
                  type="button"
                  aria-label={`Hapus ${label}`}
                  onClick={() => onRemovePayment(p.id, label)}
                  className="rounded p-1 hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hapus talangan dengan pilihan ikut menghapus transaksinya (pengeluaran asli
// dan pemasukan dari pembayaran teman), menyala secara default karena itulah
// yang biasanya diharapkan.
function DeleteSplitDialog({
  bill,
  onOpenChange,
  onConfirm,
}: {
  bill: SplitView;
  onOpenChange: (open: boolean) => void;
  onConfirm: (withTransactions: boolean) => void;
}) {
  const walletPayments = bill.members.flatMap((m) =>
    m.payments.filter((p) => p.inWallet)
  );
  const repaid = walletPayments.reduce((s, p) => s + p.amount, 0);
  const hasTransactions = bill.hasExpense || walletPayments.length > 0;
  const [withTransactions, setWithTransactions] = useState(true);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus talangan?</DialogTitle>
          <DialogDescription>
            Catatan talangan &quot;{bill.title}&quot; beserta orang dan
            pembayarannya akan dihapus.
          </DialogDescription>
        </DialogHeader>
        {hasTransactions && (
          <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
            <input
              type="checkbox"
              checked={withTransactions}
              onChange={(e) => setWithTransactions(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
            />
            <span className="space-y-1">
              <span className="block font-medium">
                Hapus juga transaksinya di riwayat
              </span>
              <span className="block text-xs text-muted-foreground">
                {bill.hasExpense && (
                  <>
                    Pengeluaran{" "}
                    <span className="money">{formatIDR(bill.total)}</span>
                  </>
                )}
                {bill.hasExpense && walletPayments.length > 0 && " dan "}
                {walletPayments.length > 0 && (
                  <>
                    {walletPayments.length} pemasukan dari pembayaran teman (
                    <span className="money">{formatIDR(repaid)}</span>)
                  </>
                )}{" "}
                ikut dihapus, jadi saldo dompet kembali seperti sebelum
                talangan ini dicatat. Kalau tidak dicentang, transaksinya tetap
                ada di Transaksi.
              </span>
            </span>
          </label>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(hasTransactions && withTransactions)}
          >
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type MemberDraft = { key: number; name: string; amount: string };

// Talangan baru dibuat dua langkah supaya tiap layar pendek:
// 1. apa yang dibayar (judul, total, tanggal, dompet)
// 2. dibagi ke siapa (orang dan nominal, dengan sisa yang selalu terlihat)
// Mengedit talangan yang sudah ada hanya satu layar.
function BillFormDialog({
  open,
  onOpenChange,
  editing,
  wallets,
  categories,
  today,
  knownNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SplitView | null;
  wallets: Option[];
  categories: Option[];
  today: string;
  // nama teman dari talangan sebelumnya, untuk pintasan
  knownNames: string[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  // arah geser baru dipakai setelah pindah langkah, bukan saat dialog dibuka
  const [moved, setMoved] = useState(false);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [total, setTotal] = useState(
    editing ? formatThousands(String(editing.total)) : ""
  );
  const [date, setDate] = useState(editing?.date ?? today);
  // catatan tidak diubah lewat form ini, tapi dipertahankan saat edit
  const [note] = useState(editing?.note ?? "");
  const [recordExpense, setRecordExpense] = useState(wallets.length > 0);
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [includeSelf, setIncludeSelf] = useState(true);
  const [selfAmount, setSelfAmount] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([
    { key: 1, name: "", amount: "" },
    { key: 2, name: "", amount: "" },
  ]);
  const [nextKey, setNextKey] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const totalNum = toNumber(total);
  const filled = members.filter((m) => m.name.trim() !== "");
  const assigned =
    (includeSelf ? toNumber(selfAmount) : 0) +
    filled.reduce((s, m) => s + toNumber(m.amount), 0);
  const remaining = totalNum - assigned;
  const participants = filled.length + (includeSelf ? 1 : 0);
  const pct = totalNum > 0 ? Math.min(100, (assigned / totalNum) * 100) : 0;

  const walletItems = wallets.map((w) => ({ value: w.id, label: w.name }));
  const categoryItems = categories.map((c) => ({ value: c.id, label: c.name }));
  const usedNames = new Set(members.map((m) => m.name.trim().toLowerCase()));
  const suggestions = knownNames
    .filter((n) => !usedNames.has(n.toLowerCase()))
    .slice(0, 6);

  function updateMember(key: number, patch: Partial<MemberDraft>) {
    setMembers((list) =>
      list.map((m) => (m.key === key ? { ...m, ...patch } : m))
    );
    setError(null);
  }

  function addMember(name = "") {
    setMembers((list) => {
      // isi baris kosong yang sudah ada dulu sebelum menambah baris baru
      const empty = name ? list.find((m) => m.name.trim() === "") : undefined;
      if (empty) {
        return list.map((m) => (m.key === empty.key ? { ...m, name } : m));
      }
      return [...list, { key: nextKey, name, amount: "" }];
    });
    setNextKey((k) => k + 1);
    setError(null);
  }

  // bagi total rata ke kamu (kalau ikut) dan semua orang yang sudah diisi
  function splitAll() {
    if (totalNum <= 0 || participants === 0) return;
    const shares = equalShares(totalNum, participants);
    let i = 0;
    if (includeSelf) setSelfAmount(formatThousands(String(shares[i++])));
    const byKey = new Map<number, string>();
    for (const m of filled) byKey.set(m.key, formatThousands(String(shares[i++])));
    setMembers((list) =>
      list.map((m) => (byKey.has(m.key) ? { ...m, amount: byKey.get(m.key)! } : m))
    );
    setError(null);
  }

  function goNext() {
    if (title.trim() === "") return setError("Isi dulu untuk apa");
    if (totalNum <= 0) return setError("Isi total yang kamu bayar");
    if (recordExpense && (!walletId || !categoryId)) {
      return setError(
        !walletId ? "Pilih dompet yang membayar" : "Pilih kategorinya"
      );
    }
    setError(null);
    setMoved(true);
    setStep(2);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      onOpenChange(false);
      actionToast(
        updateSplit(editing.id, {
          title,
          total: totalNum,
          date,
          note: note || undefined,
        }),
        { loading: "Menyimpan talangan...", success: "Talangan diperbarui" }
      );
      return;
    }
    if (step === 1) {
      goNext();
      return;
    }
    if (filled.length === 0) {
      setError("Tambahkan minimal satu teman");
      return;
    }
    if (assigned > totalNum) {
      setError("Jumlah yang ditentukan melebihi total");
      return;
    }
    onOpenChange(false);
    actionToast(
      createSplit({
        title,
        total: totalNum,
        date,
        note: note || undefined,
        includeSelf,
        selfAmount: toNumber(selfAmount) || undefined,
        members: filled.map((m) => ({
          name: m.name.trim(),
          amount: toNumber(m.amount) || undefined,
        })),
        recordExpense,
        walletId: recordExpense ? walletId : undefined,
        categoryId: recordExpense ? categoryId : undefined,
      }),
      { loading: "Menyimpan talangan...", success: "Talangan dicatat" }
    );
  }

  const showBasics = !!editing || step === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Talangan" : "Talangan Baru"}</DialogTitle>
          {editing ? (
            <DialogDescription>
              Orang dan nominalnya diubah langsung di kartu talangan.
            </DialogDescription>
          ) : (
            <DialogDescription>
              {step === 1
                ? "Langkah 1 dari 2: apa yang kamu bayar."
                : "Langkah 2 dari 2: dibagi ke siapa saja."}
            </DialogDescription>
          )}
          {!editing && (
            <div className="flex gap-1.5 pt-1" aria-hidden="true">
              <span className="h-1 flex-1 rounded-full bg-primary" />
              <span
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  step === 2 ? "bg-primary" : "bg-muted"
                )}
              />
            </div>
          )}
        </DialogHeader>
        <form
          key={step}
          onSubmit={onSubmit}
          className={cn(
            "space-y-4",
            moved &&
              (step === 2
                ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 duration-200"
                : "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-4 duration-200")
          )}
          noValidate
        >
          {showBasics && (
            <>
              <div className="space-y-2">
                <Label htmlFor="split-title">Untuk apa</Label>
                <Input
                  id="split-title"
                  placeholder="cth: Makan di warteg"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError(null);
                  }}
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="split-total">Total yang kamu bayar (Rp)</Label>
                <MoneyField
                  id="split-total"
                  value={total}
                  onChange={(v) => {
                    setTotal(v);
                    setError(null);
                  }}
                  placeholder="cth: 100.000"
                />
                {!editing && <QuickAmounts targetId="split-total" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="split-date">Tanggal</Label>
                <Input
                  id="split-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </>
          )}

          {!editing && step === 1 && (
            <div className="space-y-3 rounded-xl border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={recordExpense}
                  disabled={wallets.length === 0}
                  onChange={(e) => {
                    setRecordExpense(e.target.checked);
                    setError(null);
                  }}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Catat juga sebagai pengeluaran
              </label>
              <p className="text-xs text-muted-foreground">
                Saldo dompet berkurang sebesar total, lalu naik lagi saat
                temanmu mengembalikan.
              </p>
              {recordExpense && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Dibayar dari</Label>
                    <Select
                      items={walletItems}
                      value={walletId || null}
                      onValueChange={(v) => {
                        setWalletId((v as string) ?? "");
                        setError(null);
                      }}
                    >
                      <SelectTrigger className="w-full" aria-label="Dompet">
                        <SelectValue placeholder="Pilih dompet" />
                      </SelectTrigger>
                      <SelectContent>
                        {walletItems.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select
                      items={categoryItems}
                      value={categoryId || null}
                      onValueChange={(v) => {
                        setCategoryId((v as string) ?? "");
                        setError(null);
                      }}
                    >
                      <SelectTrigger className="w-full" aria-label="Kategori">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryItems.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {!editing && step === 2 && (
            <>
              {/* Ringkasan yang selalu terlihat saat mengisi orang */}
              <div className="space-y-1.5 rounded-xl bg-muted/60 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{title}</span>
                  <span className="money text-sm font-semibold">
                    {formatIDR(totalNum)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                  <div
                    className={cn(
                      "bar-grow h-full rounded-full transition-all",
                      remaining < 0 ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p
                  className={cn(
                    "text-xs",
                    remaining < 0 ? "text-destructive" : "text-muted-foreground"
                  )}
                  aria-live="polite"
                >
                  {remaining < 0 ? (
                    <>
                      Kelebihan{" "}
                      <span className="money">{formatIDR(-remaining)}</span>
                    </>
                  ) : remaining === 0 ? (
                    "Semua sudah dibagi"
                  ) : (
                    <>
                      Sisa <span className="money">{formatIDR(remaining)}</span>{" "}
                      belum dibagi
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeSelf}
                    onChange={(e) => setIncludeSelf(e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Aku ikut membagi
                </label>
                {includeSelf && (
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-sm text-muted-foreground sm:w-32">
                      Bagianku
                    </span>
                    <MoneyField
                      aria-label="Bagianmu (opsional)"
                      value={selfAmount}
                      onChange={(v) => {
                        setSelfAmount(v);
                        setError(null);
                      }}
                      placeholder="belum ditentukan"
                    />
                  </div>
                )}
                {members.map((m, i) => (
                  <div key={m.key} className="flex items-center gap-2">
                    <Input
                      aria-label={`Nama teman ${i + 1}`}
                      placeholder={`Nama teman ${i + 1}`}
                      value={m.name}
                      onChange={(e) =>
                        updateMember(m.key, { name: e.target.value })
                      }
                      maxLength={40}
                      className="w-24 shrink-0 sm:w-32"
                    />
                    <MoneyField
                      aria-label={`Nominal ${m.name || `teman ${i + 1}`} (opsional)`}
                      value={m.amount}
                      onChange={(v) => updateMember(m.key, { amount: v })}
                      placeholder="belum ditentukan"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus baris teman ${i + 1}`}
                      disabled={members.length === 1}
                      onClick={() =>
                        setMembers((list) =>
                          list.filter((x) => x.key !== m.key)
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {suggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Sering ikut:
                    </span>
                    {suggestions.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => addMember(n)}
                        className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground max-sm:min-h-11 max-sm:px-4 max-sm:text-sm"
                      >
                        + {n}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addMember()}
                    disabled={members.length >= 19}
                  >
                    <UserPlus /> Tambah teman
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={splitAll}
                    disabled={participants === 0 || totalNum <= 0}
                  >
                    <Users /> Bagi rata semua
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nominal boleh dikosongkan dulu. Sisanya bisa dibagi atau
                  ditentukan nanti dari kartu talangan.
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            {!editing && step === 2 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMoved(true);
                  setStep(1);
                  setError(null);
                }}
              >
                Kembali
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
            )}
            <Button type="submit">
              {editing || step === 2 ? "Simpan" : "Lanjut"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberDialog({
  open,
  onOpenChange,
  bill,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: SplitView;
  member: SplitMemberView | null;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [amount, setAmount] = useState(
    member?.amount ? formatThousands(String(member.amount)) : ""
  );
  const [error, setError] = useState<string | null>(null);

  const others = bill.members.filter((m) => m.id !== member?.id);
  const assignedOthers = others.reduce((s, m) => s + (m.amount ?? 0), 0);
  const room = bill.total - assignedOthers;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === "") {
      setError("Nama wajib diisi");
      return;
    }
    if (toNumber(amount) > room) {
      setError(`Maksimal ${formatIDR(Math.max(0, room))} supaya tidak melebihi total`);
      return;
    }
    onOpenChange(false);
    actionToast(
      saveSplitMember(bill.id, member?.id ?? null, {
        name: name.trim(),
        amount: toNumber(amount) || undefined,
      }),
      {
        loading: "Menyimpan...",
        success: member ? "Perubahan disimpan" : "Orang ditambahkan",
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? "Ubah orang" : "Tambah orang"}</DialogTitle>
          <DialogDescription>
            {bill.title}. Sisa yang bisa dibagi untuk orang ini{" "}
            <span className="money">{formatIDR(Math.max(0, room))}</span>.
            Kosongkan nominal kalau belum tahu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="member-name">Nama</Label>
            <Input
              id="member-name"
              value={name}
              disabled={member?.isSelf}
              maxLength={40}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-amount">Nominal (Rp, opsional)</Label>
            <MoneyField
              id="member-amount"
              value={amount}
              onChange={(v) => {
                setAmount(v);
                setError(null);
              }}
              placeholder="belum ditentukan"
            />
            {room > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setAmount(formatThousands(String(room)))}
                  className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground max-sm:min-h-11 max-sm:px-4 max-sm:text-sm"
                >
                  Ambil semua sisa ({formatIDR(room)})
                </button>
              </div>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  bill,
  member,
  wallets,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: SplitView;
  member: SplitMemberView;
  wallets: Option[];
  today: string;
}) {
  const outstanding = Math.max(0, (member.amount ?? 0) - member.paid);
  const [amount, setAmount] = useState(formatThousands(String(outstanding)));
  const [date, setDate] = useState(today);
  const [walletId, setWalletId] = useState(
    bill.walletId && wallets.some((w) => w.id === bill.walletId)
      ? bill.walletId
      : (wallets[0]?.id ?? NO_WALLET)
  );
  const [error, setError] = useState<string | null>(null);

  const walletItems = [
    ...wallets.map((w) => ({ value: w.id, label: `Masuk ke ${w.name}` })),
    { value: NO_WALLET, label: "Tidak dicatat ke dompet" },
  ];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = toNumber(amount);
    if (n <= 0) {
      setError("Isi jumlah yang diterima");
      return;
    }
    if (n > outstanding) {
      setError(`Maksimal ${formatIDR(outstanding)}, sesuai sisa yang belum dibayar`);
      return;
    }
    onOpenChange(false);
    actionToast(
      addSplitPayment({
        memberId: member.id,
        amount: n,
        date,
        walletId: walletId === NO_WALLET ? undefined : walletId,
      }),
      { loading: "Menyimpan pembayaran...", success: "Pembayaran dicatat" }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Terima bayar dari {member.name}</DialogTitle>
          <DialogDescription>
            {bill.title}. Masih kurang{" "}
            <span className="money">{formatIDR(outstanding)}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Jumlah diterima (Rp)</Label>
            <MoneyField
              id="pay-amount"
              value={amount}
              onChange={(v) => {
                setAmount(v);
                setError(null);
              }}
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAmount(formatThousands(String(outstanding)))}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground max-sm:min-h-11 max-sm:px-4 max-sm:text-sm"
              >
                Lunasi ({formatIDR(outstanding)})
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-date">Tanggal</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Uangnya masuk ke</Label>
            <Select
              items={walletItems}
              value={walletId}
              onValueChange={(v) => setWalletId((v as string) ?? NO_WALLET)}
            >
              <SelectTrigger className="w-full" aria-label="Dompet penerima">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {walletItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Kalau masuk ke dompet, tercatat sebagai pemasukan di kategori
              Pengembalian Talangan supaya saldonya benar.
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
