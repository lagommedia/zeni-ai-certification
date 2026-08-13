import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureEnrollment, getUnlockedModuleIds, progressPercent } from "@/lib/courses";
import { resolveVideoEmbed } from "@/lib/video";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { VideoEmbed } from "@/components/video-embed";
import { ModuleContent } from "@/components/module-content";
import {
  CheckCircle2,
  Circle,
  Clock,
  Award,
  ArrowLeft,
  Lock,
  GraduationCap,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { toggleModuleAction } from "./actions";
import { isHonorCallout, OBJECTIVES_BLOCK_HEADING } from "@/lib/module-content";

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { quiz: { include: { questions: true } }, blocks: { orderBy: { order: "asc" } } },
      },
      finalExam: { include: { questions: true } },
    },
  });
  if (!course) notFound();

  const enrollment = await ensureEnrollment(user.id, courseId);
  const progressRows = await prisma.moduleProgress.findMany({
    where: { enrollmentId: enrollment.id },
  });
  const progressByModuleId = new Map(progressRows.map((p) => [p.moduleId, p]));
  const completedIds = new Set(progressRows.filter((p) => p.completed).map((p) => p.moduleId));
  const unlockedIds = getUnlockedModuleIds(
    course.modules.map((m) => m.id),
    completedIds
  );

  const quizIds = [
    ...course.modules.map((m) => m.quiz?.id).filter((id): id is string => !!id),
    ...(course.finalExam ? [course.finalExam.id] : []),
  ];
  const attempts = quizIds.length
    ? await prisma.quizAttempt.findMany({
        where: { userId: user.id, quizId: { in: quizIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const latestAttempt = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    if (!latestAttempt.has(attempt.quizId)) latestAttempt.set(attempt.quizId, attempt);
  }

  const certificate = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });

  const percent = progressPercent(completedIds.size, course.modules.length);
  const allModulesComplete = enrollment.status === "COMPLETED";
  const courseFullyComplete = !!certificate;
  const finalExamAttempt = course.finalExam ? latestAttempt.get(course.finalExam.id) : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/courses"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to courses
      </Link>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{course.category}</Badge>
          <Badge variant="outline">{LEVEL_LABEL[course.level]}</Badge>
        </div>
        <h1 className="text-h5 font-medium text-sapphire">{course.title}</h1>
        <p className="text-muted-foreground">{course.description}</p>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="size-4" />
          {course.durationMins} min · {course.modules.length} modules
          {course.finalExam && " · final exam"}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{percent}% complete</span>
            {courseFullyComplete && (
              <span className="flex items-center gap-1 font-medium text-success">
                <CheckCircle2 className="size-4" />
                Course completed
              </span>
            )}
          </div>
          <Progress value={percent} />
        </div>

        {courseFullyComplete ? (
          <div className="mt-1 flex items-center justify-between rounded-lg border bg-accent/40 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Award className="size-4 text-sapphire" />
              You earned a certificate for this course.
            </div>
            <Button
              render={<Link href="/certificates" />}
              nativeButton={false}
              size="sm"
              variant="outline"
            >
              View certificate
            </Button>
          </div>
        ) : (
          allModulesComplete &&
          course.finalExam && (
            <div className="mt-1 flex items-center justify-between rounded-lg border bg-accent/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <GraduationCap className="size-4 text-sapphire" />
                All modules complete — pass the final exam to earn your certificate.
              </div>
              <Button
                render={<Link href={`/courses/${course.id}/exam`} />}
                nativeButton={false}
                size="sm"
              >
                Take final exam
              </Button>
            </div>
          )
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Modules
        </h2>
        {course.modules.map((module, index) => {
          const completed = completedIds.has(module.id);
          const locked = !unlockedIds.has(module.id);
          const hasQuiz = !!module.quiz;
          const attempt = module.quiz ? latestAttempt.get(module.quiz.id) : undefined;
          const objectivesBlock = module.blocks.find((b) => b.heading === OBJECTIVES_BLOCK_HEADING);
          const otherBlocks = module.blocks.filter((b) => b.heading !== OBJECTIVES_BLOCK_HEADING);
          const moduleProgress = progressByModuleId.get(module.id);
          const videoWatched = moduleProgress?.videoWatched ?? false;
          const honorConfirmed = moduleProgress?.honorConfirmed ?? false;
          const requiresVideoWatch =
            hasQuiz && !!module.videoUrl && resolveVideoEmbed(module.videoUrl).kind === "file";
          const requiresHonorConfirm = hasQuiz && otherBlocks.some(isHonorCallout);
          const videoLocked = requiresVideoWatch && !videoWatched;
          const honorLocked = requiresHonorConfirm && !honorConfirmed;
          const quizLocked = videoLocked || honorLocked;

          return (
            <details
              key={module.id}
              open={!completed}
              className={`group rounded-xl border bg-card ${locked ? "opacity-60" : ""}`}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between [&::-webkit-details-marker]:hidden">
                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    {locked ? (
                      <Lock className="size-5 text-muted-foreground" />
                    ) : completed ? (
                      <CheckCircle2 className="size-5 text-success" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Module {index + 1} · {module.durationMins} min
                      {hasQuiz && !locked && " · quiz required"}
                    </p>
                    <h3 className="font-medium leading-snug">{module.title}</h3>
                    {module.subtitle && !locked && (
                      <p className="text-sm text-muted-foreground">{module.subtitle}</p>
                    )}
                    {locked && (
                      <p className="text-sm text-muted-foreground">
                        Complete the previous module to unlock.
                      </p>
                    )}
                  </div>
                </div>

                {!locked && (
                  <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                )}
              </summary>

              {!locked && (
                <div className="flex flex-col gap-4 border-t px-5 pb-5 pt-4">
                  {!hasQuiz && (
                    <form action={toggleModuleAction} className="self-end">
                      <input type="hidden" name="moduleId" value={module.id} />
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="nextCompleted" value={(!completed).toString()} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={completed ? "outline" : "default"}
                        className="w-full sm:w-auto"
                      >
                        {completed ? "Mark incomplete" : "Mark complete"}
                      </Button>
                    </form>
                  )}

                  {objectivesBlock && <ModuleContent blocks={[objectivesBlock]} />}

                  {module.videoUrl && (
                    <VideoEmbed url={module.videoUrl} moduleId={module.id} videoWatched={videoWatched} />
                  )}

                  {otherBlocks.length > 0 && (
                    <ModuleContent blocks={otherBlocks} moduleId={module.id} honorConfirmed={honorConfirmed} />
                  )}

                  {hasQuiz && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-secondary/40 px-4 py-3">
                      {completed ? (
                        <span className="flex items-center gap-2 text-sm font-medium text-success">
                          <CheckCircle2 className="size-4" />
                          Quiz passed{attempt ? ` · ${attempt.score}%` : ""}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            {module.quiz!.questions.length} question
                            {module.quiz!.questions.length === 1 ? "" : "s"} · {module.quiz!.passingScore}% to
                            pass
                          </span>
                          {attempt && !attempt.passed && (
                            <span className="flex items-center gap-1 text-xs text-attention">
                              <RotateCcw className="size-3" />
                              Last attempt: {attempt.score}% — try again
                            </span>
                          )}
                          {videoLocked && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Lock className="size-3" />
                              Watch the video above to unlock the quiz
                            </span>
                          )}
                          {honorLocked && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Lock className="size-3" />
                              Check &ldquo;Completed&rdquo; above to unlock the quiz
                            </span>
                          )}
                        </div>
                      )}
                      {!completed &&
                        (quizLocked ? (
                          <Button size="sm" disabled>
                            Take quiz
                          </Button>
                        ) : (
                          <Button
                            render={<Link href={`/courses/${course.id}/modules/${module.id}/quiz`} />}
                            nativeButton={false}
                            size="sm"
                          >
                            Take quiz
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </details>
          );
        })}
      </div>

      {course.finalExam && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Final exam
          </h2>
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border bg-card p-5 ${!allModulesComplete ? "opacity-60" : ""}`}
          >
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                {!allModulesComplete ? (
                  <Lock className="size-5 text-muted-foreground" />
                ) : courseFullyComplete ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <GraduationCap className="size-5 text-sapphire" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-medium leading-snug">Course master test</h3>
                {!allModulesComplete ? (
                  <p className="text-sm text-muted-foreground">
                    Complete all modules to unlock the final exam.
                  </p>
                ) : courseFullyComplete ? (
                  <p className="text-sm text-success">
                    Passed{finalExamAttempt ? ` · ${finalExamAttempt.score}%` : ""}
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm text-muted-foreground">
                      {course.finalExam.questions.length} questions · {course.finalExam.passingScore}% to
                      pass. Required for your certificate.
                    </p>
                    {finalExamAttempt && !finalExamAttempt.passed && (
                      <span className="flex items-center gap-1 text-xs text-attention">
                        <RotateCcw className="size-3" />
                        Last attempt: {finalExamAttempt.score}% — try again
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {allModulesComplete && !courseFullyComplete && (
              <Button render={<Link href={`/courses/${course.id}/exam`} />} nativeButton={false} size="sm">
                Take final exam
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
