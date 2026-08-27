import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { progressPercent } from "@/lib/courses";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Award, BookOpen, CheckCircle2, Users } from "lucide-react";

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-medium tracking-tight text-onyx tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const ledTeam = isAdmin
    ? null
    : await prisma.team.findUnique({
        where: { leadUserId: user.id },
        include: { members: { select: { id: true, name: true, avatarColor: true, role: true } } },
      });

  // Anyone else — a regular member, or a lead of no team — has no business here.
  if (!isAdmin && !ledTeam) redirect("/courses");

  const cohort = isAdmin
    ? await prisma.user.findMany({ orderBy: { createdAt: "asc" } })
    : ledTeam!.members;
  const cohortIds = new Set(cohort.map((u) => u.id));

  const [courses, certificateCount, enrollments, teams] = await Promise.all([
    prisma.course.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        modules: { select: { id: true } },
        enrollments: { include: { progress: { where: { completed: true } } } },
      },
    }),
    prisma.certificate.count({ where: { userId: { in: [...cohortIds] } } }),
    prisma.enrollment.findMany({ where: { userId: { in: [...cohortIds] } } }),
    // Only admins get the cross-team rollup — a team lead's page never
    // queries other teams' membership at all.
    isAdmin
      ? prisma.team.findMany({
          orderBy: { createdAt: "asc" },
          include: { members: { select: { id: true } }, lead: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED").length;
  const overallCompletionRate = progressPercent(completedEnrollments, totalEnrollments);

  const coursePerformance = courses
    .map((course) => {
      const cohortEnrollments = course.enrollments.filter((e) => cohortIds.has(e.userId));
      const enrolled = cohortEnrollments.length;
      const completed = cohortEnrollments.filter((e) => e.status === "COMPLETED").length;
      return {
        id: course.id,
        title: course.title,
        category: course.category,
        enrolled,
        completed,
        rate: progressPercent(completed, enrolled),
      };
    })
    .sort((a, b) => b.enrolled - a.enrolled);

  const memberProgress = await Promise.all(
    cohort.map(async (member) => {
      const memberEnrollments = await prisma.enrollment.findMany({ where: { userId: member.id } });
      const certs = await prisma.certificate.count({ where: { userId: member.id } });
      return {
        id: member.id,
        name: member.name,
        avatarColor: member.avatarColor,
        role: member.role,
        completed: memberEnrollments.filter((e) => e.status === "COMPLETED").length,
        inProgress: memberEnrollments.filter((e) => e.status === "IN_PROGRESS").length,
        certificates: certs,
      };
    })
  );

  const teamPerformance = await Promise.all(
    teams.map(async (team) => {
      const memberIds = team.members.map((m) => m.id);
      const teamEnrollments = memberIds.length
        ? await prisma.enrollment.findMany({ where: { userId: { in: memberIds } } })
        : [];
      const completed = teamEnrollments.filter((e) => e.status === "COMPLETED").length;
      return {
        id: team.id,
        name: team.name,
        leadName: team.lead?.name ?? null,
        memberCount: memberIds.length,
        completed,
        total: teamEnrollments.length,
        rate: progressPercent(completed, teamEnrollments.length),
      };
    })
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h4 font-medium text-sapphire">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Certification progress across your team."
            : `Certification progress for ${ledTeam!.name}.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Team members" value={String(cohort.length)} icon={Users} />
        <StatTile label="Courses" value={String(courses.length)} icon={BookOpen} />
        <StatTile label="Certificates issued" value={String(certificateCount)} icon={Award} />
        <StatTile
          label="Overall completion rate"
          value={`${overallCompletionRate}%`}
          icon={CheckCircle2}
        />
      </div>

      {isAdmin && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Team performance</h2>
          {teamPerformance.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card px-5 py-6 text-center text-sm text-muted-foreground">
              No teams set up yet — create one in Settings to see a per-team breakdown here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="w-56">Completion rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPerformance.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {team.leadName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {team.memberCount}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {team.completed}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={team.rate} className="h-1.5" />
                          <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                            {team.rate}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Course performance</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="w-56">Completion rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coursePerformance.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{course.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {course.enrolled}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {course.completed}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={course.rate} className="h-1.5" />
                      <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                        {course.rate}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{isAdmin ? "Member progress" : "Team members"}</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">In progress</TableHead>
                <TableHead className="text-right">Certificates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberProgress.map((member) => (
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
                      {member.role === "ADMIN" && (
                        <Badge variant="outline" className="text-[10px]">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {member.completed}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {member.inProgress}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {member.certificates}
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
