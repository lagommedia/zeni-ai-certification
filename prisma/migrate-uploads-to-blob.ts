// One-time migration of files that were saved to local disk (public/uploads)
// before the Vercel Blob switch. Uploads each referenced file to Blob and
// repoints the owning row's videoUrl/fileUrl at the new public URL.
// Local disk storage never survives a Vercel deploy, so any row still
// pointing at /uploads/... is a broken video/attachment in production.
import { config as loadDotenv } from "dotenv";
const shellDatabaseUrl = process.env.DATABASE_URL || undefined;
loadDotenv();
loadDotenv({ path: ".env.local", override: true });
if (shellDatabaseUrl) process.env.DATABASE_URL = shellDatabaseUrl;

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import path from "path";

const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

async function uploadLocalFile(localUrl: string): Promise<string> {
  const storedName = localUrl.replace(/^\/uploads\//, "");
  const filePath = path.join(__dirname, "..", "public", "uploads", storedName);
  const buffer = await readFile(filePath);
  const blob = await put(storedName, buffer, { access: "public", addRandomSuffix: false });
  return blob.url;
}

async function main() {
  const modules = await prisma.module.findMany({
    where: { videoUrl: { startsWith: "/uploads/" } },
    select: { id: true, title: true, videoUrl: true },
  });
  for (const m of modules) {
    const newUrl = await uploadLocalFile(m.videoUrl!);
    await prisma.module.update({ where: { id: m.id }, data: { videoUrl: newUrl } });
    console.log(`module "${m.title}": ${m.videoUrl} -> ${newUrl}`);
  }

  const blocks = await prisma.contentBlock.findMany({
    where: { fileUrl: { startsWith: "/uploads/" } },
    select: { id: true, fileName: true, fileUrl: true },
  });
  for (const b of blocks) {
    const newUrl = await uploadLocalFile(b.fileUrl!);
    await prisma.contentBlock.update({ where: { id: b.id }, data: { fileUrl: newUrl } });
    console.log(`content block "${b.fileName}": ${b.fileUrl} -> ${newUrl}`);
  }

  console.log(`\nDone: ${modules.length} module video(s), ${blocks.length} attachment(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
