"use client";

import { ChartPie } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/components/empty-state";
import { formatIDR } from "@/lib/format";

export type CategoryTotal = {
  name: string;
  color: string;
  total: number;
};

// Legenda dibatasi supaya tinggi kartu tidak ikut membengkak: 5 kategori
// terbesar ditampilkan sendiri, sisanya digabung jadi satu irisan "Lainnya".
const MAX_SLICES = 6;

function limitSlices(data: CategoryTotal[]): CategoryTotal[] {
  if (data.length <= MAX_SLICES) return data;
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, MAX_SLICES - 1);
  const rest = sorted.slice(MAX_SLICES - 1);
  return [
    ...top,
    {
      name: `${rest.length} kategori lain`,
      color: "#737373",
      total: rest.reduce((sum, c) => sum + c.total, 0),
    },
  ];
}

export function ExpensePieChart({ data: rawData }: { data: CategoryTotal[] }) {
  const data = limitSlices(rawData);
  if (data.length === 0) {
    return (
      <EmptyState
        compact
        icon={ChartPie}
        title="Belum ada pengeluaran"
        description="Grafik komposisi kategori akan muncul setelah ada transaksi keluar."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatIDR(Number(value))}
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--popover-foreground)",
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--foreground)", fontSize: 12 }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
