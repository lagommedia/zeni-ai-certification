import "server-only";
import { prisma } from "@/lib/prisma";
import { applyLabEvent } from "@/lib/lab-state";
import type { LabAttemptView, LabEvent } from "@/lib/lab-events";

export const MAX_LAB_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class LabEventError extends Error {}

type AttemptRow = {
  status: "STARTED" | "COMPLETED";
  furthestStep: number;
  totalSteps: number;
  mistakes: number;
  completedAt: Date | null;
};

export function toLabAttemptView(row: AttemptRow): LabAttemptView {
  return {
    status: row.status,
    furthestStep: row.furthestStep,
    totalSteps: row.totalSteps,
    mistakes: row.mistakes,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

/** Admins can open any lab; everyone else needs an enrollment in the lab's course. */
export async function canAccessCourse(user: { id: string; role: string }, courseId: string) {
  if (user.role === "ADMIN") return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  });
  return enrollment !== null;
}

/**
 * Records one lab event for a learner. The user always comes from the
 * session — never from the event. Safe to call concurrently; a lost race on
 * the first insert is retried as an update.
 */
export async function recordLabEvent(
  userId: string,
  block: { id: string; labId: string | null },
  event: LabEvent
): Promise<LabAttemptView> {
  if (block.labId && event.labId !== block.labId) {
    throw new LabEventError("This event came from a different lab than the one on this block.");
  }
  if ("step" in event && event.step > event.total) {
    throw new LabEventError("Step is past the lab's total steps.");
  }

  for (let attempt = 0; ; attempt++) {
    try {
      const saved = await prisma.$transaction(async (tx) => {
        const existing = await tx.labAttempt.findUnique({
          where: { userId_blockId: { userId, blockId: block.id } },
        });
        const next = applyLabEvent(existing, event, new Date());
        return existing
          ? tx.labAttempt.update({ where: { id: existing.id }, data: next })
          : tx.labAttempt.create({ data: { ...next, userId, blockId: block.id } });
      });
      return toLabAttemptView(saved);
    } catch (err) {
      if (attempt === 0 && (err as { code?: string }).code === "P2002") continue;
      throw err;
    }
  }
}

/** Required LAB blocks in a module that this learner hasn't completed yet. */
export async function getUnmetRequiredLabs(userId: string, moduleId: string) {
  const labs = await prisma.contentBlock.findMany({
    where: { moduleId, type: "LAB", labRequired: true },
    select: { id: true, heading: true },
  });
  if (labs.length === 0) return [];

  const completed = await prisma.labAttempt.findMany({
    where: { userId, blockId: { in: labs.map((l) => l.id) }, status: "COMPLETED" },
    select: { blockId: true },
  });
  const completedIds = new Set(completed.map((c) => c.blockId));
  return labs.filter((l) => !completedIds.has(l.id));
}

export const LAB_REQUIRED_MESSAGE = "Finish the lab to continue.";

export async function assertRequiredLabsDone(userId: string, moduleId: string) {
  const unmet = await getUnmetRequiredLabs(userId, moduleId);
  if (unmet.length > 0) throw new Error(LAB_REQUIRED_MESSAGE);
}
