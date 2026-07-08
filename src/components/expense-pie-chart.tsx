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

export function ExpensePieChart({ data }: { data: CategoryTotal[] }) {
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
