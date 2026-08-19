"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PerformanceTag, StudentInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAG_STYLE: Record<PerformanceTag, string> = {
  "내신 강세형": "bg-blue-100 text-blue-800 border-blue-200",
  "모의고사 강세형": "bg-orange-100 text-orange-800 border-orange-200",
  "균형형": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function StudentProfileCard({
  student,
  schoolAvgGrade,
  mockAvgGradeByPeriod,
  tag,
}: {
  student: StudentInfo;
  schoolAvgGrade: number | null;
  mockAvgGradeByPeriod: { period: string; avgGrade: number | null }[];
  tag: PerformanceTag;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{student.Name}</h2>
            <Badge className={cn("border", TAG_STYLE[tag])} variant="outline">
              {tag}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {student.Grade}학년 {student.Class}반 · 학번 {student.Student_ID}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">내신 평균 등급</p>
            <p className="text-2xl font-bold text-blue-600">
              {schoolAvgGrade ?? "-"}
              <span className="ml-0.5 text-sm font-medium">등급</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">모의고사 평균 등급 (회차별)</p>
            {mockAvgGradeByPeriod.length === 0 ? (
              <p className="text-2xl font-bold text-red-600">
                -<span className="ml-0.5 text-sm font-medium">등급</span>
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {mockAvgGradeByPeriod.map(({ period, avgGrade }) => (
                  <div key={period} className="text-center">
                    <p className="text-[10px] text-muted-foreground">{period}</p>
                    <p className="text-lg font-bold text-red-600">
                      {avgGrade ?? "-"}
                      <span className="ml-0.5 text-xs font-medium">등급</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
