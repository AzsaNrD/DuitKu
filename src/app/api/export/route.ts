import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTransactionsPage } from "@/db/queries";
import type { TransactionType } from "@/db/schema";

const TX_TYPES = ["income", "expense", "transfer"] as const;
const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Masuk",
  expense: "Keluar",
  transfer: "Transfer",
};

function csvCell(value: string | null | undefined): string {
  const s = value ?? "";
  return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// Export transaksi sebagai CSV, mengikuti filter yang sama
// dengan halaman Transaksi (type, wallet, category, from, to, q)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const typeParam = params.get("type");
  const { rows } = await getTransactionsPage(session.user.id, {
    type: TX_TYPES.includes(typeParam as TransactionType)
      ? (typeParam as TransactionType)
      : undefined,
    walletId: params.get("wallet") || undefined,
    categoryId: params.get("category") || undefined,
    dateFrom: params.get("from") || undefined,
    dateTo: params.get("to") || undefined,
    q: params.get("q") || undefined,
    page: 1,
    pageSize: 100000,
  });

  const header = [
    "Tanggal",
    "Tipe",
    "Kategori",
    "Dompet",
    "Dompet Tujuan",
    "Jumlah",
    "Catatan",
  ];
  const lines = rows.map((r) =>
    [
      r.date,
      TYPE_LABELS[r.type],
      csvCell(r.type === "transfer" ? "" : (r.categoryName ?? "Tanpa Kategori")),
      csvCell(r.walletName),
      csvCell(r.transferToWalletName),
      r.amount,
      csvCell(r.note),
    ].join(",")
  );

  // BOM supaya Excel membaca UTF-8 dengan benar
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="duitku-transaksi-${today}.csv"`,
    },
  });
}
