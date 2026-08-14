import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Next.js는 개발 모드에서 파일을 저장할 때마다(hot reload) 모듈을 다시 로드하는데,
// 그때마다 새 PrismaClient를 만들면 DB 연결이 계속 쌓여 "너무 많은 연결" 에러가 날 수 있다.
// 그래서 전역(globalThis)에 인스턴스를 하나만 캐싱해서 재사용한다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
