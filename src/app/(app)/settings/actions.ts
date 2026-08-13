"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalloutVariant, ContentBlockType, CourseLevel, Role } from "@/generated/prisma/client";
import { formatObjectivesBody, OBJECTIVES_BLOCK_HEADING, OBJECTIVES_BLOCK_ORDER } from "@/lib/module-content";
import { deleteUploadedFile, MAX_VIDEO_FILE_SIZE, saveUploadedFile } from "@/lib/uploads";
import { generateFinalExamQuestions } from "@/lib/generate-exam";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Admin access required");
  return user;
}

// Zeni brand + editorial accent palette, cycled for new courses.
const COLOR_CYCLE = ["#366170", "#97C3B9", "#EEBA7D", "#C9ABC7", "#AD584A", "#162324"];

export async function createCourseAction(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const level = String(formData.get("level") ?? "BEGINNER") as CourseLevel;

  if (!title || !description || !category) {
    throw new Error("Title, description, and category are required");
  }

  const count = await prisma.course.count();

  await prisma.course.create({
    data: {
      title,
      description,
      category,
      level,
      coverColor: COLOR_CYCLE[count % COLOR_CYCLE.length],
      durationMins: 0,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/courses");
}

export async function updateCourseAction(formData: FormData) {
  await requireAdmin();

  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const level = String(formData.get("level") ?? "BEGINNER") as CourseLevel;

  if (!courseId || !title || !description || !category) {
    throw new Error("Missing required fields");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { title, description, category, level },
  });

  revalidatePath("/settings");
  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
}

export async function setCoursePublishedAction(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  const published = formData.get("published") === "true";
  if (!courseId) throw new Error("Missing courseId");

  await prisma.course.update({ where: { id: courseId }, data: { published } });

  revalidatePath("/settings");
  revalidatePath("/courses");
}

export async function deleteCourseAction(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) throw new Error("Missing courseId");

  await prisma.course.delete({ where: { id: courseId } });

  revalidatePath("/settings");
  revalidatePath("/courses");
  redirect("/settings");
}

async function upsertObjectivesBlock(moduleId: string, objectivesRaw: string) {
  const body = formatObjectivesBody(objectivesRaw);
  const existing = await prisma.contentBlock.findFirst({
    where: { moduleId, heading: OBJECTIVES_BLOCK_HEADING },
  });

  if (!body) {
    if (existing) await prisma.contentBlock.delete({ where: { id: existing.id } });
    return;
  }

  if (existing) {
    await prisma.contentBlock.update({ where: { id: existing.id }, data: { body } });
  } else {
    await prisma.contentBlock.create({
      data: {
        moduleId,
        type: "CALLOUT",
        variant: "NEUTRAL",
        heading: OBJECTIVES_BLOCK_HEADING,
        order: OBJECTIVES_BLOCK_ORDER,
        body,
      },
    });
  }
}

export async function addModuleAction(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const objectives = String(formData.get("objectives") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const videoFile = formData.get("videoFile");
  const durationMins = Number(formData.get("durationMins") ?? 10);

  if (!courseId || !title || !objectives) throw new Error("Missing required fields");

  let finalVideoUrl = videoUrl || null;
  let finalVideoFileName: string | null = null;
  if (videoFile instanceof File && videoFile.size > 0) {
    const saved = await saveUploadedFile(videoFile, MAX_VIDEO_FILE_SIZE);
    finalVideoUrl = saved.url;
    finalVideoFileName = saved.name;
  }

  const [maxOrder, modules] = await Promise.all([
    prisma.module.count({ where: { courseId } }),
    prisma.module.findMany({ where: { courseId } }),
  ]);

  const created = await prisma.module.create({
    data: {
      courseId,
      title,
      subtitle: subtitle || null,
      videoUrl: finalVideoUrl,
      videoFileName: finalVideoFileName,
      durationMins,
      order: maxOrder + 1,
    },
  });
  await upsertObjectivesBlock(created.id, objectives);

  const totalDuration = modules.reduce((sum, m) => sum + m.durationMins, 0) + durationMins;
  await prisma.course.update({ where: { id: courseId }, data: { durationMins: totalDuration } });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
  // Land back on the new module, already expanded — its lesson-content,
  // quiz, etc. editors only exist once the module itself has an id.
  redirect(`/settings/courses/${courseId}?created=${created.id}#module-${created.id}`);
}

export async function updateModuleAction(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const objectives = String(formData.get("objectives") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const videoFile = formData.get("videoFile");
  const durationMins = Number(formData.get("durationMins") ?? 10);

  if (!moduleId || !title || !objectives) throw new Error("Missing required fields");

  const existing = await prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
  let finalVideoUrl = videoUrl || null;
  let finalVideoFileName = existing.videoFileName;

  if (videoFile instanceof File && videoFile.size > 0) {
    await deleteUploadedFile(existing.videoUrl);
    const saved = await saveUploadedFile(videoFile, MAX_VIDEO_FILE_SIZE);
    finalVideoUrl = saved.url;
    finalVideoFileName = saved.name;
  } else if (finalVideoUrl !== existing.videoUrl) {
    // The URL field changed (or was cleared) without a new file upload —
    // it's no longer pointing at an uploaded file, so drop the stored
    // filename and clean up the old upload if there was one.
    await deleteUploadedFile(existing.videoUrl);
    finalVideoFileName = null;
  }

  await prisma.module.update({
    where: { id: moduleId },
    data: {
      title,
      subtitle: subtitle || null,
      videoUrl: finalVideoUrl,
      videoFileName: finalVideoFileName,
      durationMins,
    },
  });
  await upsertObjectivesBlock(moduleId, objectives);

  const modules = await prisma.module.findMany({ where: { courseId } });
  const totalDuration = modules.reduce((sum, m) => sum + m.durationMins, 0);
  await prisma.course.update({ where: { id: courseId }, data: { durationMins: totalDuration } });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteModuleAction(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!moduleId || !courseId) throw new Error("Missing required fields");

  const deleted = await prisma.module.delete({ where: { id: moduleId } });
  await deleteUploadedFile(deleted.videoUrl);

  const modules = await prisma.module.findMany({ where: { courseId } });
  const totalDuration = modules.reduce((sum, m) => sum + m.durationMins, 0);
  await prisma.course.update({ where: { id: courseId }, data: { durationMins: totalDuration } });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function updateUserRoleAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "USER") as Role;
  if (!userId) throw new Error("Missing userId");

  await prisma.user.update({ where: { id: userId }, data: { role } });

  revalidatePath("/settings");
}

export async function updateUserTitleAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!userId) throw new Error("Missing userId");

  await prisma.user.update({ where: { id: userId }, data: { title: title || null } });

  revalidatePath("/settings");
}

// ---------- Quizzes (module quizzes and course final exams share the same model) ----------

export async function createModuleQuizAction(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!moduleId || !courseId) throw new Error("Missing moduleId");

  await prisma.quiz.create({ data: { moduleId } });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function createFinalExamAction(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) throw new Error("Missing courseId");

  await prisma.quiz.create({ data: { courseId } });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

/** Generates a 20-question final exam from the course's module content (and existing module
 *  quizzes, for reference) via Claude, replacing any existing final exam questions. */
export async function generateFinalExamAction(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) throw new Error("Missing courseId");

  const questions = await generateFinalExamQuestions(courseId);

  const quiz = await prisma.quiz.upsert({
    where: { courseId },
    update: {},
    create: { courseId },
  });

  await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });

  for (const [i, question] of questions.entries()) {
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        prompt: question.prompt,
        order: i + 1,
        choices: {
          create: question.choices.map((text, choiceIndex) => ({
            text,
            isCorrect: choiceIndex === question.correctIndex,
            order: choiceIndex + 1,
          })),
        },
      },
    });
  }

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteQuizAction(formData: FormData) {
  await requireAdmin();
  const quizId = String(formData.get("quizId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!quizId) throw new Error("Missing quizId");

  await prisma.quiz.delete({ where: { id: quizId } });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function updateQuizPassingScoreAction(formData: FormData) {
  await requireAdmin();
  const quizId = String(formData.get("quizId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const passingScoreRaw = Number(formData.get("passingScore") ?? 75);
  const passingScore = Math.min(100, Math.max(1, Math.round(passingScoreRaw)));
  if (!quizId) throw new Error("Missing quizId");

  await prisma.quiz.update({ where: { id: quizId }, data: { passingScore } });

  revalidatePath(`/settings/courses/${courseId}`);
}

function readChoiceTexts(formData: FormData) {
  return [0, 1, 2, 3].map((i) => String(formData.get(`choice${i}`) ?? "").trim());
}

export async function addQuizQuestionAction(formData: FormData) {
  await requireAdmin();
  const quizId = String(formData.get("quizId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const choiceTexts = readChoiceTexts(formData);
  const correctIndex = Number(formData.get("correctIndex") ?? 0);

  if (!quizId || !prompt || choiceTexts.some((c) => !c)) {
    throw new Error("A prompt and all four choices are required");
  }

  const count = await prisma.quizQuestion.count({ where: { quizId } });
  await prisma.quizQuestion.create({
    data: {
      quizId,
      prompt,
      order: count + 1,
      choices: {
        create: choiceTexts.map((text, i) => ({ text, isCorrect: i === correctIndex, order: i + 1 })),
      },
    },
  });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function updateQuizQuestionAction(formData: FormData) {
  await requireAdmin();
  const questionId = String(formData.get("questionId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const choiceTexts = readChoiceTexts(formData);
  const correctIndex = Number(formData.get("correctIndex") ?? 0);

  if (!questionId || !prompt || choiceTexts.some((c) => !c)) {
    throw new Error("A prompt and all four choices are required");
  }

  await prisma.quizQuestion.update({ where: { id: questionId }, data: { prompt } });
  await prisma.quizChoice.deleteMany({ where: { questionId } });
  await prisma.quizChoice.createMany({
    data: choiceTexts.map((text, i) => ({ questionId, text, isCorrect: i === correctIndex, order: i + 1 })),
  });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteQuizQuestionAction(formData: FormData) {
  await requireAdmin();
  const questionId = String(formData.get("questionId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!questionId) throw new Error("Missing questionId");

  await prisma.quizQuestion.delete({ where: { id: questionId } });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

// ---------- Module lesson content blocks ----------

export async function addContentBlockAction(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const type = String(formData.get("type") ?? "PARAGRAPH") as ContentBlockType;
  const heading = String(formData.get("heading") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const variant = String(formData.get("variant") ?? "NEUTRAL") as CalloutVariant;
  const file = formData.get("file");

  if (!moduleId || !courseId) throw new Error("Missing moduleId");
  if (type === "HEADING" && !heading) throw new Error("A heading block needs heading text");
  if (type !== "HEADING" && !body) throw new Error("A body is required");

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  if (type === "CALLOUT" && file instanceof File && file.size > 0) {
    const saved = await saveUploadedFile(file);
    fileUrl = saved.url;
    fileName = saved.name;
  }

  const count = await prisma.contentBlock.count({ where: { moduleId } });
  await prisma.contentBlock.create({
    data: {
      moduleId,
      type,
      order: count + 1,
      heading: heading || null,
      body: body || null,
      variant: type === "CALLOUT" ? variant : null,
      fileUrl,
      fileName,
    },
  });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function updateContentBlockAction(formData: FormData) {
  await requireAdmin();
  const blockId = String(formData.get("blockId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const type = String(formData.get("type") ?? "PARAGRAPH") as ContentBlockType;
  const heading = String(formData.get("heading") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const variant = String(formData.get("variant") ?? "NEUTRAL") as CalloutVariant;
  const file = formData.get("file");
  const removeFile = formData.get("removeFile") === "true";

  if (!blockId) throw new Error("Missing blockId");
  if (type === "HEADING" && !heading) throw new Error("A heading block needs heading text");
  if (type !== "HEADING" && !body) throw new Error("A body is required");

  const existing = await prisma.contentBlock.findUniqueOrThrow({ where: { id: blockId } });

  let fileUrl = existing.fileUrl;
  let fileName = existing.fileName;

  if (type === "CALLOUT" && file instanceof File && file.size > 0) {
    await deleteUploadedFile(existing.fileUrl);
    const saved = await saveUploadedFile(file);
    fileUrl = saved.url;
    fileName = saved.name;
  } else if (type !== "CALLOUT" || removeFile) {
    await deleteUploadedFile(existing.fileUrl);
    fileUrl = null;
    fileName = null;
  }

  await prisma.contentBlock.update({
    where: { id: blockId },
    data: {
      type,
      heading: heading || null,
      body: body || null,
      variant: type === "CALLOUT" ? variant : null,
      fileUrl,
      fileName,
    },
  });

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteContentBlockAction(formData: FormData) {
  await requireAdmin();
  const blockId = String(formData.get("blockId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!blockId) throw new Error("Missing blockId");

  const deleted = await prisma.contentBlock.delete({ where: { id: blockId } });
  await deleteUploadedFile(deleted.fileUrl);

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function moveContentBlockAction(formData: FormData) {
  await requireAdmin();
  const blockId = String(formData.get("blockId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!blockId || (direction !== "up" && direction !== "down")) {
    throw new Error("Missing or invalid move direction");
  }

  const block = await prisma.contentBlock.findUniqueOrThrow({ where: { id: blockId } });
  const siblings = await prisma.contentBlock.findMany({
    where: { moduleId: block.moduleId },
    orderBy: { order: "asc" },
  });
  const index = siblings.findIndex((b) => b.id === blockId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const swapWith = siblings[swapIndex];
  await prisma.$transaction([
    prisma.contentBlock.update({ where: { id: block.id }, data: { order: swapWith.order } }),
    prisma.contentBlock.update({ where: { id: swapWith.id }, data: { order: block.order } }),
  ]);

  revalidatePath(`/settings/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}
