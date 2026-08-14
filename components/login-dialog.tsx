"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { ShieldCheck, Users } from "lucide-react";

import { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [adminPassword, setAdminPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFields = () => {
    setAdminPassword("");
    setUserId("");
    setUserPassword("");
    setError(null);
  };

  const handleSubmit = async () => {
    const username = selectedRole === "admin" ? "admin" : userId;
    const password = selectedRole === "admin" ? adminPassword : userPassword;

    if (!username || !password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setIsSubmitting(false);

    if (result?.error) {
      setError(
        selectedRole === "admin"
          ? "관리자 비밀번호가 올바르지 않습니다."
          : "아이디 또는 비밀번호가 올바르지 않습니다."
      );
      return;
    }

    resetFields();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetFields();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>성적 관리 대시보드 로그인</DialogTitle>
          <DialogDescription>역할을 선택하고 로그인해주세요.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedRole("admin");
              setError(null);
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
              selectedRole === "admin"
                ? "border-admin bg-admin/10 text-admin ring-1 ring-admin"
                : "hover:bg-accent"
            )}
          >
            <ShieldCheck className="h-6 w-6" />
            <span className="font-medium">관리자(교사)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole("user");
              setError(null);
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
              selectedRole === "user"
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                : "hover:bg-accent"
            )}
          >
            <Users className="h-6 w-6" />
            <span className="font-medium">일반 사용자(학생/학부모)</span>
          </button>
        </div>

        {selectedRole === "admin" && (
          <div className="grid gap-2">
            <Label htmlFor="admin-password">관리자 비밀번호</Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="admin123"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <p className="text-xs text-muted-foreground">데모 비밀번호: admin123</p>
          </div>
        )}

        {selectedRole === "user" && (
          <div className="grid gap-2">
            <Label htmlFor="user-id">아이디</Label>
            <Input
              id="user-id"
              placeholder="student1"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <Label htmlFor="user-password">비밀번호</Label>
            <Input
              id="user-password"
              type="password"
              placeholder="1234"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <p className="text-xs text-muted-foreground">
              데모 계정: student1/1234 (연결 학생 전용) · viewer/1234 (전체 조회). 계정은
              관리자가 &ldquo;사용자 관리&rdquo;에서 추가·삭제할 수 있습니다.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "로그인 중..." : "로그인"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
