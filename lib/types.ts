// 엑셀/CSV 표준 열 이름과 1:1로 대응되는 성적 원시 레코드 타입
export type ExamCategory = "내신" | "모의고사";

export type SchoolSemester = "1학기" | "2학기";
export type SchoolExamRound = "중간" | "기말";
// 실제 저장되는 Exam_Period 값은 "1학기 중간"처럼 학기+회차를 합친 문자열이다.
export type SchoolExamPeriod = `${SchoolSemester} ${SchoolExamRound}`;
export type MockExamPeriod = "3월" | "6월" | "9월" | "10월";

export interface ScoreRecord {
  Grade: number; // 학년
  Class: number; // 반
  Student_ID: string; // 학번
  Name: string; // 이름
  Exam_Category: ExamCategory; // 내신 / 모의고사
  Exam_Period: string; // "1학기 중간"/"1학기 기말"/"2학기 중간"/"2학기 기말" 또는 3월/6월/9월/10월
  Subject: string; // 과목명
  Score: number; // 원점수
  Rank_Info?: string; // 석차 (내신 전용, 예: "12/300")
  Grade_Level?: number; // 등급 (내신 예상등급 / 모의고사 등급)
  Percentile?: number; // 백분위 (모의고사 전용)
  Standard_Score?: number; // 표준점수 (모의고사 국어/수학/탐구 전용)
  School_Year?: number; // 학년도 (모의고사 수능형 서식 전용)
  Total_Score?: number; // 총점 (내신 학교자체형 서식 원본값, 참고용)
  Score_Average?: number; // 평균 (내신 학교자체형 서식 원본값, 참고용)
}

export interface StudentInfo {
  Grade: number;
  Class: number;
  Student_ID: string;
  Name: string;
}

export type PerformanceTag = "내신 강세형" | "모의고사 강세형" | "균형형";

export type UserRole = "admin" | "user";

// /api/accounts 가 내려주는, 비밀번호 해시가 빠진 계정 정보.
// linkedStudentId는 Student_ID(학번)를 그대로 노출한다 (DB 내부 id가 아님).
export interface PublicAccount {
  username: string;
  name: string;
  role: "ADMIN" | "USER";
  linkedStudentId: string | null;
}
