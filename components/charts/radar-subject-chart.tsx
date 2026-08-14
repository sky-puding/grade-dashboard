"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

import { RadarPoint } from "@/lib/grade-utils";
import { RadarTooltip } from "./tooltips";

export function RadarSubjectChart({ data }: { data: RadarPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        비교할 성적 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid className="stroke-muted" />
        <PolarAngleAxis dataKey="subject" fontSize={13} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={11} />
        <Radar name="내신" dataKey="내신" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35} />
        <Radar name="모의고사" dataKey="모의고사" stroke="#dc2626" fill="#dc2626" fillOpacity={0.25} />
        <Legend />
        <Tooltip content={<RadarTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
