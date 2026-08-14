"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { LayoutDashboard, LogIn } from "lucide-react";

import { useScoreData } from "@/lib/data-context";
import { filterByGradeClass, getGradeClassOptions } from "@/lib/grade-utils";
import { Header } from "@/components/header";
import { LoginDialog } from "@/components/login-dialog";
import { UploadDialog } from "@/components/upload-dialog";
import { UserManagementDialog } from "@/components/user-management-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { IndividualAnalysisTab } from "@/components/individual-analysis-tab";
import { GroupAnalysisTab } from "@/components/group-analysis-tab";

export default function Home() {
  const { data: session, status } = useSession();
  const { records } = useScoreData();

  const role = session?.user?.role === "ADMIN" ? "admin" : session?.user?.role === "USER" ? "user" : null;

  const [loginOpen, setLoginOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") setLoginOpen(true);
  }, [status]);

  const gradeClassOptions = useMemo(() => getGradeClassOptions(records), [records]);

  // 학생이 연결된 계정으로 로그인하면 /api/records가 서버에서 이미 그 학생 것만
  // 내려주므로, 여기서는 그 결과를 그대로 쓰면 된다 (다시 필터링할 필요 없음).
  const isLinkedUser = role === "user" && !!session?.user?.linkedStudentId;

  const filteredRecords = useMemo(() => {
    if (isLinkedUser) return records;
    return filterByGradeClass(records, selectedGrade, selectedClass);
  }, [records, selectedGrade, selectedClass, isLinkedUser]);

  const lockedStudentId = isLinkedUser ? filteredRecords[0]?.Student_ID : undefined;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header
        gradeClassOptions={gradeClassOptions}
        selectedGrade={selectedGrade}
        selectedClass={selectedClass}
        onGradeChange={(g) => {
          setSelectedGrade(g);
          setSelectedClass(null);
        }}
        onClassChange={setSelectedClass}
        onOpenLogin={() => setLoginOpen(true)}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenUserManagement={() => setUserManagementOpen(true)}
      />

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      {role === "admin" && <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />}
      {role === "admin" && (
        <UserManagementDialog
          open={userManagementOpen}
          onOpenChange={setUserManagementOpen}
          records={records}
        />
      )}

      <main className="container py-6">
        {role === null ? (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
              <p className="text-sm text-muted-foreground">
                관리자(교사) 또는 일반 사용자(학생/학부모)로 로그인 후 대시보드를 확인할 수 있습니다.
              </p>
            </div>
            <Button onClick={() => setLoginOpen(true)} className="gap-1.5">
              <LogIn className="h-4 w-4" />
              로그인하기
            </Button>
          </div>
        ) : lockedStudentId ? (
          <IndividualAnalysisTab records={filteredRecords} lockedStudentId={lockedStudentId} />
        ) : (
          <Tabs defaultValue="individual">
            <TabsList>
              <TabsTrigger value="individual">개별 학생 종합 분석</TabsTrigger>
              <TabsTrigger value="group">학급/그룹별 분석</TabsTrigger>
            </TabsList>

            <TabsContent value="individual">
              <IndividualAnalysisTab records={filteredRecords} />
            </TabsContent>
            <TabsContent value="group">
              <GroupAnalysisTab records={filteredRecords} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
