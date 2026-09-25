"use client";

// Lapisan data untuk "mode tanpa akun": meniru bentuk & perilaku
// src/db/queries.ts + src/actions/*.ts, tapi baca/tulis ke localStorage
// alih-alih database. Dipakai oleh halaman di src/app/guest/*.
//
// Dibuat terpisah dari action server (bukan reimplementasi lewat DB lokal)
// karena guest mode memang tidak boleh menyentuh server sama sekali —
// itu keputusan produknya, bukan cuma soal performa.
//
// State-nya dibaca lewat useSyncExternalStore (pola yang sama dengan
// balance-toggle.tsx), bukan useEffect+setState, supaya konsisten dengan
// aturan lint proyek ini (react-hooks/set-state-in-effect) dan aman dari
// hydration mismatch: render pertama di server & saat hydrate memakai
// EMPTY_SNAPSHOT yang tetap, baru diganti data asli setelah hydrate.
import { useSyncExternalStore } from "react";
import type {
  Category,
  Transaction,
  TransactionType,
  Wallet,
} from "@/db/schema";
import type { TransactionFilters, TransactionRow, WalletWithBalance } from "@/db/queries";
import type { ActionResult } from "@/lib/action-toast";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { todayString } from "@/lib/format";
import {
  adjustBalanceSchema,
  categorySchema,
  guestImportSchema,
  transactionSchema,
  walletSchema,
  type AdjustBalanceInput,
  type CategoryInput,
  type TransactionInput,
  type WalletInput,
} from "@/lib/zod-schemas";

const STORAGE_KEY = "duitku-guest-data";
const GUEST_USER_ID = "guest";

export type GuestData = {
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
};

const EMPTY_SNAPSHOT: GuestData = { wallets: [], categories: [], transactions: [] };

function makeId(): string {
  return crypto.randomUUID();
}

function freshData(): GuestData {
  const now = new Date();
  return {
    wallets: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({
      id: makeId(),
      userId: GUEST_USER_ID,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isDefault: true,
      createdAt: now,
    })),
    transactions: [],
  };
}

// createdAt disimpan sebagai string ISO di JSON, dibalikin ke Date saat
// dibaca supaya tipenya tetap cocok dengan Wallet/Category/Transaction
// yang dipakai komponen UI yang sama dengan mode login.
function reviveDates(key: string, value: unknown) {
  if (key === "createdAt" && typeof value === "string") return new Date(value);
  return value;
}

let cache: GuestData | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): GuestData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = freshData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(raw, reviveDates) as GuestData;
  } catch {
    const fresh = freshData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

// Snapshot stabil untuk useSyncExternalStore: baca sekali dari localStorage
// per sesi, sesudahnya selalu dari cache in-memory sampai ada commit() baru.
export function loadGuestData(): GuestData {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  if (!cache) cache = readFromStorage();
  return cache;
}

// Selalu ganti referensi top-level (bukan mutasi in place) supaya
// useSyncExternalStore mendeteksi perubahan lewat Object.is, lalu simpan
// ke localStorage & beri tahu semua pemakai useGuestData().
function commit(data: GuestData) {
  cache = data;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  listeners.forEach((l) => l());
}

function subscribeGuestData(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Hook reaktif dipakai halaman guest — re-render otomatis tiap ada mutasi,
// tanpa useEffect/setState manual.
export function useGuestData(): GuestData {
  return useSyncExternalStore(subscribeGuestData, loadGuestData, () => EMPTY_SNAPSHOT);
}

// Dipakai GuestMigrationCheck (dirender di (app)/layout.tsx) untuk tahu
// kapan menawarkan migrasi, reaktif terhadap clearGuestData() sesudah
// migrasi selesai — tanpa useEffect/setState manual.
export function useHasGuestData(): boolean {
  return useSyncExternalStore(subscribeGuestData, hasGuestData, () => false);
}

// Dipakai untuk menawarkan migrasi ke akun setelah login/daftar —
// hanya dianggap "ada data" kalau user benar-benar mencatat sesuatu,
// bukan cuma kategori bawaan yang otomatis terisi.
export function hasGuestData(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as GuestData;
    return data.wallets.length > 0 || data.transactions.length > 0;
  } catch {
    return false;
  }
}

export function clearGuestData() {
  cache = null;
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

// ---------- Dompet ----------

// Fungsi murni (terima data sebagai argumen), dipakai di halaman lewat
// useMemo(() => computeWalletsWithBalances(data), [data]).
export function computeWalletsWithBalances(data: GuestData): WalletWithBalance[] {
  return data.wallets.map((w) => {
    let delta = 0;
    for (const t of data.transactions) {
      const amount = Number(t.amount);
      if (t.walletId === w.id) {
        // income & adjustment (nilainya sudah bertanda) menambah,
        // expense & transfer keluar mengurangi — sama seperti db/queries.ts
        if (t.type === "income" || t.type === "adjustment") delta += amount;
        else delta -= amount;
      }
      if (t.type === "transfer" && t.transferToWalletId === w.id) {
        delta += amount;
      }
    }
    return { ...w, balance: Number(w.initialBalance) + delta };
  });
}

export async function createGuestWallet(input: WalletInput): Promise<ActionResult> {
  const parsed = walletSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const current = loadGuestData();
  const wallet: Wallet = {
    id: makeId(),
    userId: GUEST_USER_ID,
    name: parsed.data.name,
    type: parsed.data.type,
    initialBalance: String(parsed.data.initialBalance),
    color: parsed.data.color,
    createdAt: new Date(),
  };
  commit({ ...current, wallets: [...current.wallets, wallet] });
  return { success: true };
}

export async function updateGuestWallet(
  id: string,
  input: WalletInput
): Promise<ActionResult> {
  const parsed = walletSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const current = loadGuestData();
  if (!current.wallets.some((w) => w.id === id)) {
    return { error: "Dompet tidak ditemukan" };
  }
  commit({
    ...current,
    wallets: current.wallets.map((w) =>
      w.id === id
        ? {
            ...w,
            name: parsed.data.name,
            type: parsed.data.type,
            initialBalance: String(parsed.data.initialBalance),
            color: parsed.data.color,
          }
        : w
    ),
  });
  return { success: true };
}

export async function deleteGuestWallet(id: string): Promise<ActionResult> {
  const current = loadGuestData();
  commit({
    ...current,
    wallets: current.wallets.filter((w) => w.id !== id),
    // transaksi pada dompet ini ikut terhapus (meniru cascade di DB)
    transactions: current.transactions.filter(
      (t) => t.walletId !== id && t.transferToWalletId !== id
    ),
  });
  return { success: true };
}

export async function adjustGuestWalletBalance(
  walletId: string,
  input: AdjustBalanceInput
): Promise<ActionResult> {
  const parsed = adjustBalanceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const current = loadGuestData();
  const wallet = computeWalletsWithBalances(current).find((w) => w.id === walletId);
  if (!wallet) return { error: "Dompet tidak ditemukan" };

  const diff = parsed.data.actualBalance - wallet.balance;
  if (diff === 0) {
    return { error: "Saldo sudah sesuai, tidak ada yang perlu disesuaikan" };
  }

  const tx: Transaction = {
    id: makeId(),
    userId: GUEST_USER_ID,
    walletId,
    categoryId: null,
    type: "adjustment",
    amount: String(diff),
    date: todayString(),
    note: parsed.data.note,
    transferToWalletId: null,
    createdAt: new Date(),
  };
  commit({ ...current, transactions: [...current.transactions, tx] });
  return { success: true };
}

// ---------- Kategori ----------

export async function createGuestCategory(input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const current = loadGuestData();
  const category: Category = {
    id: makeId(),
    userId: GUEST_USER_ID,
    name: parsed.data.name,
    type: parsed.data.type,
    icon: parsed.data.icon,
    color: parsed.data.color,
    isDefault: false,
    createdAt: new Date(),
  };
  commit({ ...current, categories: [...current.categories, category] });
  return { success: true };
}

export async function updateGuestCategory(
  id: string,
  input: CategoryInput
): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const current = loadGuestData();
  if (!current.categories.some((c) => c.id === id)) {
    return { error: "Kategori tidak ditemukan" };
  }
  commit({
    ...current,
    categories: current.categories.map((c) =>
      c.id === id
        ? {
            ...c,
            name: parsed.data.name,
            type: parsed.data.type,
            icon: parsed.data.icon,
            color: parsed.data.color,
          }
        : c
    ),
  });
  return { success: true };
}

export async function deleteGuestCategory(id: string): Promise<ActionResult> {
  const current = loadGuestData();
  commit({
    ...current,
    categories: current.categories.filter((c) => c.id !== id),
    // transaksi dengan kategori ini tidak ikut terhapus, hanya jadi tanpa
    // kategori (meniru onDelete: "set null" di DB)
    transactions: current.transactions.map((t) =>
      t.categoryId === id ? { ...t, categoryId: null } : t
    ),
  });
  return { success: true };
}

// ---------- Transaksi ----------

function toTransactionValues(data: TransactionInput) {
  return {
    walletId: data.walletId,
    categoryId: data.type === "transfer" ? null : (data.categoryId ?? null),
    type: data.type as TransactionType,
    amount: String(data.amount),
    date: data.date,
    note: data.note || null,
    transferToWalletId:
      data.type === "transfer" ? (data.transferToWalletId ?? null) : null,
  };
}

export async function createGuestTransaction(
  input: TransactionInput
): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const current = loadGuestData();
  const tx: Transaction = {
    id: makeId(),
    userId: GUEST_USER_ID,
    createdAt: new Date(),
    ...toTransactionValues(parsed.data),
  };
  commit({ ...current, transactions: [...current.transactions, tx] });
  return { success: true };
}

export async function updateGuestTransaction(
  id: string,
  input: TransactionInput
): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const current = loadGuestData();
  if (!current.transactions.some((t) => t.id === id)) {
    return { error: "Transaksi tidak ditemukan" };
  }
  commit({
    ...current,
    transactions: current.transactions.map((t) =>
      t.id === id ? { ...t, ...toTransactionValues(parsed.data) } : t
    ),
  });
  return { success: true };
}

export async function deleteGuestTransaction(id: string): Promise<ActionResult> {
  const current = loadGuestData();
  commit({
    ...current,
    transactions: current.transactions.filter((t) => t.id !== id),
  });
  return { success: true };
}

export function computeTransactionsPage(
  data: GuestData,
  filters: TransactionFilters = {}
): {
  rows: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const walletMap = new Map(data.wallets.map((w) => [w.id, w]));
  const categoryMap = new Map(data.categories.map((c) => [c.id, c]));
  const q = filters.q?.toLowerCase();

  const filtered = data.transactions.filter((t) => {
    if (filters.type && t.type !== filters.type) return false;
    if (filters.walletId && t.walletId !== filters.walletId) return false;
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
    if (filters.dateFrom && t.date < filters.dateFrom) return false;
    if (filters.dateTo && t.date > filters.dateTo) return false;
    if (q && !(t.note ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const pageSize = filters.pageSize ?? 20;
  const page = Math.max(1, filters.page ?? 1);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rows: TransactionRow[] = paged.map((t) => {
    const wallet = walletMap.get(t.walletId);
    const category = t.categoryId ? categoryMap.get(t.categoryId) : undefined;
    const transferWallet = t.transferToWalletId
      ? walletMap.get(t.transferToWalletId)
      : undefined;
    return {
      id: t.id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      note: t.note,
      walletId: t.walletId,
      walletName: wallet?.name ?? "",
      categoryId: t.categoryId,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      categoryIcon: category?.icon ?? null,
      transferToWalletId: t.transferToWalletId,
      transferToWalletName: transferWallet?.name ?? null,
    };
  });

  return { rows, total, page, pageSize, totalPages };
}

export function getGuestTransactionsPage(filters: TransactionFilters = {}) {
  return computeTransactionsPage(loadGuestData(), filters);
}

export function computeRecentTransactions(data: GuestData, limit = 8): TransactionRow[] {
  return computeTransactionsPage(data, { pageSize: limit, page: 1 }).rows;
}

export function computeMonthSummary(data: GuestData, month: string) {
  let income = 0;
  let expense = 0;
  for (const t of data.transactions) {
    if (t.date.slice(0, 7) !== month) continue;
    if (t.type === "income") income += Number(t.amount);
    if (t.type === "expense") expense += Number(t.amount);
  }
  return { income, expense };
}

export function computeExpenseByCategory(data: GuestData, month: string) {
  const categoryMap = new Map(data.categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.type !== "expense" || t.date.slice(0, 7) !== month) continue;
    const key = t.categoryId ?? "__none__";
    totals.set(key, (totals.get(key) ?? 0) + Number(t.amount));
  }
  return Array.from(totals.entries())
    .map(([categoryId, total]) => {
      const category = categoryId !== "__none__" ? categoryMap.get(categoryId) : undefined;
      return {
        categoryId: categoryId === "__none__" ? null : categoryId,
        name: category?.name ?? "Tanpa Kategori",
        color: category?.color ?? "#737373",
        total,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ---------- Export ----------

export function exportGuestDataJson(): string {
  return JSON.stringify(loadGuestData(), null, 2);
}

export function exportGuestTransactionsCsv(filters: TransactionFilters = {}): string {
  const TYPE_LABELS: Record<TransactionType, string> = {
    income: "Masuk",
    expense: "Keluar",
    transfer: "Transfer",
    adjustment: "Penyesuaian",
  };
  function csvCell(value: string | null | undefined): string {
    const s = value ?? "";
    return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  }

  const { rows } = getGuestTransactionsPage({ ...filters, page: 1, pageSize: 1000000 });
  const header = ["Tanggal", "Tipe", "Kategori", "Dompet", "Dompet Tujuan", "Jumlah", "Catatan"];
  const lines = rows.map((r) =>
    [
      r.date,
      TYPE_LABELS[r.type],
      csvCell(
        r.type === "transfer"
          ? ""
          : r.type === "adjustment"
            ? "Penyesuaian Saldo"
            : (r.categoryName ?? "Tanpa Kategori")
      ),
      csvCell(r.walletName),
      csvCell(r.transferToWalletName),
      r.amount,
      csvCell(r.note),
    ].join(",")
  );
  return "﻿" + [header.join(","), ...lines].join("\r\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadGuestDataJson() {
  downloadFile(
    exportGuestDataJson(),
    `duitku-backup-${todayString()}.json`,
    "application/json"
  );
}

export function downloadGuestTransactionsCsv(filters: TransactionFilters = {}) {
  downloadFile(
    exportGuestTransactionsCsv(filters),
    `duitku-transaksi-${todayString()}.csv`,
    "text/csv;charset=utf-8"
  );
}

// Baca file cadangan (hasil downloadGuestDataJson) tanpa langsung menimpa
// data, supaya UI bisa menampilkan isinya dulu untuk dikonfirmasi.
// Divalidasi ketat: file bisa berasal dari mana saja, dan data yang rusak di
// localStorage akan merusak semua halaman mode tanpa akun.
export function readGuestBackup(
  json: string
): { data: GuestData } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { error: "File tidak bisa dibaca. Pastikan itu file cadangan DuitKu (.json)." };
  }
  const parsed = guestImportSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Isi file tidak sesuai format cadangan DuitKu." };
  }

  const createdAtOf = (item: unknown) => {
    const value = (item as { createdAt?: unknown })?.createdAt;
    const date = typeof value === "string" ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : new Date();
  };
  const rawData = raw as Record<"wallets" | "categories" | "transactions", unknown[]>;

  const wallets: Wallet[] = parsed.data.wallets.map((w, i) => ({
    ...w,
    userId: GUEST_USER_ID,
    createdAt: createdAtOf(rawData.wallets[i]),
  }));
  const categories: Category[] = parsed.data.categories.map((c, i) => ({
    ...c,
    userId: GUEST_USER_ID,
    createdAt: createdAtOf(rawData.categories[i]),
  }));

  // buang transaksi yang dompetnya tidak ada di file, dan kosongkan kategori
  // yang tidak ada, supaya tidak ada referensi menggantung
  const walletIds = new Set(wallets.map((w) => w.id));
  const categoryIds = new Set(categories.map((c) => c.id));
  const transactions: Transaction[] = parsed.data.transactions
    .map((t, i) => ({
      ...t,
      userId: GUEST_USER_ID,
      createdAt: createdAtOf(rawData.transactions[i]),
    }))
    .filter(
      (t) =>
        walletIds.has(t.walletId) &&
        (!t.transferToWalletId || walletIds.has(t.transferToWalletId))
    )
    .map((t) =>
      t.categoryId && !categoryIds.has(t.categoryId)
        ? { ...t, categoryId: null }
        : t
    );

  return { data: { wallets, categories, transactions } };
}

// Menimpa seluruh data mode tanpa akun di browser ini dengan isi cadangan.
export function restoreGuestBackup(data: GuestData) {
  commit(data);
}
