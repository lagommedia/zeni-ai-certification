import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PublishSwitch } from "./publish-switch";
import { RoleSelect } from "./role-select";
import { TitleInput } from "./title-input";
import { TeamSelect } from "./team-select";
import { TeamLeadSelect } from "./team-lead-select";
import { TeamNameInput } from "./team-name-input";
import { NewCourseDialog } from "./new-course-dialog";
import { NewTeamDialog } from "./new-team-dialog";
import { deleteCourseAction } from "./actions";
import { deleteTeamAction } from "./teams-actions";
import { Pencil, Trash2 } from "lucide-react";

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/courses");

  const [courses, users, teams] = await Promise.all([
    prisma.course.findMany({
      orderBy: { createdAt: "asc" },
      include: { modules: { select: { id: true } }, enrollments: { select: { id: true } } },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.team.findMany({
      orderBy: { createdAt: "asc" },
      include: { members: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-h4 font-medium text-sapphire">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage the course catalog and team member roles.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Courses</h2>
          <NewCourseDialog />
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{course.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {LEVEL_LABEL[course.level]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{course.modules.length}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {course.enrollments.length}
                  </TableCell>
                  <TableCell>
                    <PublishSwitch courseId={course.id} published={course.published} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/settings/courses/${course.id}`}
                        className="inline-flex items-center gap-1 text-sm text-sapphire hover:underline"
                      >
                        <Pencil className="size-3.5" />
                        Manage
                      </Link>
                      <form action={deleteCourseAction}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <ConfirmSubmitButton
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          confirmMessage={`Delete "${course.title}"? This removes all modules, enrollments, and certificates for it.`}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Teams</h2>
          <NewTeamDialog />
        </div>
        {teams.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card px-5 py-6 text-center text-sm text-muted-foreground">
            No teams yet — create one, then assign members to it below.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="text-right">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">
                      <TeamNameInput teamId={team.id} name={team.name} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{team.members.length}</TableCell>
                    <TableCell>
                      <TeamLeadSelect
                        teamId={team.id}
                        leadUserId={team.leadUserId}
                        members={team.members}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={deleteTeamAction} className="flex justify-end">
                        <input type="hidden" name="teamId" value={team.id} />
                        <ConfirmSubmitButton
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          confirmMessage={`Delete "${team.name}"? Members keep their accounts but are no longer on a team.`}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Members</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback
                          style={{ backgroundColor: member.avatarColor }}
                          className="text-xs font-medium text-onyx"
                        >
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <TitleInput userId={member.id} title={member.title} />
                  </TableCell>
                  <TableCell>
                    <TeamSelect userId={member.id} teamId={member.teamId} teams={teams} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <RoleSelect
                        userId={member.id}
                        role={member.role}
                        disabled={member.id === user.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
