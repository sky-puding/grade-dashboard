import { PerformanceTag, ScoreRecord, StudentInfo } from "./types";

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

// 과목별 "가장 최근 회차" 성적만 뽑아내는 헬퍼 (레이더차트, 요약카드용)
export function getLatestBySubject(
  records: ScoreRecord[],
  category: "내신" | "모의고사"
) {
  const filtered = records.filter((r) => r.Exam_Category === category);
  const bySubject = new Map<string, ScoreRecord>();
  for (const r of filtered) {
    const existing = bySubject.get(r.Subject);
    if (!existing || orderIndex(r.Exam_Period, category) >= orderIndex(existing.Exam_Period, category)) {
      bySubject.set(r.Subject, r);
    }
  }
  return bySubject;
}

export function averageGradeLevel(records: ScoreRecord[], category: "내신" | "모의고사") {
  const latest = Array.from(getLatestBySubject(records, category).values());
  const withGrade = latest.filter((r) => typeof r.Grade_Level === "number");
  if (withGrade.length === 0) return null;
  const sum = withGrade.reduce((acc, r) => acc + (r.Grade_Level ?? 0), 0);
  return Math.round((sum / withGrade.length) * 10) / 10;
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
  subject: string;
  내신: number;
  모의고사: number;
}

export function buildRadarData(records: ScoreRecord[]): RadarPoint[] {
  const school = getLatestBySubject(records, "내신");
  const mock = getLatestBySubject(records, "모의고사");
  // 내신/모의고사 탐구·선택과목 구성이 서로 다를 수 있으므로,
  // 두 시험 모두에 존재하는 과목(예: 국어/수학/영어)만 비교 대상으로 삼는다.
  const subjects = Array.from(school.keys()).filter((subject) => mock.has(subject));
  return subjects.map((subject) => ({
    subject,
    내신: school.get(subject)?.Score ?? 0,
    모의고사: mock.get(subject)?.Score ?? 0,
  }));
}

export interface TrendSubjectPoint {
  score: number;
  gradeLevel?: number;
  rankInfo?: string;
  percentile?: number;
  standardScore?: number;
  delta: number | null; // 이전 회차 대비 원점수 변화량 (첫 회차는 null)
}

export interface TrendPoint {
  period: string;
  subjects: Record<string, TrendSubjectPoint>;
}

export function buildTrendData(
  records: ScoreRecord[],
  category: "내신" | "모의고사"
): TrendPoint[] {
  const order = category === "내신" ? SCHOOL_PERIOD_ORDER : MOCK_PERIOD_ORDER;
  const filtered = records.filter((r) => r.Exam_Category === category);
  const subjects = Array.from(new Set(filtered.map((r) => r.Subject)));

  const lastScoreBySubject = new Map<string, number>();

  return order
    .filter((period) => filtered.some((r) => r.Exam_Period === period))
    .map((period) => {
      const point: TrendPoint = { period, subjects: {} };
      for (const subject of subjects) {
        const rec = filtered.find(
          (r) => r.Exam_Period === period && r.Subject === subject
        );
        if (!rec) continue;
        const prevScore = lastScoreBySubject.get(subject);
        point.subjects[subject] = {
          score: rec.Score,
          gradeLevel: rec.Grade_Level,
          rankInfo: rec.Rank_Info,
          percentile: rec.Percentile,
          standardScore: rec.Standard_Score,
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

export function computeStudentSummaries(records: ScoreRecord[]): StudentSummary[] {
  const students = getUniqueStudents(records);
  return students.map((student) => {
    const studentRecords = getStudentRecords(records, student.Student_ID);
    const schoolAvgGrade = averageGradeLevel(studentRecords, "내신");
    const mockAvgGrade = averageGradeLevel(studentRecords, "모의고사");
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
