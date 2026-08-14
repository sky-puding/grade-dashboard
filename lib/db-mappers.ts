import { Student, ScoreRecord as PrismaScoreRecord } from "@prisma/client";
import { ScoreRecord } from "./types";

// DB(정규화된 Student + ScoreRecord)와 프론트엔드가 이미 알고 있는 평평한(flat)
// ScoreRecord 형태를 서로 변환한다. 이렇게 하면 lib/grade-utils.ts, 차트/테이블
// 컴포넌트는 전혀 손대지 않고 그대로 재사용할 수 있다.
export function toFlatRecord(record: PrismaScoreRecord & { student: Student }): ScoreRecord {
  return {
    Grade: record.student.grade,
    Class: record.student.classNo,
    Student_ID: record.student.studentCode,
    Name: record.student.name,
    Exam_Category: record.examCategory === "SCHOOL" ? "내신" : "모의고사",
    Exam_Period: record.examPeriod,
    Subject: record.subject,
    Score: record.score,
    Rank_Info: record.rankInfo ?? undefined,
    Grade_Level: record.gradeLevel ?? undefined,
    Percentile: record.percentile ?? undefined,
    Standard_Score: record.standardScore ?? undefined,
    School_Year: record.schoolYear ?? undefined,
    Total_Score: record.totalScore ?? undefined,
    Score_Average: record.scoreAverage ?? undefined,
  };
}
