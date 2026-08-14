import { NextResponse } from "next/server";
import { ExamCategory } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ScoreRecord } from "@/lib/types";

// 엑셀에서 파싱된 성적 데이터를 DB에 반영한다. (관리자 전용)
// mode: "replace" - 기존 성적 데이터를 전부 지우고 새로 넣음
//       "append"  - 겹치는 (학생/시험종류/회차/과목) 조합만 덮어쓰고, 나머지는 새로 추가
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 업로드할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json();
  const records = body?.records as ScoreRecord[] | undefined;
  const mode = body?.mode === "append" ? "append" : "replace";

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "업로드할 성적 데이터가 없습니다." }, { status: 400 });
  }

  if (mode === "replace") {
    await prisma.scoreRecord.deleteMany({});

    // 새로 업로드된 명단에 없는 예전 학생은 완전히 삭제한다.
    // 그 학생을 조회 범위로 연결해둔 계정이 있다면, 삭제 전에 먼저 연결을 해제해서
    // FK 제약(외래키)에 걸리지 않도록 한다.
    const newStudentCodes = Array.from(new Set(records.map((r) => r.Student_ID)));
    const staleStudents = await prisma.student.findMany({
      where: { studentCode: { notIn: newStudentCodes } },
      select: { id: true },
    });

    if (staleStudents.length > 0) {
      const staleIds = staleStudents.map((s) => s.id);
      await prisma.account.updateMany({
        where: { linkedStudentId: { in: staleIds } },
        data: { linkedStudentId: null },
      });
      await prisma.student.deleteMany({ where: { id: { in: staleIds } } });
    }
  }

  // 같은 학생이 여러 행에 걸쳐 등장하므로, 학생은 한 번씩만 upsert 한다.
  const studentIdByCode = new Map<string, string>();
  const uniqueStudents = new Map<string, ScoreRecord>();
  for (const r of records) {
    if (!uniqueStudents.has(r.Student_ID)) uniqueStudents.set(r.Student_ID, r);
  }
  for (const r of uniqueStudents.values()) {
    const student = await prisma.student.upsert({
      where: { studentCode: r.Student_ID },
      update: { grade: r.Grade, classNo: r.Class, name: r.Name },
      create: { studentCode: r.Student_ID, grade: r.Grade, classNo: r.Class, name: r.Name },
    });
    studentIdByCode.set(r.Student_ID, student.id);
  }

  let count = 0;
  for (const r of records) {
    const studentId = studentIdByCode.get(r.Student_ID);
    if (!studentId) continue;

    const examCategory = r.Exam_Category === "내신" ? ExamCategory.SCHOOL : ExamCategory.MOCK;
    const data = {
      score: r.Score,
      rankInfo: r.Rank_Info ?? null,
      gradeLevel: r.Grade_Level ?? null,
      percentile: r.Percentile ?? null,
      standardScore: r.Standard_Score ?? null,
      schoolYear: r.School_Year ?? null,
      totalScore: r.Total_Score ?? null,
      scoreAverage: r.Score_Average ?? null,
    };

    await prisma.scoreRecord.upsert({
      where: {
        studentId_examCategory_examPeriod_subject: {
          studentId,
          examCategory,
          examPeriod: r.Exam_Period,
          subject: r.Subject,
        },
      },
      update: data,
      create: {
        studentId,
        examCategory,
        examPeriod: r.Exam_Period,
        subject: r.Subject,
        ...data,
      },
    });
    count++;
  }

  return NextResponse.json({ count });
}
