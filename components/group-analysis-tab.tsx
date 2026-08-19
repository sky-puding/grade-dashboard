"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";

import { ScoreRecord } from "@/lib/types";
import {
  GradeBucket,
  StudentSummary,
  bucketForGrade,
  computeDistribution,
  computeStudentSummaries,
  getUniqueSubjects,
} from "@/lib/grade-utils";
import { exportRowsToExcel } from "@/lib/excel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DistributionChart } from "@/components/charts/distribution-chart";
import { cn } from "@/lib/utils";

type SortKey = "name" | "grade" | "school" | "mock";
type SortDir = "asc" | "desc";

const BUCKET_ORDER: GradeBucket[] = [
  "상위권 (1~2등급)",
  "중위권 (3~4등급)",
  "관리 필요군 (5등급 이하)",
];

function sortValue(summary: StudentSummary, key: SortKey) {
  switch (key) {
    case "name":
      return summary.student.Name;
    case "grade":
      return summary.student.Grade * 100 + summary.student.Class;
    case "school":
      return summary.schoolAvgGrade ?? 99;
    case "mock":
      return summary.mockAvgGrade ?? 99;
  }
}

export function GroupAnalysisTab({ records }: { records: ScoreRecord[] }) {
  const [criterion, setCriterion] = useState<"내신" | "모의고사">("내신");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const subjects = useMemo(() => getUniqueSubjects(records), [records]);
  const subjectFilter = selectedSubject === "all" ? undefined : selectedSubject;
  const subjectLabel = selectedSubject === "all" ? "전체 과목" : selectedSubject;

  const summaries = useMemo(
    () => computeStudentSummaries(records, subjectFilter),
    [records, subjectFilter]
  );
  const distribution = useMemo(
    () => computeDistribution(summaries, criterion),
    [summaries, criterion]
  );

  const grouped = useMemo(() => {
    const map: Record<GradeBucket, StudentSummary[]> = {
      "상위권 (1~2등급)": [],
      "중위권 (3~4등급)": [],
      "관리 필요군 (5등급 이하)": [],
    };
    summaries.forEach((s) => {
      const grade = criterion === "내신" ? s.schoolAvgGrade : s.mockAvgGrade;
      if (grade === null) return;
      map[bucketForGrade(grade)].push(s);
    });
    return map;
  }, [summaries, criterion]);

  const sortedSummaries = useMemo(() => {
    const copy = [...summaries];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [summaries, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const handleExport = () => {
    const rows = sortedSummaries.map((s) => ({
      학년: s.student.Grade,
      반: s.student.Class,
      학번: s.student.Student_ID,
      이름: s.student.Name,
      과목: subjectLabel,
      [`내신_${selectedSubject === "all" ? "평균등급" : "등급"}`]: s.schoolAvgGrade ?? "",
      [`모의고사_${selectedSubject === "all" ? "평균등급" : "등급"}`]: s.mockAvgGrade ?? "",
      유형: s.tag,
    }));
    exportRowsToExcel(rows, "학급_그룹_성적_요약.xlsx", "그룹분석");
  };

  if (summaries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        선택한 학년/반에 학생 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">기준</span>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {(["내신", "모의고사"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCriterion(c)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  criterion === c ? "bg-background shadow" : "text-muted-foreground"
                )}
              >
                {c} 기준 보기
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">과목</span>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 과목</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              {criterion} 기준 성적 분포도{" "}
              {selectedSubject !== "all" && (
                <span className="font-normal text-muted-foreground">· {subjectLabel}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionChart data={distribution} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          {BUCKET_ORDER.map((bucket) => (
            <Card key={bucket}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{bucket}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-2xl font-bold">{grouped[bucket].length}명</p>
                <div className="flex flex-wrap gap-1">
                  {grouped[bucket].map((s) => (
                    <Badge key={s.student.Student_ID} variant="secondary">
                      {s.student.Name}
                    </Badge>
                  ))}
                  {grouped[bucket].length === 0 && (
                    <span className="text-xs text-muted-foreground">해당 학생 없음</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">전체 학생 종합 데이터</CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" />
            엑셀/CSV로 내보내기
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button className="flex items-center gap-1" onClick={() => toggleSort("grade")}>
                    학년/반 <SortIcon column="grade" />
                  </button>
                </TableHead>
                <TableHead>
                  <button className="flex items-center gap-1" onClick={() => toggleSort("name")}>
                    이름 <SortIcon column="name" />
                  </button>
                </TableHead>
                <TableHead>학번</TableHead>
                <TableHead className="text-right">
                  <button className="ml-auto flex items-center gap-1" onClick={() => toggleSort("school")}>
                    내신 {selectedSubject === "all" ? "평균등급" : `등급(${subjectLabel})`}{" "}
                    <SortIcon column="school" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button className="ml-auto flex items-center gap-1" onClick={() => toggleSort("mock")}>
                    모의고사 {selectedSubject === "all" ? "평균등급" : `등급(${subjectLabel})`}{" "}
                    <SortIcon column="mock" />
                  </button>
                </TableHead>
                <TableHead>유형</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSummaries.map((s) => (
                <TableRow key={s.student.Student_ID}>
                  <TableCell>
                    {s.student.Grade}학년 {s.student.Class}반
                  </TableCell>
                  <TableCell className="font-medium">{s.student.Name}</TableCell>
                  <TableCell>{s.student.Student_ID}</TableCell>
                  <TableCell className="text-right">{s.schoolAvgGrade ?? "-"}</TableCell>
                  <TableCell className="text-right">{s.mockAvgGrade ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.tag}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
