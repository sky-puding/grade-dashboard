import { ScoreRecord, StudentInfo } from "./types";

// 서버/클라이언트 렌더링 결과가 항상 동일하도록 Math.random 대신
// 시드 고정 의사난수 생성기를 사용합니다 (하이드레이션 불일치 방지).
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260802);
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

const NAMES = [
  "김민준", "이서연", "박도윤", "최지우", "정하은",
  "강시우", "조유진", "윤재현", "장수아", "임건우",
  "한소율", "오지호",
];

const SUBJECTS = ["국어", "수학", "영어", "과학"];
const SCHOOL_PERIODS = ["1학기 중간", "1학기 기말", "2학기 중간", "2학기 기말"] as const;
const MOCK_PERIODS = ["3월", "6월", "9월", "10월"] as const;

// 모의고사 성적표(수능형) 탐구영역 과목 후보 (학생마다 2과목 선택)
const TAMGU_POOL = [
  "생활과 윤리", "사회·문화", "윤리와 사상",
  "물리학I", "화학I", "생명과학I", "지구과학I",
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// 국어/수학/탐구영역처럼 상대평가(등급컷)로 백분위·등급을 매기는 과목용
function percentileAndGradeFromScore(score: number) {
  const percentile = clamp(Math.round(score * 0.95 + randInt(-5, 5)), 1, 99);
  const gradeLevel = clamp(Math.ceil(((100 - percentile) / 100) * 9), 1, 9);
  return { percentile, gradeLevel };
}

// 한국사/영어처럼 절대평가(원점수 구간)로 등급을 매기는 과목용
function absoluteGradeFromScore(score: number) {
  if (score >= 90) return 1;
  if (score >= 80) return 2;
  if (score >= 70) return 3;
  if (score >= 60) return 4;
  if (score >= 50) return 5;
  if (score >= 40) return 6;
  if (score >= 30) return 7;
  if (score >= 20) return 8;
  return 9;
}

function pickTamguSubjects(): [string, string] {
  const pool = [...TAMGU_POOL];
  const first = pool.splice(randInt(0, pool.length - 1), 1)[0];
  const second = pool.splice(randInt(0, pool.length - 1), 1)[0];
  return [first, second];
}

export const STUDENTS: StudentInfo[] = NAMES.map((name, idx) => {
  const grade = idx < 6 ? 1 : 2;
  const classNo = idx % 6 < 3 ? 1 : 2;
  const seatNo = (idx % 3) + 1;
  return {
    Grade: grade,
    Class: classNo,
    Student_ID: `${grade}${classNo}${String(seatNo).padStart(2, "0")}`,
    Name: name,
  };
});

function makeSchoolRecords(student: StudentInfo): ScoreRecord[] {
  const records: ScoreRecord[] = [];
  for (const subject of SUBJECTS) {
    // 과목별로 학기 진행에 따라 완만한 등락이 있도록 베이스 점수를 정함
    const base = randInt(68, 92);
    SCHOOL_PERIODS.forEach((period, i) => {
      const drift = randInt(-4, 5) * i;
      const score = Math.max(45, Math.min(100, base + drift + randInt(-3, 3)));
      const rank = randInt(1, 30);
      const totalStudents = randInt(180, 320);
      const gradeLevel = Math.min(9, Math.max(1, Math.ceil((rank / totalStudents) * 9)));
      records.push({
        Grade: student.Grade,
        Class: student.Class,
        Student_ID: student.Student_ID,
        Name: student.Name,
        Exam_Category: "내신",
        Exam_Period: period,
        Subject: subject,
        Score: score,
        Rank_Info: `${rank}/${totalStudents}`,
        Grade_Level: gradeLevel,
      });
    });
  }
  return records;
}

// 모의고사 성적표(수능형) 목데이터: 한국사/국어/수학/영어 + 학생별 탐구영역 2과목
function makeMockRecords(student: StudentInfo, tamguSubjects: [string, string]): ScoreRecord[] {
  const records: ScoreRecord[] = [];
  const schoolYear = 2026;

  const coreSubjects: { name: string; relative: boolean }[] = [
    { name: "한국사", relative: false },
    { name: "국어", relative: true },
    { name: "수학", relative: true },
    { name: "영어", relative: false },
    { name: tamguSubjects[0], relative: true },
    { name: tamguSubjects[1], relative: true },
  ];

  for (const subject of coreSubjects) {
    const isTamgu = subject.name === tamguSubjects[0] || subject.name === tamguSubjects[1];
    const base = randInt(isTamgu ? 55 : 65, isTamgu ? 85 : 92);
    MOCK_PERIODS.forEach((period, i) => {
      const drift = randInt(-3, 4) * i;
      const score = clamp(base + drift + randInt(-4, 4), 30, 100);

      if (subject.relative) {
        const { percentile, gradeLevel } = percentileAndGradeFromScore(score);
        const standardScore = isTamgu
          ? Math.round(30 + score * 0.35)
          : Math.round(70 + score * 0.7);
        records.push({
          Grade: student.Grade,
          Class: student.Class,
          Student_ID: student.Student_ID,
          Name: student.Name,
          Exam_Category: "모의고사",
          Exam_Period: period,
          Subject: subject.name,
          Score: score,
          Grade_Level: gradeLevel,
          Percentile: percentile,
          Standard_Score: standardScore,
          School_Year: schoolYear,
        });
      } else {
        records.push({
          Grade: student.Grade,
          Class: student.Class,
          Student_ID: student.Student_ID,
          Name: student.Name,
          Exam_Category: "모의고사",
          Exam_Period: period,
          Subject: subject.name,
          Score: score,
          Grade_Level: absoluteGradeFromScore(score),
          School_Year: schoolYear,
        });
      }
    });
  }
  return records;
}

export const MOCK_SCORE_RECORDS: ScoreRecord[] = STUDENTS.flatMap((s) => [
  ...makeSchoolRecords(s),
  ...makeMockRecords(s, pickTamguSubjects()),
]);
