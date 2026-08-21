import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@/generated/prisma/client";
import { postCertificateCelebration } from "@/lib/slack";

export function certNumber(courseId: string, userId: string) {
  return `ZC-${courseId.slice(-6).toUpperCase()}${userId.slice(-4).toUpperCase()}`;
}

export function progressPercent(completed: number, total: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export async function ensureEnrollment(userId: string, courseId: string) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return existing;

  const modules = await prisma.module.findMany({ where: { courseId } });

  return prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: EnrollmentStatus.NOT_STARTED,
      progress: {
        create: modules.map((m) => ({ moduleId: m.id, completed: false })),
      },
    },
  });
}

/** Module N (N>0) is unlocked only once module N-1 is completed. The first module is always unlocked. */
export function getUnlockedModuleIds(
  orderedModuleIds: string[],
  completedModuleIds: Set<string>
) {
  const unlocked = new Set<string>();
  for (let i = 0; i < orderedModuleIds.length; i++) {
    const id = orderedModuleIds[i];
    if (i === 0 || completedModuleIds.has(orderedModuleIds[i - 1])) {
      unlocked.add(id);
    } else {
      break;
    }
  }
  return unlocked;
}

async function recomputeEnrollmentStatus(enrollmentId: string, courseId: string) {
  const [totalModules, completedModules] = await Promise.all([
    prisma.module.count({ where: { courseId } }),
    prisma.moduleProgress.count({ where: { enrollmentId, completed: true } }),
  ]);

  const allModulesComplete = totalModules > 0 && completedModules === totalModules;
  const status = allModulesComplete
    ? EnrollmentStatus.COMPLETED
    : completedModules > 0
      ? EnrollmentStatus.IN_PROGRESS
      : EnrollmentStatus.NOT_STARTED;

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status, completedAt: allModulesComplete ? new Date() : null },
  });

  return { totalModules, completedModules, allModulesComplete, status };
}

/**
 * Issues the certificate if all modules are done and (no final exam exists, or
 * it's been passed). No-ops (but still returns the record) if already issued.
 * `certificate` is null only when the course isn't eligible yet.
 */
export async function issueCertificateIfEligible(userId: string, courseId: string) {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return { certificateIssued: false, certificate: existing };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || enrollment.status !== EnrollmentStatus.COMPLETED) {
    return { certificateIssued: false, certificate: null };
  }

  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: { finalExam: true },
  });

  if (course.finalExam) {
    const passed = await prisma.quizAttempt.findFirst({
      where: { quizId: course.finalExam.id, userId, passed: true },
    });
    if (!passed) return { certificateIssued: false, certificate: null };
  }

  const certificate = await prisma.certificate.create({
    data: { userId, courseId, certNumber: certNumber(courseId, userId) },
  });
  await prisma.notification.create({
    data: {
      userId,
      title: "Certificate earned!",
      message: `You completed ${course.title} and earned a certificate.`,
      type: "CERTIFICATE",
    },
  });

  const recipient = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  // Rendering the celebration GIF takes real time — don't make the student
  // wait on it before they see their certificate. Runs after the response
  // is sent, still guaranteed to complete before the function terminates.
  after(() =>
    postCertificateCelebration({
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      courseTitle: course.title,
      courseCategory: course.category,
      certNumber: certificate.certNumber,
      issuedAt: certificate.issuedAt,
    })
  );

  return { certificateIssued: true, certificate };
}

async function markModuleComplete(userId: string, moduleId: string) {
  const courseModule = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  const enrollment = await ensureEnrollment(userId, courseModule.courseId);

  await prisma.moduleProgress.upsert({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
    update: { completed: true, completedAt: new Date() },
    create: { enrollmentId: enrollment.id, moduleId, completed: true, completedAt: new Date() },
  });

  await recomputeEnrollmentStatus(enrollment.id, courseModule.courseId);
  const { certificateIssued } = await issueCertificateIfEligible(userId, courseModule.courseId);

  return { courseId: courseModule.courseId, certificateIssued };
}

/** Manual complete/incomplete toggle — only valid for modules that don't have a quiz. */
export async function setModuleCompletion(
  userId: string,
  moduleId: string,
  completed: boolean
) {
  const courseModule = await prisma.module.findUniqueOrThrow({
    where: { id: moduleId },
    include: { quiz: true },
  });
  if (courseModule.quiz) {
    throw new Error("This module has a quiz — complete it to progress.");
  }

  if (completed) {
    const { courseId, certificateIssued } = await markModuleComplete(userId, moduleId);
    return { courseId, certificateIssued };
  }

  const enrollment = await ensureEnrollment(userId, courseModule.courseId);
  await prisma.moduleProgress.upsert({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
    update: { completed: false, completedAt: null },
    create: { enrollmentId: enrollment.id, moduleId, completed: false, completedAt: null },
  });
  await recomputeEnrollmentStatus(enrollment.id, courseModule.courseId);
  return { courseId: courseModule.courseId, certificateIssued: false };
}

/** Marks a module's directly-uploaded video as watched-to-completion for this user. */
export async function markModuleVideoWatched(userId: string, moduleId: string) {
  const courseModule = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  const enrollment = await ensureEnrollment(userId, courseModule.courseId);

  await prisma.moduleProgress.upsert({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
    update: { videoWatched: true },
    create: { enrollmentId: enrollment.id, moduleId, completed: false, videoWatched: true },
  });

  return { courseId: courseModule.courseId };
}

/** Sets (or clears) the honor-system "I did the exercise" confirmation for a module. */
export async function setModuleHonorConfirmed(userId: string, moduleId: string, confirmed: boolean) {
  const courseModule = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  const enrollment = await ensureEnrollment(userId, courseModule.courseId);

  await prisma.moduleProgress.upsert({
    where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
    update: { honorConfirmed: confirmed },
    create: { enrollmentId: enrollment.id, moduleId, completed: false, honorConfirmed: confirmed },
  });

  return { courseId: courseModule.courseId };
}

function gradeAnswers(
  questions: { id: string; choices: { id: string; isCorrect: boolean }[] }[],
  answers: Record<string, string>,
  passingScore: number
) {
  const total = questions.length;
  const correct = questions.reduce((sum, q) => {
    const chosenId = answers[q.id];
    const chosen = q.choices.find((c) => c.id === chosenId);
    return sum + (chosen?.isCorrect ? 1 : 0);
  }, 0);
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, score, passed: score >= passingScore };
}

export async function submitModuleQuizAttempt(
  userId: string,
  moduleId: string,
  answers: Record<string, string>
) {
  const courseModule = await prisma.module.findUniqueOrThrow({
    where: { id: moduleId },
    include: { quiz: { include: { questions: { include: { choices: true }, orderBy: { order: "asc" } } } } },
  });
  if (!courseModule.quiz) throw new Error("This module doesn't have a quiz.");

  const result = gradeAnswers(courseModule.quiz.questions, answers, courseModule.quiz.passingScore);

  await prisma.quizAttempt.create({
    data: {
      quizId: courseModule.quiz.id,
      userId,
      score: result.score,
      passed: result.passed,
      answers,
    },
  });

  let certificateIssued = false;
  if (result.passed) {
    const outcome = await markModuleComplete(userId, moduleId);
    certificateIssued = outcome.certificateIssued;
  }

  return { ...result, courseId: courseModule.courseId, certificateIssued };
}

export async function submitFinalExamAttempt(
  userId: string,
  courseId: string,
  answers: Record<string, string>
) {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: { finalExam: { include: { questions: { include: { choices: true }, orderBy: { order: "asc" } } } } },
  });
  if (!course.finalExam) throw new Error("This course doesn't have a final exam.");

  const result = gradeAnswers(course.finalExam.questions, answers, course.finalExam.passingScore);

  await prisma.quizAttempt.create({
    data: {
      quizId: course.finalExam.id,
      userId,
      score: result.score,
      passed: result.passed,
      answers,
    },
  });

  let certificateIssued = false;
  let certificate = null;
  if (result.passed) {
    const outcome = await issueCertificateIfEligible(userId, courseId);
    certificateIssued = outcome.certificateIssued;
    certificate = outcome.certificate;
  }

  return { ...result, certificateIssued, certificate };
}
