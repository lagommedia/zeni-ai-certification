import type { LabEvent } from "@/lib/lab-events";

export type LabAttemptState = {
  status: "STARTED" | "COMPLETED";
  furthestStep: number;
  totalSteps: number;
  mistakes: number;
  startedAt: Date;
  completedAt: Date | null;
  lastEventAt: Date;
};

/**
 * Folds one lab event into a learner's saved attempt (pure — no I/O).
 *
 * The saved record is the learner's *best* result, not the latest run:
 *  - a COMPLETED attempt never goes back to STARTED, however often it's retaken
 *    (a retake that finishes with fewer mistakes lowers the stored count);
 *  - `furthestStep` only ever rises;
 *  - `mistakes` tracks the run that reached the furthest step, so a fresh
 *    retake that's still on step 1 doesn't zero out an earlier run's count;
 *  - `startedAt` restarts when an unfinished attempt is started again, so
 *    time-to-complete measures the run that actually finished.
 */
export function applyLabEvent(existing: LabAttemptState | null, event: LabEvent, now: Date): LabAttemptState {
  const base: LabAttemptState = existing ?? {
    status: "STARTED",
    furthestStep: 0,
    totalSteps: event.total,
    mistakes: 0,
    startedAt: now,
    completedAt: null,
    lastEventAt: now,
  };
  const next: LabAttemptState = { ...base, totalSteps: event.total, lastEventAt: now };

  if (base.status === "COMPLETED") {
    next.furthestStep = next.totalSteps;
    if (event.type === "completed" && event.mistakes < base.mistakes) next.mistakes = event.mistakes;
    return next;
  }

  switch (event.type) {
    case "started":
      if (existing) next.startedAt = now;
      break;
    case "step_completed":
      if (event.step >= base.furthestStep) {
        next.furthestStep = event.step;
        next.mistakes = event.mistakes;
      }
      break;
    case "mistake":
      // A mistake on step N means N-1 steps are done.
      if (event.step - 1 >= base.furthestStep) next.mistakes = event.mistakes;
      break;
    case "completed":
      next.status = "COMPLETED";
      next.furthestStep = event.total;
      next.mistakes = event.mistakes;
      next.completedAt = now;
      break;
  }
  return next;
}
