"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreRecord } from "@/lib/types";
import { SCHOOL_PERIOD_ORDER, MOCK_PERIOD_ORDER } from "@/lib/grade-utils";

function sortRecords(records: ScoreRecord[], order: string[]) {
  return [...records].sort((a, b) => {
    const periodDiff = order.indexOf(a.Exam_Period) - order.indexOf(b.Exam_Period);
    if (periodDiff !== 0) return periodDiff;
    return a.Subject.localeCompare(b.Subject);
  });
}

export function StudentDetailTables({ records }: { records: ScoreRecord[] }) {
  const school = sortRecords(
    records.filter((r) => r.Exam_Category === "내신"),
    SCHOOL_PERIOD_ORDER
  );
  const mock = sortRecords(
    records.filter((r) => r.Exam_Category === "모의고사"),
    MOCK_PERIOD_ORDER
  );

  // 내신 학교자체형 서식에서 넘어온 총점/평균은 앱이 계산하지 않고 원본 파일 값을 그대로 참고용으로 보여준다.
  const schoolSummaries = SCHOOL_PERIOD_ORDER.map((period) => {
    const rec = school.find(
      (r) => r.Exam_Period === period && (r.Total_Score !== undefined || r.Score_Average !== undefined)
    );
    return rec ? { period, total: rec.Total_Score, average: rec.Score_Average } : null;
  }).filter(
    (s): s is { period: string; total: number | undefined; average: number | undefined } =>
      s !== null
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">내신 성적 상세</CardTitle>
        </CardHeader>
        <CardContent>
          {schoolSummaries.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {schoolSummaries.map((s) => (
                <span key={s.period}>
                  {s.period}고사 총점 {s.total ?? "-"} · 평균 {s.average ?? "-"} (원본 파일 값, 참고용)
                </span>
              ))}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>회차</TableHead>
                <TableHead>과목</TableHead>
                <TableHead className="text-right">원점수</TableHead>
                <TableHead className="text-right">석차</TableHead>
                <TableHead className="text-right">예상등급</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {school.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    내신 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {school.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.Exam_Period}</TableCell>
                  <TableCell>{r.Subject}</TableCell>
                  <TableCell className="text-right">{r.Score}</TableCell>
                  <TableCell className="text-right">{r.Rank_Info ?? "-"}</TableCell>
                  <TableCell className="text-right">{r.Grade_Level ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">모의고사 성적 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>회차</TableHead>
                <TableHead>과목</TableHead>
                <TableHead className="text-right">원점수</TableHead>
                <TableHead className="text-right">표준점수</TableHead>
                <TableHead className="text-right">백분위</TableHead>
                <TableHead className="text-right">등급</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mock.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    모의고사 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {mock.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.Exam_Period}</TableCell>
                  <TableCell>{r.Subject}</TableCell>
                  <TableCell className="text-right">{r.Score}</TableCell>
                  <TableCell className="text-right">{r.Standard_Score ?? "-"}</TableCell>
                  <TableCell className="text-right">{r.Percentile ?? "-"}</TableCell>
                  <TableCell className="text-right">{r.Grade_Level ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
