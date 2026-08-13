"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { submitFinalExamAttempt } from "@/lib/courses";

export async function submitFinalExamAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const questionIds = formData.getAll("questionId").map(String);

  if (!courseId || questionIds.length === 0) {
    throw new Error("Missing exam submission data");
  }

  const answers: Record<string, string> = {};
  for (const questionId of questionIds) {
    const choiceId = formData.get(`question-${questionId}`);
    if (typeof choiceId === "string") answers[questionId] = choiceId;
  }

  const user = await requireUser();
  const outcome = await submitFinalExamAttempt(user.id, courseId, answers);

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/certificates");
  revalidatePath("/notifications");

  if (outcome.certificate) {
    const celebrate = outcome.certificateIssued ? "?celebrate=1" : "";
    redirect(`/certificates/${outcome.certificate.id}${celebrate}`);
  }
  redirect(`/courses/${courseId}`);
}
