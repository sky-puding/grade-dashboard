"use client";

import { TrendPoint } from "@/lib/grade-utils";

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted-foreground">이전 회차 없음</span>;
  if (delta === 0) return <span className="text-muted-foreground">변화 없음 ⚪</span>;
  if (delta > 0) return <span className="text-emerald-600">+{delta}점 상승 🟢</span>;
  return <span className="text-red-600">{delta}점 하락 🔴</span>;
}

// 내신/모의고사 추이 LineChart 공용 커스텀 툴팁
export function TrendTooltip({
  active,
  payload,
  label,
  category,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  category: "내신" | "모의고사";
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as TrendPoint;

  return (
    <div className="min-w-[220px] rounded-lg border bg-popover p-3 text-xs shadow-lg">
      <p className="mb-2 text-sm font-semibold">
        {category === "내신" ? `내신 · ${label} 고사` : `모의고사 · ${label} 모의고사`}
      </p>
      <div className="space-y-2">
        {payload.map((entry) => {
          const subject = entry.name as string;
          const detail = point.subjects[subject];
          if (!detail) return null;
          return (
            <div key={subject} className="border-t pt-1.5 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 font-medium">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {subject}
                </span>
                <span className="font-semibold">{detail.score}점</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 text-muted-foreground">
                <span>
                  {category === "내신"
                    ? `등급 ${detail.gradeLevel ?? "-"} · 석차 ${detail.rankInfo ?? "-"}`
                    : `등급 ${detail.gradeLevel ?? "-"}${
                        detail.standardScore !== undefined ? ` · 표준점수 ${detail.standardScore}` : ""
                      }${detail.percentile !== undefined ? ` · 백분위 ${detail.percentile}` : ""}`}
                </span>
                <DeltaBadge delta={detail.delta} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 레이더차트(내신 vs 모의고사 과목 비교) 커스텀 툴팁
export function RadarTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const subject = payload[0].payload.subject as string;
  const school = payload.find((p) => p.name === "내신")?.value ?? 0;
  const mock = payload.find((p) => p.name === "모의고사")?.value ?? 0;
  const diff = school - mock;

  return (
    <div className="min-w-[180px] rounded-lg border bg-popover p-3 text-xs shadow-lg">
      <p className="mb-2 text-sm font-semibold">{subject}</p>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">내신 원점수</span>
        <span className="font-semibold">{school}점</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">모의고사 원점수</span>
        <span className="font-semibold">{mock}점</span>
      </div>
      <div className="mt-1.5 border-t pt-1.5 text-muted-foreground">
        {diff === 0 && "두 시험 점수가 동일합니다."}
        {diff > 0 && `내신이 모의고사보다 ${diff}점 높습니다.`}
        {diff < 0 && `모의고사가 내신보다 ${-diff}점 높습니다.`}
      </div>
    </div>
  );
}

// 학급 분포도 BarChart 툴팁
export function DistributionTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const { name, count } = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover p-3 text-xs shadow-lg">
      <p className="font-semibold">{name}</p>
      <p className="text-muted-foreground">{count}명</p>
    </div>
  );
}
