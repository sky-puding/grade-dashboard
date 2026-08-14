"use client";

import { useEffect, useMemo, useState } from "react";

import { ScoreRecord } from "@/lib/types";
import {
  averageGradeLevel,
  buildRadarData,
  buildTrendData,
  computePerformanceTag,
  getStudentRecords,
  getUniqueStudents,
} from "@/lib/grade-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentProfileCard } from "@/components/student-profile-card";
import { RadarSubjectChart } from "@/components/charts/radar-subject-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { StudentDetailTables } from "@/components/student-detail-tables";

export function IndividualAnalysisTab({
  records,
  lockedStudentId,
}: {
  records: ScoreRecord[];
  lockedStudentId?: string;
}) {
  const students = useMemo(() => getUniqueStudents(records), [records]);
  const [selectedId, setSelectedId] = useState<string | null>(lockedStudentId ?? null);

  useEffect(() => {
    if (lockedStudentId) {
      setSelectedId(lockedStudentId);
      return;
    }
    if (students.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !students.some((s) => s.Student_ID === selectedId)) {
      setSelectedId(students[0].Student_ID);
    }
  }, [students, selectedId, lockedStudentId]);

  const selectedStudent = students.find((s) => s.Student_ID === selectedId) ?? null;
  const studentRecords = selectedId ? getStudentRecords(records, selectedId) : [];

  const schoolAvgGrade = averageGradeLevel(studentRecords, "내신");
  const mockAvgGrade = averageGradeLevel(studentRecords, "모의고사");
  const tag = computePerformanceTag(schoolAvgGrade, mockAvgGrade);

  const radarData = useMemo(() => buildRadarData(studentRecords), [studentRecords]);
  const schoolTrend = useMemo(() => buildTrendData(studentRecords, "내신"), [studentRecords]);
  const mockTrend = useMemo(() => buildTrendData(studentRecords, "모의고사"), [studentRecords]);

  if (students.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        선택한 학년/반에 학생 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!lockedStudentId && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">학생 선택</span>
          <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="학생을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.Student_ID} value={s.Student_ID}>
                  {s.Grade}학년 {s.Class}반 {s.Name} ({s.Student_ID})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedStudent && (
        <StudentProfileCard
          student={selectedStudent}
          schoolAvgGrade={schoolAvgGrade}
          mockAvgGrade={mockAvgGrade}
          tag={tag}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">내신 vs 모의고사 과목별 비교</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarSubjectChart data={radarData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">내신 성적 추이 (중간 → 기말 → 학기말)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={schoolTrend} category="내신" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">모의고사 성적 추이 (3월 → 6월 → 9월 → 10월)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={mockTrend} category="모의고사" />
          </CardContent>
        </Card>
      </div>

      <StudentDetailTables records={studentRecords} />
    </div>
  );
}
