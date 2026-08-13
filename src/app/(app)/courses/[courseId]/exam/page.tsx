import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureEnrollment } from "@/lib/courses";
import { shuffle } from "@/lib/shuffle";
import { Button } from "@/components/ui/button";
import { QuizQuestions } from "@/components/quiz-questions";
import { ArrowLeft } from "lucide-react";
import { submitFinalExamAction } from "./actions";

export default async function FinalExamPage({
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
      finalExam: {
        include: { questions: { orderBy: { order: "asc" }, include: { choices: { orderBy: { order: "asc" } } } } },
      },
    },
  });
  if (!course || !course.finalExam) notFound();

  const enrollment = await ensureEnrollment(user.id, courseId);
  if (enrollment.status !== "COMPLETED") redirect(`/courses/${courseId}`);

  const certificate = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (certificate) redirect(`/courses/${courseId}`);

  const questions = shuffle(course.finalExam.questions).map((q) => ({
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
        Back to {course.title}
      </Link>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Final exam</p>
        <h1 className="text-h6 font-medium text-sapphire">{course.title}</h1>
        <p className="text-sm text-muted-foreground">
          {course.finalExam.questions.length} questions · score {course.finalExam.passingScore}% or higher to
          pass and earn your certificate.
        </p>
      </div>

      <form action={submitFinalExamAction} className="flex flex-col gap-5">
        <input type="hidden" name="courseId" value={courseId} />
        <QuizQuestions questions={questions} />
        <Button type="submit" className="w-fit">
          Submit exam
        </Button>
      </form>
    </div>
  );
}
