import { DefaultSession } from "next-auth";

// NextAuth의 기본 Session/User/JWT 타입에 우리 서비스 전용 필드(role, linkedStudentId,
// username)를 추가한다. 이렇게 해두면 session.user.role 처럼 써도 타입 에러가 안 난다.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "ADMIN" | "USER";
      linkedStudentId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    role: "ADMIN" | "USER";
    linkedStudentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string;
    role: "ADMIN" | "USER";
    linkedStudentId?: string | null;
  }
}
