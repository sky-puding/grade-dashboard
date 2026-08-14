import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

// 비밀번호 초기화
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "관리자만 처리할 수 있습니다." }, { status: 403 });
  }

  const { username } = await params;
  const body = await req.json();
  const newPassword = String(body?.password ?? "");
  if (!newPassword) {
    return NextResponse.json({ error: "새 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { username } });
  if (!account) {
    return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.account.update({ where: { username }, data: { passwordHash } });

  return NextResponse.json({ success: true });
}

// 계정 삭제 (관리자 계정은 이 API로 지울 수 없도록 보호)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "관리자만 처리할 수 있습니다." }, { status: 403 });
  }

  const { username } = await params;
  const account = await prisma.account.findUnique({ where: { username } });
  if (!account) {
    return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  }
  if (account.role === "ADMIN") {
    return NextResponse.json({ error: "관리자 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  await prisma.account.delete({ where: { username } });
  return NextResponse.json({ success: true });
}
