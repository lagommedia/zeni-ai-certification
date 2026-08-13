import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { VideoDropzone } from "@/components/video-dropzone";
import { QuizEditor } from "../../quiz-editor";
import { ContentBlockEditor } from "../../content-block-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Sparkles, Trash2 } from "lucide-react";
import {
  addModuleAction,
  createFinalExamAction,
  createModuleQuizAction,
  deleteCourseAction,
  deleteModuleAction,
  generateFinalExamAction,
  updateCourseAction,
  updateModuleAction,
} from "../../actions";
import { OBJECTIVES_BLOCK_HEADING, parseObjectivesBody } from "@/lib/module-content";

export default async function ManageCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { courseId } = await params;
  const { created } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/courses");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          quiz: {
            include: { questions: { orderBy: { order: "asc" }, include: { choices: { orderBy: { order: "asc" } } } } },
          },
          blocks: { orderBy: { order: "asc" } },
        },
      },
      finalExam: {
        include: { questions: { orderBy: { order: "asc" }, include: { choices: { orderBy: { order: "asc" } } } } },
      },
    },
  });
  if (!course) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/settings"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to settings
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <h1 className="text-lg font-semibold">Course details</h1>
        <form id="course-form" action={updateCourseAction} className="flex flex-col gap-4">
          <input type="hidden" name="courseId" value={course.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={course.title} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={course.description}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={course.category} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Level</Label>
              <Select name="level" defaultValue={course.level}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
        <div className="flex items-center justify-between pt-2">
          <form action={deleteCourseAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <ConfirmSubmitButton
              variant="ghost"
              className="text-destructive hover:text-destructive"
              confirmMessage={`Delete "${course.title}"? This removes all modules, enrollments, and certificates for it.`}
            >
              <Trash2 className="size-4" />
              Delete course
            </ConfirmSubmitButton>
          </form>
          <Button type="submit" form="course-form">
            Save changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Modules
        </h2>
        {course.modules.map((module, index) => {
          const objectivesBlock = module.blocks.find((b) => b.heading === OBJECTIVES_BLOCK_HEADING);
          const otherBlocks = module.blocks.filter((b) => b.heading !== OBJECTIVES_BLOCK_HEADING);

          return (
          <details
            key={module.id}
            id={`module-${module.id}`}
            open={created === module.id}
            className="group scroll-mt-6 rounded-xl border bg-card [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-4">
              <span className="text-sm font-medium">
                {index + 1}. {module.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {module.durationMins} min{module.quiz ? " · quiz" : ""}
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t p-4">
              <form action={updateModuleAction} className="flex flex-col gap-3">
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="courseId" value={course.id} />
                <div className="flex flex-col gap-1.5">
                  <Label>Title</Label>
                  <Input name="title" defaultValue={module.title} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Subtitle (optional tagline shown under the title)</Label>
                  <Input name="subtitle" defaultValue={module.subtitle ?? ""} placeholder="e.g. A team of analysts, not a chatbot" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>By the end of this module, you should be able to:</Label>
                  <Textarea
                    name="objectives"
                    defaultValue={objectivesBlock ? parseObjectivesBody(objectivesBlock.body ?? "") : ""}
                    placeholder={"One item per line, e.g.\nExplain what Zeni is and who it's for\nDescribe how the AI CFO fits into your day-to-day"}
                    required
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Rendered as a gray objectives box above the video — one bullet per line.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Video URL</Label>
                  <Input
                    name="videoUrl"
                    type="text"
                    placeholder="YouTube, Vimeo, Google Drive share link, or a direct video file URL"
                    defaultValue={module.videoUrl ?? ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    For Google Drive, paste the &ldquo;Share&rdquo; link and make sure it&apos;s set
                    to &ldquo;Anyone with the link&rdquo; — otherwise students won&apos;t be able to
                    view it.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Or upload a video file directly (up to 500MB)</Label>
                  <VideoDropzone currentFileName={module.videoFileName} />
                  <p className="text-xs text-muted-foreground">
                    Uploading a file here replaces the link above and enables real
                    watch-to-completion tracking, which locks this module&apos;s quiz until the
                    video has been watched through. Links (YouTube/Vimeo/Drive) can&apos;t be
                    tracked that way, so they never lock the quiz.
                  </p>
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      name="durationMins"
                      min={1}
                      defaultValue={module.durationMins}
                      className="w-28"
                      required
                    />
                  </div>
                  <Button type="submit" size="sm" className="ml-auto">
                    Save module
                  </Button>
                </div>
              </form>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Additional lesson content — paragraphs, headings, and callouts
                </Label>
                <ContentBlockEditor moduleId={module.id} courseId={course.id} blocks={otherBlocks} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Quiz — required to unlock the next module
                </Label>
                <QuizEditor
                  quiz={module.quiz}
                  courseId={course.id}
                  createAction={createModuleQuizAction}
                  createHiddenFields={{ moduleId: module.id }}
                  label="quiz"
                />
              </div>

              <form action={deleteModuleAction}>
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="courseId" value={course.id} />
                <ConfirmSubmitButton
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  confirmMessage={`Delete module "${module.title}"?`}
                >
                  <Trash2 className="size-3.5" />
                  Delete module
                </ConfirmSubmitButton>
              </form>
            </div>
          </details>
          );
        })}

        <div className="rounded-xl border border-dashed bg-card p-4">
          <p className="text-sm font-medium">Add a module</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Additional lesson content blocks and a quiz can be added once the module exists —
            you&apos;ll land right back here, expanded, after saving.
          </p>
          <form action={addModuleAction} className="flex flex-col gap-3">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input name="title" placeholder="Module title" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Subtitle (optional tagline shown under the title)</Label>
              <Input name="subtitle" placeholder="e.g. A team of analysts, not a chatbot" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>By the end of this module, you should be able to:</Label>
              <Textarea
                name="objectives"
                placeholder={"One item per line, e.g.\nExplain what Zeni is and who it's for\nDescribe how the AI CFO fits into your day-to-day"}
                required
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Rendered as a gray objectives box above the video — one bullet per line.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Video URL</Label>
              <Input
                name="videoUrl"
                type="text"
                placeholder="YouTube, Vimeo, Google Drive share link, or a direct video file URL"
              />
              <p className="text-xs text-muted-foreground">
                For Google Drive, paste the &ldquo;Share&rdquo; link and make sure it&apos;s set to
                &ldquo;Anyone with the link&rdquo; — otherwise students won&apos;t be able to view
                it.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Or upload a video file directly (up to 500MB)</Label>
              <VideoDropzone />
              <p className="text-xs text-muted-foreground">
                Uploading a file here replaces the link above and enables real watch-to-completion
                tracking, which locks this module&apos;s quiz until the video has been watched
                through.
              </p>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Duration (min)</Label>
                <Input type="number" name="durationMins" min={1} defaultValue={10} className="w-28" required />
              </div>
              <Button type="submit" size="sm" className="ml-auto">
                Add module
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Final exam — required for the certificate
          </h2>
          <form action={generateFinalExamAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <ConfirmSubmitButton
              size="sm"
              variant="outline"
              confirmMessage={
                course.finalExam
                  ? "Regenerate the final exam with AI? This replaces all 20 existing questions and can't be undone."
                  : "Generate a 20-question final exam with AI, based on this course's module content and quizzes?"
              }
            >
              <Sparkles className="size-3.5" />
              {course.finalExam ? "Regenerate with AI" : "Generate with AI"}
            </ConfirmSubmitButton>
          </form>
        </div>
        <p className="text-xs text-muted-foreground">
          Uses Claude to read every module&apos;s written content and quizzes, then writes 20
          questions on how the AI CFO works and how to talk to customers about it — not the
          specific figures from the examples. Can take a minute or so.
        </p>
        <QuizEditor
          quiz={course.finalExam}
          courseId={course.id}
          createAction={createFinalExamAction}
          label="final exam"
        />
      </div>
    </div>
  );
}
