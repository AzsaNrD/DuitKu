"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  X,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import {
  TransactionFormDialog,
  type EditableTransaction,
} from "@/components/transaction-form-dialog";
import { deleteTransaction } from "@/actions/transactions";
import { formatIDR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  getTransactionsPage,
  TransactionRow,
  TransactionFilters,
} from "@/db/queries";
import type { Category, Wallet } from "@/db/schema";

type PageData = Awaited<ReturnType<typeof getTransactionsPage>>;

const ALL = "__all__";

export function TransactionsClient({
  data,
  wallets,
  categories,
  filters,
}: {
  data: PageData;
  wallets: Wallet[];
  categories: Category[];
  filters: TransactionFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);
  const [search, setSearch] = useState(filters.q ?? "");

  function setParam(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setSearch("");
    router.push(pathname);
  }

  const hasFilters =
    filters.type ||
    filters.walletId ||
    filters.categoryId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.q;

  function openEdit(row: TransactionRow) {
    setEditing({
      id: row.id,
      type: row.type,
      amount: row.amount,
      walletId: row.walletId,
      categoryId: row.categoryId,
      transferToWalletId: row.transferToWalletId,
      date: row.date,
      note: row.note,
    });
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    const res = await deleteTransaction(deleting.id);
    if (res.success) toast.success("Transaksi dihapus");
    setDeleting(null);
  }

  const typeItems = [
    { value: ALL, label: "Semua Tipe" },
    { value: "expense", label: "Keluar" },
    { value: "income", label: "Masuk" },
    { value: "transfer", label: "Transfer" },
  ];
  const walletItems = [
    { value: ALL, label: "Semua Dompet" },
    ...wallets.map((w) => ({ value: w.id, label: w.name })),
  ];
  const categoryItems = [
    { value: ALL, label: "Semua Kategori" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            title="Download CSV (mengikuti filter aktif)"
            nativeButton={false}
            render={
              // route handler /api/export menerima query filter yang sama
              <a href={`/api/export?${searchParams.toString()}`} download />
            }
          >
            <Download /> <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/recurring" />}
          >
            <Repeat /> <span className="hidden sm:inline">Berulang</span>
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            disabled={wallets.length === 0}
          >
            <Plus /> Catat
          </Button>
        </div>
      </div>

      {wallets.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Tambahkan dompet dulu di halaman <strong>Dompet</strong> sebelum
            mencatat transaksi.
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Select
              items={typeItems}
              value={filters.type ?? ALL}
              onValueChange={(v) => setParam("type", v as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={walletItems}
              value={filters.walletId ?? ALL}
              onValueChange={(v) => setParam("wallet", v as string)}
            >
              <SelectTrigger className="w-full">
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
            <Select
              items={categoryItems}
              value={filters.categoryId ?? ALL}
              onValueChange={(v) => setParam("category", v as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
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
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => setParam("from", e.target.value || undefined)}
              aria-label="Dari tanggal"
            />
            <Input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => setParam("to", e.target.value || undefined)}
              aria-label="Sampai tanggal"
            />
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setParam("q", search || undefined);
              }}
            >
              <Input
                placeholder="Cari catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" /> Reset filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* List */}
      {data.rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Tidak ada transaksi.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {data.rows.map((row) => (
              <TransactionItem
                key={row.id}
                row={row}
                onEdit={() => openEdit(row)}
                onDelete={() => setDeleting(row)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            disabled={data.page <= 1}
            onClick={() => setParam("page", String(data.page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {data.page} dari {data.totalPages} ({data.total} transaksi)
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={data.page >= data.totalPages}
            onClick={() => setParam("page", String(data.page + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {formOpen && (
        <TransactionFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          wallets={wallets}
          categories={categories}
          editing={editing}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus transaksi?</DialogTitle>
            <DialogDescription>
              Transaksi {formatIDR(Number(deleting?.amount ?? 0))} pada{" "}
              {deleting ? formatDate(deleting.date) : ""} akan dihapus permanen.
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

export function TransactionItem({
  row,
  onEdit,
  onDelete,
}: {
  row: TransactionRow;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isIncome = row.type === "income";
  const isTransfer = row.type === "transfer";

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
        )}
        style={{
          backgroundColor: isTransfer
            ? "#64748b"
            : (row.categoryColor ?? "#737373"),
        }}
      >
        {isTransfer ? (
          <ArrowLeftRight className="h-4 w-4" />
        ) : row.categoryIcon ? (
          <CategoryIcon icon={row.categoryIcon} className="h-4 w-4" />
        ) : isIncome ? (
          <ArrowDownLeft className="h-4 w-4" />
        ) : (
          <ArrowUpRight className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {isTransfer
            ? `Transfer: ${row.walletName} → ${row.transferToWalletName ?? "?"}`
            : (row.categoryName ?? "Tanpa Kategori")}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(row.date)}
          {!isTransfer && ` · ${row.walletName}`}
          {row.note && ` · ${row.note}`}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          isIncome && "text-green-600 dark:text-green-400",
          row.type === "expense" && "text-red-600 dark:text-red-400"
        )}
      >
        {isIncome ? "+" : row.type === "expense" ? "-" : ""}
        {formatIDR(Number(row.amount))}
      </span>
      {onEdit && onDelete && (
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
