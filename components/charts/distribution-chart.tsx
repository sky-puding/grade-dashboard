"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DistributionTooltip } from "./tooltips";

const BUCKET_COLORS: Record<string, string> = {
  "상위권 (1~2등급)": "#2563eb",
  "중위권 (3~4등급)": "#d97706",
  "관리 필요군 (5등급 이하)": "#dc2626",
};

export function DistributionChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" fontSize={12} interval={0} tick={{ width: 120 }} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip content={<DistributionTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={BUCKET_COLORS[entry.name] ?? "#2563eb"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
