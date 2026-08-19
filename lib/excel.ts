import * as XLSX from "xlsx";
import { ScoreRecord } from "./types";

export const TEMPLATE_COLUMNS = [
  "Grade",
  "Class",
  "Student_ID",
  "Name",
  "Exam_Category",
  "Exam_Period",
  "Subject",
  "Score",
  "Rank_Info",
  "Grade_Level",
  "Percentile",
  "Standard_Score",
  "School_Year",
  "Total_Score",
  "Score_Average",
] as const;

const REQUIRED_COLUMNS = [
  "Grade",
  "Class",
  "Student_ID",
  "Name",
  "Exam_Category",
  "Exam_Period",
  "Subject",
  "Score",
];

export interface ParseResult {
  records: ScoreRecord[];
  errors: string[];
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export function parseWorkbookFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });

        const errors: string[] = [];
        const records: ScoreRecord[] = [];

        rows.forEach((row, i) => {
          const rowNum = i + 2; // 헤더 다음 줄부터 시작
          const missing = REQUIRED_COLUMNS.filter(
            (col) => row[col] === undefined || row[col] === ""
          );
          if (missing.length > 0) {
            errors.push(`${rowNum}행: 필수 값 누락 (${missing.join(", ")})`);
            return;
          }

          const category = String(row.Exam_Category).trim();
          if (category !== "내신" && category !== "모의고사") {
            errors.push(
              `${rowNum}행: Exam_Category 값이 올바르지 않습니다 ("내신" 또는 "모의고사"만 허용) → "${category}"`
            );
            return;
          }

          const score = toNumber(row.Score);
          if (score === undefined) {
            errors.push(`${rowNum}행: Score 값이 숫자가 아닙니다.`);
            return;
          }

          records.push({
            Grade: Number(row.Grade),
            Class: Number(row.Class),
            Student_ID: String(row.Student_ID).trim(),
            Name: String(row.Name).trim(),
            Exam_Category: category as ScoreRecord["Exam_Category"],
            Exam_Period: String(row.Exam_Period).trim(),
            Subject: String(row.Subject).trim(),
            Score: score,
            Rank_Info: row.Rank_Info ? String(row.Rank_Info).trim() : undefined,
            Grade_Level: toNumber(row.Grade_Level),
            Percentile: toNumber(row.Percentile),
            Standard_Score: toNumber(row.Standard_Score),
            School_Year: toNumber(row.School_Year),
            Total_Score: toNumber(row.Total_Score),
            Score_Average: toNumber(row.Score_Average),
          });
        });

        resolve({ records, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function downloadSampleTemplate() {
  const sample: Record<string, unknown>[] = [
    {
      Grade: 1,
      Class: 2,
      Student_ID: "10203",
      Name: "홍길동",
      Exam_Category: "내신",
      Exam_Period: "1학기 중간",
      Subject: "수학",
      Score: 88,
      Rank_Info: "5/300",
      Grade_Level: 2,
      Percentile: "",
    },
    {
      Grade: 1,
      Class: 2,
      Student_ID: "10203",
      Name: "홍길동",
      Exam_Category: "모의고사",
      Exam_Period: "3월",
      Subject: "수학",
      Score: 84,
      Rank_Info: "",
      Grade_Level: 2,
      Percentile: 92,
    },
  ];
  const worksheet = XLSX.utils.json_to_sheet(sample, {
    header: [...TEMPLATE_COLUMNS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "성적데이터");
  XLSX.writeFile(workbook, "성적_업로드_샘플서식.xlsx");
}

// ── 모의고사 성적표(수능형) wide 포맷 ──────────────────────────────
// 학생 1명 = 1행, 과목이 옆으로 나열되는 실제 성적처리 시스템 출력 양식.
// 회차(3월/6월/9월/10월) 정보가 파일 안에 없으므로 업로드 시 별도로 입력받는다.

interface MockSubjectColumnSpec {
  fixedName?: string; // 한국사/국어/수학/영어처럼 과목명이 고정인 경우
  nameCol?: number; // 탐구영역처럼 과목명을 셀에서 읽어야 하는 경우의 열 인덱스(0-base)
  scoreCol: number;
  standardScoreCol?: number;
  percentileCol?: number;
  gradeCol: number;
}

const MOCK_BASE_COLS = {
  schoolYear: 0,
  grade: 1,
  classNo: 2,
  seatNo: 3,
  name: 4,
};

const MOCK_SUBJECT_COLUMNS: MockSubjectColumnSpec[] = [
  { fixedName: "한국사", scoreCol: 5, gradeCol: 6 },
  { fixedName: "국어", scoreCol: 7, standardScoreCol: 8, percentileCol: 9, gradeCol: 10 },
  { fixedName: "수학", scoreCol: 11, standardScoreCol: 12, percentileCol: 13, gradeCol: 14 },
  { fixedName: "영어", scoreCol: 15, gradeCol: 16 },
  { nameCol: 17, scoreCol: 18, standardScoreCol: 19, percentileCol: 20, gradeCol: 21 },
  { nameCol: 22, scoreCol: 23, standardScoreCol: 24, percentileCol: 25, gradeCol: 26 },
];

export function parseMockExamWorkbook(file: File, examPeriod: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // 상단 2줄(그룹 헤더 + 세부 헤더)을 건너뛰고 3행부터 데이터로 읽는다.
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          range: 2,
          defval: "",
        });

        const errors: string[] = [];
        const records: ScoreRecord[] = [];

        rows.forEach((row, i) => {
          const rowNum = i + 3;
          const name = String(row[MOCK_BASE_COLS.name] ?? "").trim();
          if (!name) return; // 빈 줄은 건너뜀

          const grade = toNumber(row[MOCK_BASE_COLS.grade]);
          const classNo = toNumber(row[MOCK_BASE_COLS.classNo]);
          const seatNo = row[MOCK_BASE_COLS.seatNo];
          const schoolYear = toNumber(row[MOCK_BASE_COLS.schoolYear]);

          if (grade === undefined || classNo === undefined || seatNo === undefined || seatNo === "") {
            errors.push(`${rowNum}행: 학년/반/번호 값이 올바르지 않습니다.`);
            return;
          }

          const studentId = `${grade}${classNo}${String(seatNo).padStart(2, "0")}`;

          MOCK_SUBJECT_COLUMNS.forEach((spec) => {
            const subject = spec.fixedName ?? String(row[spec.nameCol!] ?? "").trim();
            if (!subject) return; // 탐구영역Ⅱ 미선택 등, 비어있으면 건너뜀

            const score = toNumber(row[spec.scoreCol]);
            if (score === undefined) {
              errors.push(`${rowNum}행 (${name}, ${subject}): 원점수 값이 숫자가 아닙니다.`);
              return;
            }

            records.push({
              Grade: grade,
              Class: classNo,
              Student_ID: studentId,
              Name: name,
              Exam_Category: "모의고사",
              Exam_Period: examPeriod,
              Subject: subject,
              Score: score,
              Grade_Level: toNumber(row[spec.gradeCol]),
              Percentile:
                spec.percentileCol !== undefined ? toNumber(row[spec.percentileCol]) : undefined,
              Standard_Score:
                spec.standardScoreCol !== undefined ? toNumber(row[spec.standardScoreCol]) : undefined,
              School_Year: schoolYear,
            });
          });
        });

        resolve({ records, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function downloadMockExamSampleTemplate() {
  const header1 = [
    "학년도", "학년", "반", "번호", "이름",
    "한국사", "",
    "국어", "", "", "",
    "수학", "", "", "",
    "영어", "",
    "탐구영역I", "", "", "", "",
    "탐구영역Ⅱ", "", "", "", "",
  ];
  const header2 = [
    "", "", "", "", "",
    "원점수", "등급",
    "원점수", "표준점수", "백분위", "등급",
    "원점수", "표준점수", "백분위", "등급",
    "원점수", "등급",
    "과목명", "원점수", "표준점수", "백분위", "등급",
    "과목명", "원점수", "표준점수", "백분위", "등급",
  ];
  const sampleRow1 = [
    2026, 1, 2, 3, "홍길동",
    82, 3,
    88, 128, 92, 2,
    91, 131, 95, 1,
    85, 2,
    "생활과 윤리", 78, 65, 88, 3,
    "사회·문화", 74, 63, 80, 4,
  ];
  const sampleRow2 = [
    2026, 1, 2, 4, "김영희",
    75, 4,
    80, 121, 78, 3,
    72, 119, 70, 4,
    90, 1,
    "물리학I", 85, 70, 91, 2,
    "화학I", 81, 68, 85, 3,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([header1, header2, sampleRow1, sampleRow2]);
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // 학년도
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // 학년
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // 반
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // 번호
    { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, // 이름
    { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } }, // 한국사
    { s: { r: 0, c: 7 }, e: { r: 0, c: 10 } }, // 국어
    { s: { r: 0, c: 11 }, e: { r: 0, c: 14 } }, // 수학
    { s: { r: 0, c: 15 }, e: { r: 0, c: 16 } }, // 영어
    { s: { r: 0, c: 17 }, e: { r: 0, c: 21 } }, // 탐구영역I
    { s: { r: 0, c: 22 }, e: { r: 0, c: 26 } }, // 탐구영역Ⅱ
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "모의고사성적");
  XLSX.writeFile(workbook, "모의고사_성적표_샘플서식.xlsx");
}

// ── 내신 성적표(학교자체형) wide 포맷 ──────────────────────────────
// 학생 1명 = 1행, "과목명(단위수)" 형태의 헤더로 과목이 옆으로 나열되는 학교 자체 출력 양식.
// 학년/학기/회차(중간·기말) 정보와 석차·등급 컬럼이 파일 안에 없으므로,
// 업로드 시 학년·학기·회차를 별도로 입력받고, 등급은 업로드된 과목별 원점수 석차를 기준으로 계산한다.
// (상위 10%=1등급, ~34%=2등급, ~66%=3등급, ~90%=4등급, 그 이하=5등급 / 동점자는 동석차 처리)

function computeRankAndGrade(scores: number[]): { rank: number; grade: number }[] {
  const total = scores.length;
  const indexed = scores.map((score, idx) => ({ score, idx }));
  indexed.sort((a, b) => b.score - a.score);

  const result: { rank: number; grade: number }[] = new Array(total);
  let rank = 1;
  indexed.forEach((entry, i) => {
    if (i > 0 && entry.score !== indexed[i - 1].score) {
      rank = i + 1;
    }
    const percentileFromTop = (rank / total) * 100;
    let grade: number;
    if (percentileFromTop <= 10) grade = 1;
    else if (percentileFromTop <= 34) grade = 2;
    else if (percentileFromTop <= 66) grade = 3;
    else if (percentileFromTop <= 90) grade = 4;
    else grade = 5;
    result[entry.idx] = { rank, grade };
  });
  return result;
}

export function parseSchoolExamWorkbook(
  file: File,
  grade: number,
  examPeriod: string
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

        if (rows.length === 0) {
          resolve({ records: [], errors: ["시트에 데이터가 없습니다."] });
          return;
        }

        const headerRow = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
        const classIdx = headerRow.indexOf("반");
        const seatIdx = headerRow.indexOf("번호");
        const nameIdx = headerRow.includes("성명") ? headerRow.indexOf("성명") : headerRow.indexOf("이름");
        const totalIdx = headerRow.indexOf("총점");
        const avgIdx = headerRow.indexOf("평균");

        if (classIdx === -1 || seatIdx === -1 || nameIdx === -1) {
          resolve({
            records: [],
            errors: ['헤더에서 "반", "번호", "성명"(또는 "이름") 열을 찾을 수 없습니다.'],
          });
          return;
        }

        const reservedIdx = new Set([classIdx, seatIdx, nameIdx, totalIdx, avgIdx].filter((i) => i !== -1));
        const subjectCols = headerRow
          .map((header, idx) => ({ header, idx }))
          .filter(({ header, idx }) => !reservedIdx.has(idx) && header)
          .map(({ header, idx }) => {
            // "공통국어1(4)"처럼 뒤에 붙는 단위수 표기를 과목명에서 제거
            const match = header.match(/^(.+?)\s*\(\s*\d+(\.\d+)?\s*\)\s*$/);
            return { idx, subject: match ? match[1].trim() : header };
          });

        interface StudentRow {
          classNo: number;
          seatNo: unknown;
          name: string;
          studentId: string;
          totalScore?: number;
          scoreAverage?: number;
          scores: Map<string, number>;
        }

        const errors: string[] = [];
        const studentRows: StudentRow[] = [];

        rows.slice(1).forEach((row, i) => {
          const rowNum = i + 2;
          const cells = row as unknown[];
          const name = String(cells[nameIdx] ?? "").trim();
          if (!name) return; // 빈 줄은 건너뜀

          const classNo = toNumber(cells[classIdx]);
          const seatNo = cells[seatIdx];
          if (classNo === undefined || seatNo === undefined || seatNo === "") {
            errors.push(`${rowNum}행: 반/번호 값이 올바르지 않습니다.`);
            return;
          }

          const scores = new Map<string, number>();
          subjectCols.forEach(({ idx, subject }) => {
            const score = toNumber(cells[idx]);
            if (score !== undefined) scores.set(subject, score);
          });

          studentRows.push({
            classNo,
            seatNo,
            name,
            studentId: `${grade}${classNo}${String(seatNo).padStart(2, "0")}`,
            totalScore: totalIdx !== -1 ? toNumber(cells[totalIdx]) : undefined,
            scoreAverage: avgIdx !== -1 ? toNumber(cells[avgIdx]) : undefined,
            scores,
          });
        });

        // 과목별로 업로드된 학생 전체(학년 전체 기준) 원점수 석차를 계산해 5단계 등급을 매긴다.
        const records: ScoreRecord[] = [];
        const subjectNames = Array.from(new Set(subjectCols.map((c) => c.subject)));

        subjectNames.forEach((subject) => {
          const entries = studentRows
            .map((sr, sIdx) => ({ sIdx, score: sr.scores.get(subject) }))
            .filter((e): e is { sIdx: number; score: number } => e.score !== undefined);
          if (entries.length === 0) return;

          const ranked = computeRankAndGrade(entries.map((e) => e.score));
          entries.forEach((entry, i) => {
            const sr = studentRows[entry.sIdx];
            const { rank, grade: gradeLevel } = ranked[i];
            records.push({
              Grade: grade,
              Class: sr.classNo,
              Student_ID: sr.studentId,
              Name: sr.name,
              Exam_Category: "내신",
              Exam_Period: examPeriod,
              Subject: subject,
              Score: entry.score,
              Rank_Info: `${rank}/${entries.length}`,
              Grade_Level: gradeLevel,
              Total_Score: sr.totalScore,
              Score_Average: sr.scoreAverage,
            });
          });
        });

        resolve({ records, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function downloadSchoolExamSampleTemplate() {
  const header = [
    "반", "번호", "성명",
    "공통국어1(4)", "공통수학1(4)", "공통영어1(4)",
    "한국사1(3)", "통합사회1(4)", "통합과학1(4)",
    "총점", "평균",
  ];
  const sampleRow1 = [2, 3, "홍길동", 88, 91, 85, 82, 79, 84, 509, 84.8];
  const sampleRow2 = [2, 4, "김영희", 76, 68, 90, 75, 81, 77, 467, 77.8];

  const worksheet = XLSX.utils.aoa_to_sheet([header, sampleRow1, sampleRow2]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "내신성적");
  XLSX.writeFile(workbook, "내신_성적표_샘플서식.xlsx");
}

export function exportRecordsToExcel(records: ScoreRecord[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(records, {
    header: [...TEMPLATE_COLUMNS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "성적데이터");
  XLSX.writeFile(workbook, filename);
}

export function exportRowsToExcel(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "데이터"
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
