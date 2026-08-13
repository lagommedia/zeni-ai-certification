// One-time snapshot of the local SQLite dev.db, taken immediately before
// switching the schema/adapter to Postgres. Run with the SQLite adapter
// still in place (see prisma/import-postgres-data.ts for the reverse step).
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { writeFileSync } from "fs";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const data = {
    users: await prisma.user.findMany(),
    courses: await prisma.course.findMany(),
    modules: await prisma.module.findMany(),
    contentBlocks: await prisma.contentBlock.findMany(),
    quizzes: await prisma.quiz.findMany(),
    quizQuestions: await prisma.quizQuestion.findMany(),
    quizChoices: await prisma.quizChoice.findMany(),
    enrollments: await prisma.enrollment.findMany(),
    moduleProgress: await prisma.moduleProgress.findMany(),
    certificates: await prisma.certificate.findMany(),
    notifications: await prisma.notification.findMany(),
    quizAttempts: await prisma.quizAttempt.findMany(),
  };

  const outPath = path.join(__dirname, "sqlite-snapshot.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  for (const [key, rows] of Object.entries(data)) {
    console.log(`${key}: ${rows.length}`);
  }
  console.log(`\nWrote snapshot to ${outPath}`);
}

main().finally(() => prisma.$disconnect());
