import { z } from "zod";

// Shape of the progress messages a lab file posts to its parent window. Shared
// by the browser (which filters messages before forwarding them) and the
// server (which re-validates everything — the browser is never trusted).

const common = {
  source: z.literal("zeni-lab"),
  version: z.literal(1),
  labId: z.string().min(1).max(100),
  total: z.number().int().min(1).max(50),
};
const mistakes = z.number().int().min(0).max(1000);
const step = z.number().int().min(1).max(50);

export const labEventSchema = z.discriminatedUnion("type", [
  z.object({ ...common, type: z.literal("started") }),
  z.object({ ...common, type: z.literal("step_completed"), step, mistakes }),
  z.object({ ...common, type: z.literal("mistake"), step, mistakes }),
  z.object({ ...common, type: z.literal("completed"), mistakes }),
]);

export type LabEvent = z.infer<typeof labEventSchema>;

/** What the UI needs to know about a learner's saved attempt at a lab. */
export type LabAttemptView = {
  status: "STARTED" | "COMPLETED";
  // Highest step completed so far (0..totalSteps).
  furthestStep: number;
  totalSteps: number;
  mistakes: number;
  completedAt: string | null;
};
