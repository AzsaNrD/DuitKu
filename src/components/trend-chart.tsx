"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatIDR } from "@/lib/format";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export type TrendPoint = { month: string; income: number; expense: number };

function shortMonth(month: string) {
  const [y, m] = month.split("-");
  return `${MONTH_SHORT[Number(m) - 1]} '${y.slice(2)}`;
}

function compactIDR(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(value);
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);
  if (!hasData) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Belum cukup data untuk menampilkan tren.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data.map((d) => ({ ...d, label: shortMonth(d.month) }))}
        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={compactIDR}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value, name) => [
            formatIDR(Number(value)),
            name === "income" ? "Pemasukan" : "Pengeluaran",
          ]}
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--popover-foreground)",
          }}
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--foreground)", fontSize: 12 }}>
              {value === "income" ? "Pemasukan" : "Pengeluaran"}
            </span>
          )}
        />
        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
