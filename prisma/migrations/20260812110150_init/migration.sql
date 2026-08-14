-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ExamCategory" AS ENUM ('SCHOOL', 'MOCK');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "linkedStudentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "classNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examCategory" "ExamCategory" NOT NULL,
    "examPeriod" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rankInfo" TEXT,
    "gradeLevel" INTEGER,
    "percentile" DOUBLE PRECISION,
    "standardScore" DOUBLE PRECISION,
    "schoolYear" INTEGER,
    "totalScore" DOUBLE PRECISION,
    "scoreAverage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentCode_key" ON "Student"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreRecord_studentId_examCategory_examPeriod_subject_key" ON "ScoreRecord"("studentId", "examCategory", "examPeriod", "subject");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_linkedStudentId_fkey" FOREIGN KEY ("linkedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRecord" ADD CONSTRAINT "ScoreRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
