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
