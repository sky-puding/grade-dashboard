"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2, UserPlus } from "lucide-react";

import { PublicAccount, ScoreRecord } from "@/lib/types";
import { getUniqueStudents } from "@/lib/grade-utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return body.error ?? fallback;
}

function AccountRow({
  account,
  studentLabel,
  onChanged,
}: {
  account: PublicAccount;
  studentLabel: string;
  onChanged: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [justReset, setJustReset] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const handleResetPassword = async () => {
    setRowError(null);
    const res = await fetch(`/api/accounts/${encodeURIComponent(account.username)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
      setRowError(await parseError(res, "비밀번호 초기화에 실패했습니다."));
      return;
    }
    setNewPassword("");
    setJustReset(true);
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${account.username}" 계정을 삭제할까요?`)) return;
    const res = await fetch(`/api/accounts/${encodeURIComponent(account.username)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setRowError(await parseError(res, "계정 삭제에 실패했습니다."));
      return;
    }
    onChanged();
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{account.username}</TableCell>
      <TableCell>{account.name}</TableCell>
      <TableCell>
        {account.linkedStudentId ? (
          <Badge variant="secondary">{studentLabel}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">전체 조회</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Input
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setJustReset(false);
            }}
            placeholder="새 비밀번호"
            className="h-8 w-28 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2"
            disabled={!newPassword}
            onClick={handleResetPassword}
          >
            <KeyRound className="h-3.5 w-3.5" />
            초기화
          </Button>
          {justReset && <span className="text-xs text-emerald-600">완료</span>}
        </div>
        {rowError && <p className="mt-1 text-xs text-destructive">{rowError}</p>}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          삭제
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function UserManagementDialog({
  open,
  onOpenChange,
  records,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: ScoreRecord[];
}) {
  const students = getUniqueStudents(records);

  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [linkedStudentId, setLinkedStudentId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) setAccounts(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadAccounts();
  }, [open]);

  const studentLabel = (studentId?: string | null) => {
    if (!studentId) return "전체 조회";
    const s = students.find((s) => s.Student_ID === studentId);
    return s ? `${s.Grade}학년 ${s.Class}반 ${s.Name}` : studentId;
  };

  const handleAdd = async () => {
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: id,
        name,
        password,
        linkedStudentId: linkedStudentId === "none" ? undefined : linkedStudentId,
      }),
    });
    if (!res.ok) {
      setError(await parseError(res, "계정을 추가하지 못했습니다."));
      return;
    }
    setId("");
    setName("");
    setPassword("");
    setLinkedStudentId("none");
    await loadAccounts();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>사용자 관리</DialogTitle>
          <DialogDescription>
            일반 사용자(학생/학부모) 계정을 등록·삭제하고 비밀번호를 초기화합니다. 특정
            학생을 연결하면 해당 계정은 로그인 후 그 학생의 성적만 조회할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="new-account-id">아이디</Label>
            <Input id="new-account-id" value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-account-name">이름</Label>
            <Input id="new-account-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-account-password">초기 비밀번호</Label>
            <Input
              id="new-account-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>연결할 학생</Label>
            <Select value={linkedStudentId} onValueChange={setLinkedStudentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">연결 안 함 (전체 조회)</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.Student_ID} value={s.Student_ID}>
                    {s.Grade}학년 {s.Class}반 {s.Name} ({s.Student_ID})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

          <Button onClick={handleAdd} className="gap-1.5 sm:col-span-2">
            <UserPlus className="h-4 w-4" />
            계정 추가
          </Button>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>아이디</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>연결 학생</TableHead>
                <TableHead>비밀번호 초기화</TableHead>
                <TableHead className="text-right">삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    등록된 사용자 계정이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {accounts.map((account) => (
                <AccountRow
                  key={account.username}
                  account={account}
                  studentLabel={studentLabel(account.linkedStudentId)}
                  onChanged={loadAccounts}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
