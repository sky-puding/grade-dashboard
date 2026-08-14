# DB 연동 설계 문서 (Vercel 배포 대비)

> 목표: 지금은 새로고침하면 사라지는 브라우저 메모리 상태(관리자 계정, 업로드한 성적)를
> 실제 데이터베이스에 영구 저장하고, 로그인도 진짜 세션 기반으로 바꾼다.
> Vercel에 배포할 계획이 있으므로 **로컬 파일 DB(SQLite)가 아니라 처음부터 호스팅 Postgres**를 기준으로 설계한다.

## 1. 기술 스택 결정

| 영역 | 선택 | 이유 |
|---|---|---|
| DB | **Postgres (Neon)** | Vercel과 공식 파트너십 · 서버리스 환경에 최적화 · 무료 티어 제공 |
| ORM | **Prisma** | 스키마를 코드로 관리, 마이그레이션 자동 생성, TypeScript 타입 자동完성 |
| 인증 | **NextAuth.js (Auth.js) v5** + `bcryptjs` | Next.js App Router 표준 인증 라이브러리, 세션 쿠키 자동 관리 |
| API | **Next.js Route Handlers** (`app/api/**/route.ts`) | 별도 백엔드 서버 없이 같은 프로젝트 안에서 API 구현 가능 |

Supabase도 대안이 될 수 있지만, Vercel 배포가 확정되어 있으므로 Neon을 1순위로 추천한다(Vercel 대시보드에서 클릭 몇 번으로 바로 연결 가능).

## 2. 데이터베이스 스키마 (Prisma)

기존 `ScoreRecord` 하나에 학생 정보(Grade/Class/Name)를 매 행마다 중복 저장하던 구조를, `Student` 테이블로 정규화한다. 계정의 "연결된 학생"도 FK로 명확히 연결된다.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  USER
}

enum ExamCategory {
  SCHOOL // 내신
  MOCK   // 모의고사
}

model Account {
  id               String   @id @default(cuid())
  username         String   @unique
  passwordHash     String
  name             String
  role             Role     @default(USER)
  linkedStudentId  String?
  linkedStudent    Student? @relation(fields: [linkedStudentId], references: [id])
  createdAt        DateTime @default(now())
}

model Student {
  id          String        @id @default(cuid())
  studentCode String        @unique // 기존 Student_ID (예: "10203")
  grade       Int
  classNo     Int
  name        String
  records     ScoreRecord[]
  accounts    Account[]
}

model ScoreRecord {
  id            String       @id @default(cuid())
  student       Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentId     String
  examCategory  ExamCategory
  examPeriod    String       // "중간"/"기말"/"학기말" 또는 "3월"/"6월"/"9월"/"10월"
  subject       String
  score         Float
  rankInfo      String?
  gradeLevel    Int?
  percentile    Float?
  standardScore Float?
  schoolYear    Int?
  totalScore    Float?
  scoreAverage  Float?
  createdAt     DateTime     @default(now())

  @@unique([studentId, examCategory, examPeriod, subject])
}
```

`@@unique([studentId, examCategory, examPeriod, subject])`가 핵심이다. 같은 학생·같은 회차·같은 과목 데이터를 다시 업로드하면 새 행을 추가하는 게 아니라 **덮어쓰기(upsert)** 되도록 하기 위함이다. 지금 프론트엔드의 "전체 교체/기존 데이터에 추가" 옵션과 대응된다.

## 3. API 엔드포인트 설계

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | - | NextAuth 표준 핸들러 (로그인/로그아웃/세션) |
| `GET` | `/api/students` | 로그인 필요 | 학생 목록 (필터 드롭다운용) |
| `GET` | `/api/records` | 로그인 필요 | 성적 조회. `linkedStudentId`가 있는 계정은 서버에서 강제로 해당 학생만 필터링 |
| `POST` | `/api/records/bulk` | 관리자 전용 | 엑셀 파싱 결과(`ScoreRecord[]`)를 받아 upsert. `mode: replace\|append` |
| `GET` | `/api/accounts` | 관리자 전용 | 계정 목록 |
| `POST` | `/api/accounts` | 관리자 전용 | 계정 생성 (비밀번호는 서버에서 bcrypt 해시) |
| `PATCH` | `/api/accounts/:id/password` | 관리자 전용 | 비밀번호 초기화 |
| `DELETE` | `/api/accounts/:id` | 관리자 전용 | 계정 삭제 |

**중요한 보안 원칙**: `linkedStudentId`로 조회 범위를 제한하는 로직은 지금처럼 프론트엔드(`page.tsx`)에서만 하면 안 되고, `/api/records`가 세션의 `linkedStudentId`를 서버에서 직접 확인해서 쿼리 자체를 제한해야 한다. 그래야 사용자가 개발자 도구로 API를 직접 호출해도 다른 학생 데이터를 볼 수 없다.

## 4. 인증 흐름

- `Account` 테이블에 관리자 계정도 똑같이 저장한다 (지금처럼 코드에 하드코딩된 `admin123`이 아니라, seed 스크립트로 최초 1회 생성). 나중에 관리자 비밀번호도 "사용자 관리" 화면에서 바꿀 수 있게 된다.
- NextAuth `CredentialsProvider`의 `authorize()` 콜백에서 `bcrypt.compare()`로 비밀번호 검증 → 성공 시 세션에 `{ id, role, linkedStudentId }` 담기.
- Credentials 로그인은 DB 세션이 아니라 **JWT 세션 전략**을 쓴다 (NextAuth 제약사항). `NEXTAUTH_SECRET` 환경변수 필요.
- 클라이언트에서는 `useSession()` 훅으로 지금의 `useAuth()`를 대체한다.

## 5. 프론트엔드 변경 범위

기존 코드를 최대한 재사용하는 방향으로 설계했다.

- **그대로 재사용**: `lib/excel.ts`(엑셀 파싱 로직), `lib/grade-utils.ts`(평균등급/태그/분포 계산), 모든 차트·테이블 컴포넌트, `components/ui/*`
- **교체**: `lib/auth-context.tsx` → NextAuth `useSession()` 기반으로 재작성
- **교체**: `lib/data-context.tsx` → `useSWR('/api/records', fetcher)` 같은 데이터 패칭 훅으로 재작성 (또는 React Query)
- **수정**: `upload-dialog.tsx` → 지금처럼 클라이언트에서 엑셀을 파싱한 뒤, `replaceRecords()`를 직접 호출하는 대신 `POST /api/records/bulk`로 전송
- **수정**: `user-management-dialog.tsx` → `addAccount`/`removeAccount`/`resetPassword`가 로컬 상태 대신 위 API를 호출

## 6. 단계별 마이그레이션 순서

1. Neon(neon.tech)에서 무료 프로젝트 생성 → `DATABASE_URL` 발급
2. 프로젝트에 의존성 추가: `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`
3. `.env`에 `DATABASE_URL`, `NEXTAUTH_SECRET` 추가 (`.env`는 반드시 `.gitignore`에 포함 — 지금 프로젝트는 이미 포함되어 있음)
4. `prisma/schema.prisma` 작성 → `npx prisma migrate dev --name init` 실행 (Neon에 실제 테이블 생성됨)
5. `prisma/seed.ts` 작성: 관리자 계정 1개 + 기존 `mock-data.ts`의 더미 성적을 초기 데이터로 삽입 → `npx prisma db seed`
6. API 라우트 구현 (`app/api/**/route.ts`)
7. `auth-context.tsx`, `data-context.tsx`를 API 기반으로 교체
8. 로컬에서 `npm run dev`로 전체 기능(로그인 유지, 업로드 반영, 계정 관리) 재검증
9. Vercel 프로젝트 생성 → 환경변수(`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)를 Vercel 대시보드에 등록 → 배포
10. 배포 후 최초 1회 `npx prisma migrate deploy`로 운영 DB에 스키마 반영 (Vercel 빌드 스크립트에 포함 가능)

## 7. 참고: 지금 안 바꿔도 되는 것

- `MOCK_SUBJECT_COLUMNS`, `MOCK_PERIOD_ORDER` 등 엑셀 서식 관련 상수·파서는 DB 유무와 무관하게 그대로 쓴다.
- 등급 계산식(석차 기반 5등급, 절대평가 등급 등)도 그대로 서버든 클라이언트든 재사용 가능한 순수 함수라 변경이 필요 없다.

---

이 문서는 설계만 정리한 것으로, 아직 코드에는 반영하지 않았습니다. 진행하기로 하면 이 순서(2번 항목)대로 하나씩 구현해나가면 됩니다.
