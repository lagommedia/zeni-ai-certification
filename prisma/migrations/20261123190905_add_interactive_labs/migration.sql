-- CreateEnum
CREATE TYPE "LabAttemptStatus" AS ENUM ('STARTED', 'COMPLETED');

-- AlterEnum
ALTER TYPE "ContentBlockType" ADD VALUE 'LAB';

-- AlterTable
ALTER TABLE "ContentBlock" ADD COLUMN     "labId" TEXT,
ADD COLUMN     "labRequired" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LabAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "status" "LabAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "furthestStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL,
    "mistakes" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabAttempt_blockId_idx" ON "LabAttempt"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "LabAttempt_userId_blockId_key" ON "LabAttempt"("userId", "blockId");

-- AddForeignKey
ALTER TABLE "LabAttempt" ADD CONSTRAINT "LabAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAttempt" ADD CONSTRAINT "LabAttempt_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
