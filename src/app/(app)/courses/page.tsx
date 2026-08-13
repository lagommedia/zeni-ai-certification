import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { progressPercent } from "@/lib/courses";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
    include: {
      modules: { select: { id: true } },
      enrollments: {
        where: { userId: user.id },
        include: { progress: { where: { completed: true } } },
      },
    },
  });

  const totalCourses = courses.length;
  const completedCourses = courses.filter(
    (c) => c.enrollments[0]?.status === "COMPLETED"
  ).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h4 font-medium text-sapphire">Courses</h1>
        <p className="text-sm text-muted-foreground">
          {completedCourses} of {totalCourses} courses completed. Keep going, {user.name.split(" ")[0]}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const enrollment = course.enrollments[0];
          const total = course.modules.length;
          const completed = enrollment?.progress.length ?? 0;
          const percent = progressPercent(completed, total);
          const status = enrollment?.status ?? "NOT_STARTED";

          return (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
            >
              <div className="h-2 w-full" style={{ backgroundColor: course.coverColor }} />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary">{course.category}</Badge>
                  <Badge variant="outline">{LEVEL_LABEL[course.level]}</Badge>
                </div>
                <h3 className="font-semibold leading-snug group-hover:text-sapphire">
                  {course.title}
                </h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>

                <div className="mt-auto flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {course.durationMins} min · {total} modules
                    </span>
                    {status === "COMPLETED" && (
                      <span className="flex items-center gap-1 font-medium text-success">
                        <CheckCircle2 className="size-3.5" />
                        Completed
                      </span>
                    )}
                    {status === "IN_PROGRESS" && (
                      <span className="flex items-center gap-1 font-medium text-sapphire">
                        <PlayCircle className="size-3.5" />
                        In progress
                      </span>
                    )}
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
