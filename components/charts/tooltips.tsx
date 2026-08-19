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
        {category === "내신" ? `내신 · ${label}고사` : `모의고사 · ${label} 모의고사`}
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
              {detail.subjectDetail && (
                <p className="text-[11px] text-muted-foreground">세부과목: {detail.subjectDetail}</p>
              )}
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
// 그래프에 그려지는 값은 "만점 대비 백분율"이다 (모의고사 한국사/탐구는 50점 만점,
// 나머지는 100점 만점이라 원점수를 그대로 비교하면 불공평하기 때문). 툴팁에는
// 원점수/만점과 백분율을 같이 보여준다.
export function RadarTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as {
    subject: string;
    schoolDetail?: string;
    schoolRawScore?: number;
    schoolMaxScore?: number;
    mockDetail?: string;
    mockRawScore?: number;
    mockMaxScore?: number;
  };
  const subject = point.subject;
  const schoolPercent = payload.find((p) => p.name === "내신")?.value ?? 0;
  const mockPercent = payload.find((p) => p.name === "모의고사")?.value ?? 0;
  const diff = Math.round((schoolPercent - mockPercent) * 10) / 10;

  return (
    <div className="min-w-[200px] rounded-lg border bg-popover p-3 text-xs shadow-lg">
      <p className="mb-2 text-sm font-semibold">{subject}</p>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          내신{point.schoolDetail && point.schoolDetail !== subject ? ` (${point.schoolDetail})` : ""}
        </span>
        <span className="font-semibold">
          {point.schoolRawScore ?? "-"}/{point.schoolMaxScore ?? 100}점 ({schoolPercent}%)
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          모의고사{point.mockDetail && point.mockDetail !== subject ? ` (${point.mockDetail})` : ""}
        </span>
        <span className="font-semibold">
          {point.mockRawScore ?? "-"}/{point.mockMaxScore ?? 100}점 ({mockPercent}%)
        </span>
      </div>
      <div className="mt-1.5 border-t pt-1.5 text-muted-foreground">
        {diff === 0 && "만점 대비 비율이 동일합니다."}
        {diff > 0 && `내신이 모의고사보다 만점 대비 ${diff}%p 높습니다.`}
        {diff < 0 && `모의고사가 내신보다 만점 대비 ${-diff}%p 높습니다.`}
      </div>
      {(point.schoolMaxScore === 50 || point.mockMaxScore === 50) && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          * 모의고사 한국사·탐구는 50점 만점이라 백분율로 환산해 비교했습니다.
        </p>
      )}
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
