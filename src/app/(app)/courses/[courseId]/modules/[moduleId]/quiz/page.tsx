import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureEnrollment, getUnlockedModuleIds } from "@/lib/courses";
import { resolveVideoEmbed } from "@/lib/video";
import { isHonorCallout } from "@/lib/module-content";
import { shuffle } from "@/lib/shuffle";
import { Button } from "@/components/ui/button";
import { QuizQuestions } from "@/components/quiz-questions";
import { ArrowLeft } from "lucide-react";
import { submitModuleQuizAction } from "./actions";

export default async function ModuleQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  const { courseId, moduleId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: true,
      blocks: true,
      quiz: {
        include: { questions: { orderBy: { order: "asc" }, include: { choices: { orderBy: { order: "asc" } } } } },
      },
    },
  });
  if (!courseModule || courseModule.courseId !== courseId || !courseModule.quiz) notFound();

  const enrollment = await ensureEnrollment(user.id, courseId);
  const progressRows = await prisma.moduleProgress.findMany({ where: { enrollmentId: enrollment.id } });
  const completedIds = new Set(progressRows.filter((p) => p.completed).map((p) => p.moduleId));

  if (completedIds.has(moduleId)) redirect(`/courses/${courseId}`);

  const moduleProgress = progressRows.find((p) => p.moduleId === moduleId);

  const requiresVideoWatch =
    !!courseModule.videoUrl && resolveVideoEmbed(courseModule.videoUrl).kind === "file";
  if (requiresVideoWatch && !moduleProgress?.videoWatched) redirect(`/courses/${courseId}`);

  const requiresHonorConfirm = courseModule.blocks.some(isHonorCallout);
  if (requiresHonorConfirm && !moduleProgress?.honorConfirmed) redirect(`/courses/${courseId}`);

  const orderedModules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  const unlockedIds = getUnlockedModuleIds(
    orderedModules.map((m) => m.id),
    completedIds
  );
  if (!unlockedIds.has(moduleId)) redirect(`/courses/${courseId}`);

  const questions = shuffle(courseModule.quiz.questions).map((q) => ({
    ...q,
    choices: shuffle(q.choices),
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={`/courses/${courseId}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to {courseModule.course.title}
      </Link>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Module quiz</p>
        <h1 className="text-h6 font-medium text-sapphire">{courseModule.title}</h1>
        <p className="text-sm text-muted-foreground">
          {courseModule.quiz.questions.length} question{courseModule.quiz.questions.length === 1 ? "" : "s"} ·
          score {courseModule.quiz.passingScore}% or higher to pass and unlock the next module.
        </p>
      </div>

      <form action={submitModuleQuizAction} className="flex flex-col gap-5">
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="courseId" value={courseId} />
        <QuizQuestions questions={questions} />
        <Button type="submit" className="w-fit">
          Submit answers
        </Button>
      </form>
    </div>
  );
}
