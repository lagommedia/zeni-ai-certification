import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueCertificateIfEligible } from "@/lib/courses";

const issueRequestSchema = z.object({
  courseId: z.string().min(1),
  // Optional — admins may issue on another user's behalf. Never trusted
  // as-is; see the ownership check below.
  userId: z.string().min(1).optional(),
});

/**
 * Issues (or returns the existing) certificate for a course. Certificates are
 * already auto-issued server-side the moment a student passes their final
 * requirement — this endpoint exists for callers that need to trigger/confirm
 * issuance explicitly (e.g. an internal tool). It re-validates eligibility
 * itself; it never trusts a client's claim that a course is "done".
 */
export async function POST(request: Request) {
  const requester = await getCurrentUser();
  if (!requester) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = issueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { courseId, userId: requestedUserId } = parsed.data;

  // Only admins may issue on someone else's behalf; everyone else can only
  // issue their own certificate. A non-admin passing another user's id is a
  // 403, not silently redirected to their own id.
  let targetUserId = requester.id;
  if (requestedUserId && requestedUserId !== requester.id) {
    if (requester.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetUser = await prisma.user.findUnique({ where: { id: requestedUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    targetUserId = requestedUserId;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const { certificateIssued, certificate } = await issueCertificateIfEligible(targetUserId, courseId);

  if (!certificate) {
    return NextResponse.json(
      {
        error:
          "Not eligible for a certificate yet — complete every module (and the final exam, if this course has one) first.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      certificate: {
        id: certificate.id,
        publicId: certificate.publicId,
        certNumber: certificate.certNumber,
        issuedAt: certificate.issuedAt,
        courseId: certificate.courseId,
        userId: certificate.userId,
      },
      created: certificateIssued,
    },
    { status: certificateIssued ? 201 : 200 }
  );
}
