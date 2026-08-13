// One-time import of prisma/sqlite-snapshot.json (produced by
// export-sqlite-data.ts) into the new Postgres database. Run against an
// empty, freshly-migrated Postgres DB — inserts in FK-safe order, preserving
// original ids so relations stay intact.
import { config as loadDotenv } from "dotenv";
const shellDatabaseUrl = process.env.DATABASE_URL || undefined;
loadDotenv();
loadDotenv({ path: ".env.local", override: true });
if (shellDatabaseUrl) process.env.DATABASE_URL = shellDatabaseUrl;

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFileSync } from "fs";
import path from "path";

const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

async function main() {
  const snapshotPath = path.join(__dirname, "sqlite-snapshot.json");
  const data = JSON.parse(readFileSync(snapshotPath, "utf-8"));

  const steps: Array<[string, () => Promise<{ count: number }>]> = [
    ["users", () => prisma.user.createMany({ data: data.users })],
    ["courses", () => prisma.course.createMany({ data: data.courses })],
    ["modules", () => prisma.module.createMany({ data: data.modules })],
    ["contentBlocks", () => prisma.contentBlock.createMany({ data: data.contentBlocks })],
    ["quizzes", () => prisma.quiz.createMany({ data: data.quizzes })],
    ["quizQuestions", () => prisma.quizQuestion.createMany({ data: data.quizQuestions })],
    ["quizChoices", () => prisma.quizChoice.createMany({ data: data.quizChoices })],
    ["enrollments", () => prisma.enrollment.createMany({ data: data.enrollments })],
    ["moduleProgress", () => prisma.moduleProgress.createMany({ data: data.moduleProgress })],
    ["certificates", () => prisma.certificate.createMany({ data: data.certificates })],
    ["notifications", () => prisma.notification.createMany({ data: data.notifications })],
    ["quizAttempts", () => prisma.quizAttempt.createMany({ data: data.quizAttempts })],
  ];

  for (const [label, run] of steps) {
    const result = await run();
    console.log(`${label}: inserted ${result.count}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
