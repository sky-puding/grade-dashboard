import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

// 목록 조회 (비밀번호 해시는 절대 응답에 포함하지 않는다)
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "관리자만 조회할 수 있습니다." }, { status: 403 });
  }

  const accounts = await prisma.account.findMany({
    include: { linkedStudent: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    accounts.map((a) => ({
      username: a.username,
      name: a.name,
      role: a.role,
      linkedStudentId: a.linkedStudent?.studentCode ?? null,
    }))
  );
}

// 일반 사용자(학생/학부모) 계정 생성
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "관리자만 계정을 추가할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json();
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  const linkedStudentCode = body?.linkedStudentId ? String(body.linkedStudentId) : null;

  if (!username || !password || !name) {
    return NextResponse.json(
      { error: "아이디/비밀번호/이름을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  const existing = await prisma.account.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 아이디입니다." }, { status: 409 });
  }

  let linkedStudentDbId: string | null = null;
  if (linkedStudentCode) {
    const student = await prisma.student.findUnique({ where: { studentCode: linkedStudentCode } });
    if (!student) {
      return NextResponse.json({ error: "연결하려는 학생을 찾을 수 없습니다." }, { status: 400 });
    }
    linkedStudentDbId = student.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.account.create({
    data: {
      username,
      name,
      passwordHash,
      role: "USER",
      linkedStudentId: linkedStudentDbId,
    },
  });

  return NextResponse.json({ success: true });
}
