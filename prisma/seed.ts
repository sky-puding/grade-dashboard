import "dotenv/config";
import bcrypt from "bcryptjs";
import { ExamCategory } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { STUDENTS, MOCK_SCORE_RECORDS } from "../lib/mock-data";

async function main() {
  console.log("시드 시작...");

  // 1) 학생 생성 (Student_ID → Prisma의 studentCode)
  const studentIdMap = new Map<string, string>(); // Student_ID -> Prisma 내부 id
  for (const s of STUDENTS) {
    const student = await prisma.student.upsert({
      where: { studentCode: s.Student_ID },
      update: { grade: s.Grade, classNo: s.Class, name: s.Name },
      create: {
        studentCode: s.Student_ID,
        grade: s.Grade,
        classNo: s.Class,
        name: s.Name,
      },
    });
    studentIdMap.set(s.Student_ID, student.id);
  }
  console.log(`학생 ${studentIdMap.size}명 생성 완료`);

  // 2) 더미 성적 데이터 생성 (내신/모의고사)
  let count = 0;
  for (const r of MOCK_SCORE_RECORDS) {
    const studentId = studentIdMap.get(r.Student_ID);
    if (!studentId) continue;

    const examCategory = r.Exam_Category === "내신" ? ExamCategory.SCHOOL : ExamCategory.MOCK;
    const data = {
      score: r.Score,
      rankInfo: r.Rank_Info,
      gradeLevel: r.Grade_Level,
      percentile: r.Percentile,
      standardScore: r.Standard_Score,
      schoolYear: r.School_Year,
      totalScore: r.Total_Score,
      scoreAverage: r.Score_Average,
    };

    await prisma.scoreRecord.upsert({
      where: {
        studentId_examCategory_examPeriod_subject: {
          studentId,
          examCategory,
          examPeriod: r.Exam_Period,
          subject: r.Subject,
        },
      },
      update: data,
      create: {
        studentId,
        examCategory,
        examPeriod: r.Exam_Period,
        subject: r.Subject,
        ...data,
      },
    });
    count++;
  }
  console.log(`성적 레코드 ${count}건 생성 완료`);

  // 3) 계정 생성: 관리자 1개 + 데모용 일반 사용자 2개
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await prisma.account.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPasswordHash,
      name: "관리자(교사)",
      role: "ADMIN",
    },
  });

  const demoPasswordHash = await bcrypt.hash("1234", 10);
  const firstStudentId = studentIdMap.get(STUDENTS[0].Student_ID);

  await prisma.account.upsert({
    where: { username: "student1" },
    update: {},
    create: {
      username: "student1",
      passwordHash: demoPasswordHash,
      name: `${STUDENTS[0].Name} 학생/학부모`,
      role: "USER",
      linkedStudentId: firstStudentId,
    },
  });

  await prisma.account.upsert({
    where: { username: "viewer" },
    update: {},
    create: {
      username: "viewer",
      passwordHash: demoPasswordHash,
      name: "전체 조회 계정",
      role: "USER",
    },
  });

  console.log("계정 시드 완료 (admin/admin123, student1/1234, viewer/1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
