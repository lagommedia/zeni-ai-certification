"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Admin access required");
  return user;
}

export async function createTeamAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Team name is required");

  await prisma.team.create({ data: { name } });
  revalidatePath("/settings");
}

export async function renameTeamAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!teamId || !name) throw new Error("Missing team id or name");

  await prisma.team.update({ where: { id: teamId }, data: { name } });
  revalidatePath("/settings");
  revalidatePath("/analytics");
}

export async function deleteTeamAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) throw new Error("Missing team id");

  // Members and the lead just fall back to unassigned (onDelete: SetNull) —
  // deleting a team never deletes people.
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath("/settings");
  revalidatePath("/analytics");
}

export async function assignUserTeamAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!userId) throw new Error("Missing userId");

  const nextTeamId = teamId && teamId !== "none" ? teamId : null;

  await prisma.$transaction(async (tx) => {
    // Moving someone off a team they lead clears the lead slot too, rather
    // than leaving a team "led" by a non-member.
    if (!nextTeamId) {
      await tx.team.updateMany({ where: { leadUserId: userId }, data: { leadUserId: null } });
    } else {
      await tx.team.updateMany({
        where: { leadUserId: userId, id: { not: nextTeamId } },
        data: { leadUserId: null },
      });
    }
    await tx.user.update({ where: { id: userId }, data: { teamId: nextTeamId } });
  });

  revalidatePath("/settings");
  revalidatePath("/analytics");
}

export async function setTeamLeadAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const leadUserId = String(formData.get("leadUserId") ?? "");
  if (!teamId) throw new Error("Missing team id");

  const nextLeadUserId = leadUserId && leadUserId !== "none" ? leadUserId : null;

  if (nextLeadUserId) {
    const member = await prisma.user.findUnique({ where: { id: nextLeadUserId } });
    if (!member || member.teamId !== teamId) {
      throw new Error("The team lead must be a member of the team");
    }
  }

  await prisma.team.update({ where: { id: teamId }, data: { leadUserId: nextLeadUserId } });
  revalidatePath("/settings");
  revalidatePath("/analytics");
}
