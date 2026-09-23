"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCourseModules } from "@/lib/generate-module";
import { formatObjectivesBody, OBJECTIVES_BLOCK_HEADING, OBJECTIVES_BLOCK_ORDER } from "@/lib/module-content";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Admin access required");
  return user;
}

// Same cycle createCourseAction (settings/actions.ts) uses for a new course's cover color.
const COLOR_CYCLE = ["#366170", "#97C3B9", "#EEBA7D", "#C9ABC7", "#AD584A", "#162324"];

export type CourseBuilderState = { error: string | null };

export const initialCourseBuilderState: CourseBuilderState = { error: null };

export async function generateCourseAction(
  _prevState: CourseBuilderState,
  formData: FormData
): Promise<CourseBuilderState> {
  await requireAdmin();

  const topic = String(formData.get("topic") ?? "").trim();
  const referenceMaterial = String(formData.get("referenceMaterial") ?? "").trim();
  const moduleCount = Math.min(3, Math.max(1, Number(formData.get("moduleCount") ?? 1)));
  const targetCourseId = String(formData.get("targetCourseId") ?? "") || null;

  if (!topic) return { error: "A topic is required" };

  let result;
  try {
    result = await generateCourseModules({ topic, referenceMaterial, moduleCount, targetCourseId });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Generation failed — try again" };
  }

  // New content lands unpublished — the admin reviews it in the course
  // editor and flips "Published" on when it's ready for students. Existing
  // courses get unpublished too while their new modules are unreviewed,
  // rather than exposing draft content to whoever's mid-course already.
  let courseId: string;
  if (targetCourseId) {
    courseId = targetCourseId;
    await prisma.course.update({ where: { id: courseId }, data: { published: false } });
  } else {
    if (!result.course) throw new Error("The model didn't propose a course");
    const count = await prisma.course.count();
    const created = await prisma.course.create({
      data: {
        title: result.course.title,
        description: result.course.description,
        category: result.course.category,
        level: result.course.level,
        coverColor: COLOR_CYCLE[count % COLOR_CYCLE.length],
        durationMins: 0,
        published: false,
      },
    });
    courseId = created.id;
  }

  const existingModuleCount = await prisma.module.count({ where: { courseId } });

  for (const [i, mod] of result.modules.entries()) {
    const createdModule = await prisma.module.create({
      data: {
        courseId,
        title: mod.title,
        subtitle: mod.subtitle,
        durationMins: mod.durationMins,
        order: existingModuleCount + i + 1,
      },
    });

    await prisma.contentBlock.create({
      data: {
        moduleId: createdModule.id,
        type: "CALLOUT",
        variant: "NEUTRAL",
        heading: OBJECTIVES_BLOCK_HEADING,
        order: OBJECTIVES_BLOCK_ORDER,
        body: formatObjectivesBody(mod.objectives.join("\n")),
      },
    });

    for (const [blockIndex, block] of mod.contentBlocks.entries()) {
      await prisma.contentBlock.create({
        data: {
          moduleId: createdModule.id,
          type: block.type,
          order: blockIndex + 1,
          heading: block.heading,
          body: block.body,
          variant: block.type === "CALLOUT" ? (block.variant ?? "NEUTRAL") : null,
        },
      });
    }

    const quiz = await prisma.quiz.create({ data: { moduleId: createdModule.id } });
    for (const [qIndex, q] of mod.quiz.entries()) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          prompt: q.prompt,
          order: qIndex + 1,
          choices: {
            create: q.choices.map((text, cIndex) => ({
              text,
              isCorrect: cIndex === q.correctIndex,
              order: cIndex + 1,
            })),
          },
        },
      });
    }
  }

  const allModules = await prisma.module.findMany({ where: { courseId }, select: { durationMins: true } });
  const totalDuration = allModules.reduce((sum, m) => sum + m.durationMins, 0);
  await prisma.course.update({ where: { id: courseId }, data: { durationMins: totalDuration } });

  revalidatePath("/settings");
  revalidatePath(`/settings/courses/${courseId}`);
  redirect(`/settings/courses/${courseId}`);
}
