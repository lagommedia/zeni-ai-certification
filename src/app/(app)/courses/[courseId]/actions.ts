"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markModuleVideoWatched, setModuleCompletion, setModuleHonorConfirmed } from "@/lib/courses";

export async function toggleModuleAction(formData: FormData) {
  const moduleId = formData.get("moduleId");
  const nextCompleted = formData.get("nextCompleted") === "true";
  const courseId = formData.get("courseId");

  if (typeof moduleId !== "string" || typeof courseId !== "string") {
    throw new Error("Missing moduleId or courseId");
  }

  const user = await requireUser();
  await setModuleCompletion(user.id, moduleId, nextCompleted);

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/certificates");
  revalidatePath("/notifications");
}

export async function markVideoWatchedAction(moduleId: string) {
  const user = await requireUser();
  const { courseId } = await markModuleVideoWatched(user.id, moduleId);

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/modules/${moduleId}/quiz`);
}

export async function setHonorConfirmedAction(moduleId: string, confirmed: boolean) {
  const user = await requireUser();
  const { courseId } = await setModuleHonorConfirmed(user.id, moduleId, confirmed);

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/modules/${moduleId}/quiz`);
}
