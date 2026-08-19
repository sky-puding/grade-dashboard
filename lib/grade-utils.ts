import { PerformanceTag, ScoreRecord, StudentInfo } from "./types";
import { subjectCategoryOf } from "./subject-categories";

export const SCHOOL_SEMESTERS = ["1학기", "2학기"];
export const SCHOOL_ROUNDS = ["중간", "기말"];
// 내신 회차는 "학기 + 회차"를 합친 문자열로 관리한다. 예: "1학기 중간", "2학기 기말"
export const SCHOOL_PERIOD_ORDER = SCHOOL_SEMESTERS.flatMap((sem) =>
  SCHOOL_ROUNDS.map((round) => `${sem} ${round}`)
);
export const MOCK_PERIOD_ORDER = ["3월", "6월", "9월", "10월"];

export function getUniqueStudents(records: ScoreRecord[]): StudentInfo[] {
  const map = new Map<string, StudentInfo>();
  for (const r of records) {
    const key = `${r.Grade}-${r.Class}-${r.Student_ID}`;
    if (!map.has(key)) {
      map.set(key, {
        Grade: r.Grade,
        Class: r.Class,
        Student_ID: r.Student_ID,
        Name: r.Name,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.Student_ID.localeCompare(b.Student_ID)
  );
}

export function getGradeClassOptions(records: ScoreRecord[]) {
  const set = new Set<string>();
  records.forEach((r) => set.add(`${r.Grade}-${r.Class}`));
  return Array.from(set)
    .map((s) => {
      const [grade, classNo] = s.split("-").map(Number);
      return { grade, classNo };
    })
    .sort((a, b) => a.grade - b.grade || a.classNo - b.classNo);
}

export function filterByGradeClass(
  records: ScoreRecord[],
  grade: number | null,
  classNo: number | null
) {
  return records.filter(
    (r) =>
      (grade === null || r.Grade === grade) &&
      (classNo === null || r.Class === classNo)
  );
}

export function getStudentRecords(records: ScoreRecord[], studentId: string) {
  return records.filter((r) => r.Student_ID === studentId);
}

function orderIndex(period: string, category: "내신" | "모의고사") {
  const order = category === "내신" ? SCHOOL_PERIOD_ORDER : MOCK_PERIOD_ORDER;
  const idx = order.indexOf(period);
  return idx === -1 ? order.length : idx;
}

// 같은 (회차, 과목 카테고리)에 세부 과목이 여러 개 겹치면(예: 탐구 두 과목이 둘 다 "과학탐구")
// 원점수/등급/백분위/표준점수는 평균을 내고, Subject 필드에는 세부 과목명을 모두 이어붙여 남긴다.
function combineSameCategoryRecords(recs: ScoreRecord[]): ScoreRecord {
  if (recs.length === 1) return recs[0];
  const avgOf = (vals: (number | undefined)[]) => {
    const nums = vals.filter((v): v is number => typeof v === "number");
    if (nums.length === 0) return undefined;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
  };
  return {
    ...recs[0],
    Subject: recs.map((r) => r.Subject).join(" + "),
    Score: avgOf(recs.map((r) => r.Score)) ?? recs[0].Score,
    Grade_Level: avgOf(recs.map((r) => r.Grade_Level)),
    Percentile: avgOf(recs.map((r) => r.Percentile)),
    Standard_Score: avgOf(recs.map((r) => r.Standard_Score)),
    Rank_Info: undefined,
  };
}

// records를 "과목 카테고리 -> 회차 -> 그 회차의 대표 레코드" 구조로 정리한다.
// 대표 레코드의 Subject 필드에는 실제 세부 과목명이 그대로 담겨 있어 툴팁에 쓸 수 있다.
function collapseByCategory(records: ScoreRecord[]): Map<string, Map<string, ScoreRecord>> {
  const grouped = new Map<string, Map<string, ScoreRecord[]>>();
  for (const r of records) {
    const cat = subjectCategoryOf(r.Subject);
    if (!grouped.has(cat)) grouped.set(cat, new Map());
    const byPeriod = grouped.get(cat)!;
    if (!byPeriod.has(r.Exam_Period)) byPeriod.set(r.Exam_Period, []);
    byPeriod.get(r.Exam_Period)!.push(r);
  }
  const result = new Map<string, Map<string, ScoreRecord>>();
  grouped.forEach((byPeriod, cat) => {
    const combined = new Map<string, ScoreRecord>();
    byPeriod.forEach((recs, period) => combined.set(period, combineSameCategoryRecords(recs)));
    result.set(cat, combined);
  });
  return result;
}

// 과목 카테고리별 "가장 최근 회차" 성적만 뽑아내는 헬퍼 (레이더차트, 요약카드용).
// 반환되는 Map의 key는 과목 카테고리(예: "수학")이고, value 레코드의 Subject 필드에는
// 실제 세부 과목명(예: "미적분1")이 남아있다.
export function getLatestBySubject(
  records: ScoreRecord[],
  category: "내신" | "모의고사"
) {
  const filtered = records.filter((r) => r.Exam_Category === category);
  const byCategory = collapseByCategory(filtered);
  const bySubject = new Map<string, ScoreRecord>();
  byCategory.forEach((byPeriod, cat) => {
    let best: ScoreRecord | null = null;
    byPeriod.forEach((rec, period) => {
      if (!best || orderIndex(period, category) >= orderIndex(best.Exam_Period, category)) {
        best = rec;
      }
    });
    if (best) bySubject.set(cat, best);
  });
  return bySubject;
}

// subject를 지정하면 그 과목 하나의 등급만, 지정하지 않으면 전 과목 평균 등급을 반환한다.
export function averageGradeLevel(
  records: ScoreRecord[],
  category: "내신" | "모의고사",
  subject?: string
) {
  const bySubject = getLatestBySubject(records, category);
  const latest = subject
    ? bySubject.has(subject)
      ? [bySubject.get(subject)!]
      : []
    : Array.from(bySubject.values());
  const withGrade = latest.filter((r) => typeof r.Grade_Level === "number");
  if (withGrade.length === 0) return null;
  const sum = withGrade.reduce((acc, r) => acc + (r.Grade_Level ?? 0), 0);
  return Math.round((sum / withGrade.length) * 10) / 10;
}

// records에 등장하는 과목 카테고리 목록 (category를 지정하면 그 시험 종류로만 좁힌다)
export function getUniqueSubjects(records: ScoreRecord[], category?: "내신" | "모의고사") {
  const filtered = category ? records.filter((r) => r.Exam_Category === category) : records;
  return Array.from(new Set(filtered.map((r) => subjectCategoryOf(r.Subject)))).sort((a, b) =>
    a.localeCompare(b, "ko")
  );
}

export function computePerformanceTag(
  schoolAvgGrade: number | null,
  mockAvgGrade: number | null
): PerformanceTag {
  if (schoolAvgGrade === null || mockAvgGrade === null) return "균형형";
  // 등급은 숫자가 낮을수록 좋은 성적이므로, mock - school 이 양수면 내신이 더 우수함
  const diff = mockAvgGrade - schoolAvgGrade;
  if (diff > 0.5) return "내신 강세형";
  if (diff < -0.5) return "모의고사 강세형";
  return "균형형";
}

export interface RadarPoint {
  subject: string; // 과목 카테고리 (예: "수학")
  내신: number;
  모의고사: number;
  schoolDetail?: string; // 내신 쪽 실제 세부 과목명
  mockDetail?: string; // 모의고사 쪽 실제 세부 과목명
}

export function buildRadarData(records: ScoreRecord[]): RadarPoint[] {
  const school = getLatestBySubject(records, "내신");
  const mock = getLatestBySubject(records, "모의고사");
  // 카테고리 단위로 비교하므로, 내신 "공통수학1"과 모의고사 "수학"도 같은 "수학"으로 매칭된다.
  const subjects = Array.from(school.keys()).filter((subject) => mock.has(subject));
  return subjects.map((subject) => ({
    subject,
    내신: school.get(subject)?.Score ?? 0,
    모의고사: mock.get(subject)?.Score ?? 0,
    schoolDetail: school.get(subject)?.Subject,
    mockDetail: mock.get(subject)?.Subject,
  }));
}

export interface TrendSubjectPoint {
  score: number;
  gradeLevel?: number;
  rankInfo?: string;
  percentile?: number;
  standardScore?: number;
  subjectDetail?: string; // 실제 세부 과목명 (카테고리와 다를 때만 의미가 있음)
  delta: number | null; // 이전 회차 대비 원점수 변화량 (첫 회차는 null)
}

export interface TrendPoint {
  period: string;
  subjects: Record<string, TrendSubjectPoint>;
}

// 과목 카테고리 단위로 선을 그린다. 회차마다 세부 과목명이 달라도(공통수학1 → 미적분1)
// 같은 카테고리("수학")면 하나의 이어진 선으로 표시되고, 세부 과목명은 point에 남는다.
export function buildTrendData(
  records: ScoreRecord[],
  category: "내신" | "모의고사"
): TrendPoint[] {
  const order = category === "내신" ? SCHOOL_PERIOD_ORDER : MOCK_PERIOD_ORDER;
  const filtered = records.filter((r) => r.Exam_Category === category);
  const byCategory = collapseByCategory(filtered);
  const subjects = Array.from(byCategory.keys());

  const lastScoreBySubject = new Map<string, number>();

  return order
    .filter((period) => Array.from(byCategory.values()).some((byPeriod) => byPeriod.has(period)))
    .map((period) => {
      const point: TrendPoint = { period, subjects: {} };
      for (const subject of subjects) {
        const rec = byCategory.get(subject)?.get(period);
        if (!rec) continue;
        const prevScore = lastScoreBySubject.get(subject);
        point.subjects[subject] = {
          score: rec.Score,
          gradeLevel: rec.Grade_Level,
          rankInfo: rec.Rank_Info,
          percentile: rec.Percentile,
          standardScore: rec.Standard_Score,
          subjectDetail: rec.Subject !== subject ? rec.Subject : undefined,
          delta: prevScore === undefined ? null : rec.Score - prevScore,
        };
        lastScoreBySubject.set(subject, rec.Score);
      }
      return point;
    });
}

export type GradeBucket = "상위권 (1~2등급)" | "중위권 (3~4등급)" | "관리 필요군 (5등급 이하)";

export function bucketForGrade(gradeLevel: number): GradeBucket {
  if (gradeLevel <= 2) return "상위권 (1~2등급)";
  if (gradeLevel <= 4) return "중위권 (3~4등급)";
  return "관리 필요군 (5등급 이하)";
}

export interface StudentSummary {
  student: StudentInfo;
  schoolAvgGrade: number | null;
  mockAvgGrade: number | null;
  tag: PerformanceTag;
}

// subject를 지정하면 그 과목만 기준으로, 지정하지 않으면 전 과목 평균으로 계산한다.
export function computeStudentSummaries(records: ScoreRecord[], subject?: string): StudentSummary[] {
  const students = getUniqueStudents(records);
  return students.map((student) => {
    const studentRecords = getStudentRecords(records, student.Student_ID);
    const schoolAvgGrade = averageGradeLevel(studentRecords, "내신", subject);
    const mockAvgGrade = averageGradeLevel(studentRecords, "모의고사", subject);
    return {
      student,
      schoolAvgGrade,
      mockAvgGrade,
      tag: computePerformanceTag(schoolAvgGrade, mockAvgGrade),
    };
  });
}

export function computeDistribution(
  summaries: StudentSummary[],
  criterion: "내신" | "모의고사"
) {
  const buckets: Record<GradeBucket, number> = {
    "상위권 (1~2등급)": 0,
    "중위권 (3~4등급)": 0,
    "관리 필요군 (5등급 이하)": 0,
  };
  summaries.forEach((s) => {
    const grade = criterion === "내신" ? s.schoolAvgGrade : s.mockAvgGrade;
    if (grade === null) return;
    buckets[bucketForGrade(grade)] += 1;
  });
  return Object.entries(buckets).map(([name, count]) => ({ name, count }));
}
