"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { submitModuleQuizAttempt } from "@/lib/courses";

export async function submitModuleQuizAction(formData: FormData) {
  const moduleId = String(formData.get("moduleId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const questionIds = formData.getAll("questionId").map(String);

  if (!moduleId || !courseId || questionIds.length === 0) {
    throw new Error("Missing quiz submission data");
  }

  const answers: Record<string, string> = {};
  for (const questionId of questionIds) {
    const choiceId = formData.get(`question-${questionId}`);
    if (typeof choiceId === "string") answers[questionId] = choiceId;
  }

  const user = await requireUser();
  await submitModuleQuizAttempt(user.id, moduleId, answers);

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/certificates");
  revalidatePath("/notifications");
  redirect(`/courses/${courseId}`);
}
