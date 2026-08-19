"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Trash2, UploadCloud } from "lucide-react";

import { useScoreData } from "@/lib/data-context";
import {
  downloadMockExamSampleTemplate,
  downloadSampleTemplate,
  downloadSchoolExamSampleTemplate,
  parseMockExamWorkbook,
  parseSchoolExamWorkbook,
  parseWorkbookFile,
} from "@/lib/excel";
import { ScoreRecord } from "@/lib/types";
import { MOCK_PERIOD_ORDER, SCHOOL_ROUNDS, SCHOOL_SEMESTERS, formatSchoolPeriod } from "@/lib/grade-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const SCHOOL_GRADE_OPTIONS = [1, 2, 3];

type FormatMode = "standard" | "mockExam" | "schoolExam";

const FORMAT_OPTIONS: { key: FormatMode; label: string }[] = [
  { key: "standard", label: "표준 서식 (내신/모의고사 공통)" },
  { key: "mockExam", label: "모의고사 성적표 (수능형)" },
  { key: "schoolExam", label: "내신 성적표 (학교자체형)" },
];

export function UploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { uploadRecords, clearCategory } = useScoreData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [clearingCategory, setClearingCategory] = useState<"내신" | "모의고사" | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [formatMode, setFormatMode] = useState<FormatMode>("standard");
  const [examPeriod, setExamPeriod] = useState<string>("");
  const [schoolGrade, setSchoolGrade] = useState<string>("");
  const [schoolSemester, setSchoolSemester] = useState<string>("");
  const [schoolRound, setSchoolRound] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ScoreRecord[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [isParsing, setIsParsing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const resetFileState = () => {
    setFileName(null);
    setParsed(null);
    setErrors([]);
  };

  const resetAll = () => {
    resetFileState();
    setFormatMode("standard");
    setExamPeriod("");
    setSchoolGrade("");
    setSchoolSemester("");
    setSchoolRound("");
  };

  const handleFile = async (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setErrors([`지원하지 않는 파일 형식입니다: ${ext} (xlsx, xls, csv만 가능)`]);
      return;
    }
    if (formatMode === "mockExam" && !examPeriod) {
      setErrors(["먼저 회차(3월/6월/9월/10월)를 선택해주세요."]);
      return;
    }
    if (formatMode === "schoolExam" && (!schoolGrade || !schoolSemester || !schoolRound)) {
      setErrors(["먼저 학년, 학기, 회차를 모두 선택해주세요."]);
      return;
    }
    setIsParsing(true);
    setFileName(file.name);
    try {
      let result;
      if (formatMode === "mockExam") {
        result = await parseMockExamWorkbook(file, examPeriod);
      } else if (formatMode === "schoolExam") {
        const schoolExamPeriod = formatSchoolPeriod(schoolSemester, schoolRound);
        result = await parseSchoolExamWorkbook(file, Number(schoolGrade), schoolExamPeriod);
      } else {
        result = await parseWorkbookFile(file);
      }
      setParsed(result.records);
      setErrors(result.errors);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "파일 처리 중 오류가 발생했습니다."]);
      setParsed(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApply = async () => {
    if (!parsed || parsed.length === 0) return;
    setIsApplying(true);
    const result = await uploadRecords(parsed, mode);
    setIsApplying(false);
    if (!result.success) {
      setErrors([result.message ?? "업로드에 실패했습니다."]);
      return;
    }
    resetAll();
    onOpenChange(false);
  };

  const handleClear = async (category: "내신" | "모의고사") => {
    if (!window.confirm(`${category} 데이터를 전부 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    setClearingCategory(category);
    setClearError(null);
    setClearResult(null);
    const result = await clearCategory(category);
    setClearingCategory(null);
    if (!result.success) {
      setClearError(result.message ?? "삭제에 실패했습니다.");
      return;
    }
    setClearResult(`${category} 데이터를 모두 삭제했습니다.`);
  };

  const downloadCurrentTemplate = () => {
    if (formatMode === "mockExam") downloadMockExamSampleTemplate();
    else if (formatMode === "schoolExam") downloadSchoolExamSampleTemplate();
    else downloadSampleTemplate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAll();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>엑셀/CSV 성적 데이터 업로드</DialogTitle>
          <DialogDescription>
            업로드할 파일 형식을 선택하고, 성적 데이터를 업로드하면 대시보드가 즉시 갱신됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1 self-start rounded-lg bg-muted p-1 text-sm">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                if (formatMode !== opt.key) {
                  setFormatMode(opt.key);
                  resetFileState();
                }
              }}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                formatMode === opt.key ? "bg-background shadow" : "text-muted-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={downloadCurrentTemplate}
          className="flex items-center gap-2 self-start text-sm text-primary hover:underline"
        >
          <Download className="h-4 w-4" />
          {formatMode === "mockExam" && "모의고사 성적표 샘플 서식 다운로드"}
          {formatMode === "schoolExam" && "내신 성적표 샘플 서식 다운로드"}
          {formatMode === "standard" && "표준 엑셀 샘플 서식 다운로드"}
        </button>

        {formatMode === "mockExam" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">회차</span>
            <Select
              value={examPeriod || undefined}
              onValueChange={(v) => {
                setExamPeriod(v);
                resetFileState();
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="회차 선택" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_PERIOD_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p} 모의고사
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              파일 안에 회차 정보가 없어 업로드할 회차를 직접 선택합니다.
            </span>
          </div>
        )}

        {formatMode === "schoolExam" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">학년</span>
            <Select
              value={schoolGrade || undefined}
              onValueChange={(v) => {
                setSchoolGrade(v);
                resetFileState();
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="학년" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {g}학년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm font-medium">학기</span>
            <Select
              value={schoolSemester || undefined}
              onValueChange={(v) => {
                setSchoolSemester(v);
                resetFileState();
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="학기" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_SEMESTERS.map((sem) => (
                  <SelectItem key={sem} value={sem}>
                    {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm font-medium">회차</span>
            <Select
              value={schoolRound || undefined}
              onValueChange={(v) => {
                setSchoolRound(v);
                resetFileState();
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="회차 선택" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_ROUNDS.map((round) => (
                  <SelectItem key={round} value={round}>
                    {round}고사
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="w-full text-xs text-muted-foreground">
              파일 안에 학년/학기/회차/석차/등급 정보가 없어 이 세 가지는 직접 선택하고,
              등급은 업로드된 과목별 원점수 석차를 기준으로 자동 계산합니다 (상위
              10%=1등급 … 90% 초과=5등급).
            </span>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-accent"
          )}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">파일을 드래그하거나 클릭해서 업로드하세요</p>
          <p className="text-xs text-muted-foreground">.xlsx, .xls, .csv 지원</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {isParsing && <p className="text-sm text-muted-foreground">파일을 분석하는 중입니다...</p>}

        {fileName && !isParsing && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">{fileName}</p>
            {parsed && (
              <p className="mt-1 flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> {parsed.length}개 행을 정상적으로 읽었습니다.
              </p>
            )}
            {errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="flex items-center gap-1 font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" /> 다음 {errors.length}개 행에 문제가 있어 건너뛰었습니다.
                </p>
                <ul className="max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-muted-foreground">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {parsed && parsed.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">반영 방식</span>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              전체 교체
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={mode === "append"}
                onChange={() => setMode("append")}
              />
              기존 데이터에 추가
            </label>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleApply}
            disabled={!parsed || parsed.length === 0 || isApplying}
          >
            {isApplying ? "반영 중..." : "대시보드에 반영"}
          </Button>
        </DialogFooter>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <Trash2 className="h-4 w-4" />
            위험 구역
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            업로드 없이, 지금 저장된 성적 데이터를 종류별로 통째로 지웁니다. 되돌릴 수
            없으니 신중하게 사용하세요.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={clearingCategory !== null}
              onClick={() => handleClear("모의고사")}
            >
              {clearingCategory === "모의고사" ? "삭제 중..." : "모의고사 데이터 전체 삭제"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={clearingCategory !== null}
              onClick={() => handleClear("내신")}
            >
              {clearingCategory === "내신" ? "삭제 중..." : "내신 데이터 전체 삭제"}
            </Button>
          </div>
          {clearError && <p className="mt-2 text-xs text-destructive">{clearError}</p>}
          {clearResult && <p className="mt-2 text-xs text-emerald-600">{clearResult}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
