// One-off data migration: swap Module 1's downloadable "Lab 1" attachment in
// the AI Accountant course for an in-app, required Interactive lab block.
//
//   npx tsx --env-file=.env --env-file=.env.local scripts/migrate-module1-lab.ts            # dry run
//   npx tsx --env-file=.env --env-file=.env.local scripts/migrate-module1-lab.ts --apply    # do it
//
// Run --apply only AFTER the interactive-labs code is deployed: a LAB row
// makes any build that predates the LAB enum value throw when it reads that
// module's blocks. Idempotent (a second run finds the lab and does nothing),
// and it never touches the course's published state.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const COURSE_ID = argValue("--course-id") ?? "cmwo0tkpx000004lay9vsvh2u";
const LAB_FILE = argValue("--file") ?? `${homedir()}/Downloads/Zeni-AI-Accountant-Lab-1.html`;
const APPLY = process.argv.includes("--apply");

const LAB_ID = "ai-accountant-lab-1";
const LAB_TITLE = "Lab 1: Find your way around the AI Accountant";
const LAB_DESCRIPTION =
  "A clickable practice copy of the AI Accountant with sample data from the Pied Piper demo tenant. It takes about 5 minutes and your progress is saved. Finish it to unlock the module quiz.";
const HONOR_HEADING = "now it's your turn";
const OLD_SENTENCE = "Download **Lab 1** below and open the file in your browser for a hands-on practice run";
const NEW_SENTENCE = "Start **Lab 1** below for a hands-on practice run";

function argValue(flag: string) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL ?? "") });

async function main() {
  const course = await prisma.course.findUnique({
    where: { id: COURSE_ID },
    include: { modules: { orderBy: { order: "asc" }, take: 1, include: { blocks: { orderBy: { order: "asc" } } } } },
  });
  if (!course) throw new Error(`Course ${COURSE_ID} not found`);
  const module1 = course.modules[0];
  if (!module1) throw new Error("The course has no modules");

  console.log(`Course: ${course.title} (published: ${course.published}) — left as is`);
  console.log(`Module 1: ${module1.title}`);

  const existingLab = module1.blocks.find((b) => b.type === "LAB" && b.labId === LAB_ID);
  if (existingLab) {
    console.log(`Already migrated (LAB block ${existingLab.id} exists). Nothing to do.`);
    return;
  }

  const callouts = module1.blocks.filter(
    (b) => b.type === "CALLOUT" && b.heading?.trim().toLowerCase() === HONOR_HEADING
  );
  if (callouts.length !== 1) throw new Error(`Expected exactly one "Now it's your turn" callout, found ${callouts.length}`);
  const callout = callouts[0];
  if (!callout.body?.includes(OLD_SENTENCE)) {
    throw new Error("The callout no longer contains the expected 'Download **Lab 1** below…' sentence — not guessing, aborting.");
  }

  const laterBlocks = module1.blocks.filter((b) => b.order > callout.order);
  console.log(`Callout ${callout.id} at order ${callout.order}; attachment: ${callout.fileName ?? "none"}`);
  console.log(`Plan:`);
  console.log(`  1. upload ${LAB_FILE} to Blob`);
  console.log(`  2. shift ${laterBlocks.length} later block(s) down by one`);
  console.log(`  3. create required LAB block "${LAB_TITLE}" (labId ${LAB_ID}) at order ${callout.order + 1}`);
  console.log(`  4. callout: "${OLD_SENTENCE}" -> "${NEW_SENTENCE}", remove the attachment`);
  console.log(`  5. delete the old attachment from Blob`);

  if (!APPLY) {
    console.log("\nDry run only — re-run with --apply to make these changes.");
    return;
  }

  const labHtml = readFileSync(LAB_FILE);
  if (!labHtml.includes("zeni-lab")) throw new Error("That file doesn't report progress (no 'zeni-lab' events) — wrong version?");
  const blob = await put(`${randomUUID()}.html`, labHtml, { access: "public", addRandomSuffix: false, contentType: "text/html" });

  const oldAttachmentUrl = callout.fileUrl;
  try {
    await prisma.$transaction([
      prisma.contentBlock.updateMany({
        where: { moduleId: module1.id, order: { gt: callout.order } },
        data: { order: { increment: 1 } },
      }),
      prisma.contentBlock.create({
        data: {
          moduleId: module1.id,
          type: "LAB",
          order: callout.order + 1,
          heading: LAB_TITLE,
          body: LAB_DESCRIPTION,
          fileUrl: blob.url,
          fileName: "Zeni-AI-Accountant-Lab-1.html",
          labId: LAB_ID,
          labRequired: true,
        },
      }),
      prisma.contentBlock.update({
        where: { id: callout.id },
        data: { body: callout.body.replace(OLD_SENTENCE, NEW_SENTENCE), fileUrl: null, fileName: null },
      }),
    ]);
  } catch (err) {
    await del(blob.url).catch(() => {});
    throw err;
  }

  if (oldAttachmentUrl) await del(oldAttachmentUrl).catch(() => {});
  console.log("\nMigrated. Module 1 now has a required LAB block right after the callout.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
