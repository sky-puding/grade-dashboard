import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toFlatRecord } from "@/lib/db-mappers";

// 성적 데이터 조회. 로그인만 되어 있으면 누구나 호출할 수 있지만,
// 학생이 연결된 일반 사용자 계정은 서버에서 강제로 그 학생 것만 필터링한다.
// (프론트엔드 코드만 믿지 않고, API 자체가 조회 범위를 지킨다.)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const isLinkedUser = session.user.role === "USER" && !!session.user.linkedStudentId;

  const records = await prisma.scoreRecord.findMany({
    where: isLinkedUser ? { studentId: session.user.linkedStudentId! } : {},
    include: { student: true },
    orderBy: [{ student: { studentCode: "asc" } }, { examCategory: "asc" }, { examPeriod: "asc" }, { subject: "asc" }],
  });

  return NextResponse.json(records.map(toFlatRecord));
}
