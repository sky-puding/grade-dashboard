import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") return null;

        const account = await prisma.account.findUnique({
          where: { username },
        });
        if (!account) return null;

        const valid = await bcrypt.compare(password, account.passwordHash);
        if (!valid) return null;

        return {
          id: account.id,
          name: account.name,
          username: account.username,
          role: account.role,
          linkedStudentId: account.linkedStudentId ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.username = user.username;
        token.role = user.role;
        token.linkedStudentId = user.linkedStudentId ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub as string;
      session.user.username = token.username as string;
      session.user.role = token.role as "ADMIN" | "USER";
      session.user.linkedStudentId = token.linkedStudentId as string | null | undefined;
      return session;
    },
  },
});
