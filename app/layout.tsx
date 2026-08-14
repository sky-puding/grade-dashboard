import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/session-provider";
import { DataProvider } from "@/lib/data-context";

export const metadata: Metadata = {
  title: "교사·학생 성적 관리 대시보드",
  description: "내신/모의고사 성적을 시각화하는 교사-학생 성적 관리 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthSessionProvider>
          <DataProvider>{children}</DataProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
