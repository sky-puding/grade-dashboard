"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TrendPoint } from "@/lib/grade-utils";
import { colorForIndex } from "@/lib/colors";
import { TrendTooltip } from "./tooltips";

export function TrendChart({
  data,
  category,
}: {
  data: TrendPoint[];
  category: "내신" | "모의고사";
}) {
  const subjects = Array.from(
    new Set(data.flatMap((point) => Object.keys(point.subjects)))
  );

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        표시할 {category} 성적 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="period" fontSize={12} />
        <YAxis domain={[0, 100]} fontSize={12} />
        <Tooltip content={<TrendTooltip category={category} />} />
        <Legend />
        {subjects.map((subject, i) => (
          <Line
            key={subject}
            name={subject}
            dataKey={(point: TrendPoint) => point.subjects[subject]?.score ?? null}
            stroke={colorForIndex(i)}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
