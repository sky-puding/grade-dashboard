"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { ScoreRecord } from "@/lib/types";
import {
  averageGradeLevel,
  averageGradeLevelByPeriod,
  buildRadarData,
  buildTrendData,
  computePerformanceTag,
  getStudentRecords,
  getUniqueStudents,
} from "@/lib/grade-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  // 학생 선택 보조 필터: 학년 → 반 → 번호(반 안에서의 순번), 그리고 학번 직접 검색
  const [pickGrade, setPickGrade] = useState<number | null>(null);
  const [pickClass, setPickClass] = useState<number | null>(null);
  const [searchId, setSearchId] = useState("");

  const pickerGrades = useMemo(
    () => Array.from(new Set(students.map((s) => s.Grade))).sort((a, b) => a - b),
    [students]
  );
  const pickerClasses = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .filter((s) => pickGrade === null || s.Grade === pickGrade)
            .map((s) => s.Class)
        )
      ).sort((a, b) => a - b),
    [students, pickGrade]
  );

  // 학년/반으로 좁힌 뒤 학번 순으로 정렬해서 "번호"로 보여준다.
  const pickerStudents = useMemo(() => {
    return students
      .filter((s) => pickGrade === null || s.Grade === pickGrade)
      .filter((s) => pickClass === null || s.Class === pickClass)
      .filter((s) => !searchId.trim() || s.Student_ID.includes(searchId.trim()))
      .sort((a, b) => a.Student_ID.localeCompare(b.Student_ID));
  }, [students, pickGrade, pickClass, searchId]);

  useEffect(() => {
    if (lockedStudentId) {
      setSelectedId(lockedStudentId);
      return;
    }
    if (pickerStudents.length === 0) {
      return;
    }
    if (!selectedId || !pickerStudents.some((s) => s.Student_ID === selectedId)) {
      setSelectedId(pickerStudents[0].Student_ID);
    }
  }, [pickerStudents, selectedId, lockedStudentId]);

  const selectedStudent = students.find((s) => s.Student_ID === selectedId) ?? null;
  const studentRecords = selectedId ? getStudentRecords(records, selectedId) : [];

  const schoolAvgGrade = averageGradeLevel(studentRecords, "내신");
  const mockAvgGrade = averageGradeLevel(studentRecords, "모의고사");
  const mockAvgGradeByPeriod = useMemo(
    () => averageGradeLevelByPeriod(studentRecords, "모의고사"),
    [studentRecords]
  );
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">학생 선택</span>

          <Select
            value={pickGrade === null ? "all" : String(pickGrade)}
            onValueChange={(v) => {
              setPickGrade(v === "all" ? null : Number(v));
              setPickClass(null);
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="학년" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학년</SelectItem>
              {pickerGrades.map((g) => (
                <SelectItem key={g} value={String(g)}>
                  {g}학년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={pickClass === null ? "all" : String(pickClass)}
            onValueChange={(v) => setPickClass(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="반" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 반</SelectItem>
              {pickerClasses.map((c) => (
                <SelectItem key={c} value={String(c)}>
                  {c}반
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedId ?? undefined}
            onValueChange={setSelectedId}
            disabled={pickerStudents.length === 0}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="번호 선택" />
            </SelectTrigger>
            <SelectContent>
              {pickerStudents.map((s, i) => (
                <SelectItem key={s.Student_ID} value={s.Student_ID}>
                  {i + 1}번 {s.Name} ({s.Student_ID})
                </SelectItem>
              ))}
              {pickerStudents.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  일치하는 학생이 없습니다
                </div>
              )}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="학번 검색"
              className="h-9 w-32 pl-7"
            />
          </div>
        </div>
      )}

      {selectedStudent && (
        <StudentProfileCard
          student={selectedStudent}
          schoolAvgGrade={schoolAvgGrade}
          mockAvgGradeByPeriod={mockAvgGradeByPeriod}
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
            <CardTitle className="text-base">내신 성적 추이 (학기·회차별)</CardTitle>
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
