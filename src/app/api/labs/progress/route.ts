import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { labEventSchema } from "@/lib/lab-events";
import { canAccessCourse, LabEventError, recordLabEvent } from "@/lib/labs";

const bodySchema = z.object({
  blockId: z.string().min(1),
  event: labEventSchema,
});

/**
 * Records a lab progress event reported by the learner's browser. The user is
 * taken from the session, never from the request body. Progress is reported
 * client-side, so a determined learner could fake it with dev tools — fine
 * for training records, not for anything exam-like.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Requiring JSON forces a CORS preflight on any cross-site caller.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { blockId, event } = parsed.data;

  const block = await prisma.contentBlock.findUnique({
    where: { id: blockId },
    select: { id: true, type: true, labId: true, module: { select: { courseId: true } } },
  });
  if (!block || block.type !== "LAB") {
    return NextResponse.json({ error: "Lab not found" }, { status: 404 });
  }
  if (!(await canAccessCourse(user, block.module.courseId))) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  try {
    const attempt = await recordLabEvent(user.id, block, event);
    return NextResponse.json({ attempt });
  } catch (err) {
    if (err instanceof LabEventError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
