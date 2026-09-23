import { prisma } from "@/lib/prisma";
import { BuilderForm } from "./builder-form";

// Generation calls Claude Opus with extended thinking across possibly
// several modules' worth of content + quizzes — comfortably longer than
// Vercel's default function timeout.
export const maxDuration = 300;

export default async function CourseBuilderPage() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h4 font-medium text-sapphire">Smart Course Builder</h1>
        <p className="text-sm text-muted-foreground">
          Give it a topic and it drafts module(s) — lesson content, objectives, and a quiz — as an
          unpublished draft. Review and edit in the course editor, then publish when it&rsquo;s ready.
        </p>
      </div>
      <BuilderForm courses={courses} />
    </div>
  );
}
