import { NextResponse } from "next/server";
import { ExamCategory } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 업로드 없이, 내신 또는 모의고사 데이터를 통째로 지운다. (관리자 전용)
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 삭제할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const category = body?.category;
  if (category !== "내신" && category !== "모의고사") {
    return NextResponse.json(
      { error: 'category 값은 "내신" 또는 "모의고사"여야 합니다.' },
      { status: 400 }
    );
  }

  const examCategory = category === "내신" ? ExamCategory.SCHOOL : ExamCategory.MOCK;
  const { count: deletedRecords } = await prisma.scoreRecord.deleteMany({ where: { examCategory } });

  // 내신·모의고사 성적이 하나도 안 남은 학생은 완전히 정리한다.
  // 그 학생을 연결해둔 계정이 있다면, 먼저 연결을 해제해서 FK 제약을 피한다.
  const orphanStudents = await prisma.student.findMany({
    where: { records: { none: {} } },
    select: { id: true },
  });

  if (orphanStudents.length > 0) {
    const orphanIds = orphanStudents.map((s) => s.id);
    await prisma.account.updateMany({
      where: { linkedStudentId: { in: orphanIds } },
      data: { linkedStudentId: null },
    });
    await prisma.student.deleteMany({ where: { id: { in: orphanIds } } });
  }

  return NextResponse.json({ deletedRecords, deletedStudents: orphanStudents.length });
}
