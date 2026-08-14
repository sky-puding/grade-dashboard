"use client";

import { GraduationCap, LogOut, ShieldCheck, UploadCloud, UserCog, Users } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface GradeClassOption {
  grade: number;
  classNo: number;
}

export function Header({
  gradeClassOptions,
  selectedGrade,
  selectedClass,
  onGradeChange,
  onClassChange,
  onOpenLogin,
  onOpenUpload,
  onOpenUserManagement,
}: {
  gradeClassOptions: GradeClassOption[];
  selectedGrade: number | null;
  selectedClass: number | null;
  onGradeChange: (grade: number | null) => void;
  onClassChange: (classNo: number | null) => void;
  onOpenLogin: () => void;
  onOpenUpload: () => void;
  onOpenUserManagement: () => void;
}) {
  const { data: session } = useSession();
  const role = session?.user?.role === "ADMIN" ? "admin" : session?.user?.role === "USER" ? "user" : null;
  const isLinkedUser = role === "user" && !!session?.user?.linkedStudentId;
  const grades = Array.from(new Set(gradeClassOptions.map((o) => o.grade))).sort();
  const classes = Array.from(
    new Set(
      gradeClassOptions
        .filter((o) => selectedGrade === null || o.grade === selectedGrade)
        .map((o) => o.classNo)
    )
  ).sort();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/95 backdrop-blur",
        role === "admin" && "border-b-admin"
      )}
    >
      <div className="container flex flex-col gap-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">교사·학생 성적 관리 대시보드</h1>
          </div>

          <div className="flex items-center gap-2">
            {role === "admin" && (
              <>
                <Button size="sm" variant="outline" onClick={onOpenUpload} className="gap-1.5">
                  <UploadCloud className="h-4 w-4" />
                  엑셀 데이터 업로드
                </Button>
                <Button size="sm" variant="outline" onClick={onOpenUserManagement} className="gap-1.5">
                  <UserCog className="h-4 w-4" />
                  사용자 관리
                </Button>
              </>
            )}

            {role === null && <Button size="sm" onClick={onOpenLogin}>로그인</Button>}

            {role === "admin" && (
              <Badge variant="admin" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> 관리자(교사) 로그인됨
              </Badge>
            )}
            {role === "user" && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3.5 w-3.5" />
                {session?.user?.name ?? "일반 사용자"} 로그인됨 ·{" "}
                {isLinkedUser ? "연결 학생 전용 조회" : "전체 조회 전용 모드"}
              </Badge>
            )}

            {role !== null && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => signOut({ redirect: false })}
                className="gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </Button>
            )}
          </div>
        </div>

        {!isLinkedUser && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">학년</span>
          <Select
            value={selectedGrade === null ? "all" : String(selectedGrade)}
            onValueChange={(v) => onGradeChange(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학년</SelectItem>
              {grades.map((g) => (
                <SelectItem key={g} value={String(g)}>
                  {g}학년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground">반</span>
          <Select
            value={selectedClass === null ? "all" : String(selectedClass)}
            onValueChange={(v) => onClassChange(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 반</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={String(c)}>
                  {c}반
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        )}
      </div>
    </header>
  );
}
