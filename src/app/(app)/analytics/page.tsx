import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { progressPercent } from "@/lib/courses";
import { Award, BookOpen, CheckCircle2, Users } from "lucide-react";
import { CoursePerformanceTable, type CoursePerformanceRow } from "./course-performance-table";
import { MemberProgressTable, type MemberProgressRow } from "./member-progress-table";
import { TeamPerformanceTable, type TeamPerformanceRow } from "./team-performance-table";
import type { EnrollmentStatusValue } from "./enrollment-status";

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

  const [courses, certificates, teams] = await Promise.all([
    // Enrollments come back with the enrolled user attached so both the
    // per-course member breakdown (below) and the per-member course
    // breakdown can be built from this one query instead of N+1 lookups.
    prisma.course.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        modules: { select: { id: true } },
        enrollments: {
          include: { user: { select: { id: true, name: true, avatarColor: true, role: true } } },
        },
      },
    }),
    prisma.certificate.findMany({
      where: { userId: { in: [...cohortIds] } },
      select: { userId: true },
    }),
    // Only admins get the cross-team rollup — a team lead's page never
    // queries other teams' membership at all.
    isAdmin
      ? prisma.team.findMany({
          orderBy: { createdAt: "asc" },
          include: { members: { select: { id: true } }, lead: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const certsByUser = new Map<string, number>();
  for (const cert of certificates) {
    certsByUser.set(cert.userId, (certsByUser.get(cert.userId) ?? 0) + 1);
  }

  // enrollmentByUserCourse["userId:courseId"] -> status, built once so every
  // per-member and per-course breakdown below is an O(1) lookup instead of
  // a fresh query.
  const enrollmentByUserCourse = new Map<string, EnrollmentStatusValue>();
  for (const course of courses) {
    for (const enrollment of course.enrollments) {
      enrollmentByUserCourse.set(`${enrollment.userId}:${course.id}`, enrollment.status);
    }
  }

  const cohortEnrollments = courses.flatMap((course) =>
    course.enrollments.filter((e) => cohortIds.has(e.userId))
  );
  const totalEnrollments = cohortEnrollments.length;
  const completedEnrollments = cohortEnrollments.filter((e) => e.status === "COMPLETED").length;
  const overallCompletionRate = progressPercent(completedEnrollments, totalEnrollments);
  const certificateCount = [...certsByUser.values()].reduce((sum, n) => sum + n, 0);

  const coursePerformance: CoursePerformanceRow[] = courses
    .map((course) => {
      // "Enrolled" counts anyone with an Enrollment row for this course at
      // all (created the moment they first open it — see ensureEnrollment
      // in lib/courses.ts), same definition this stat always used. That's
      // distinct from the per-member `status` below, where a fresh row is
      // still "NOT_STARTED" until they complete something.
      const courseCohortRows = course.enrollments.filter((e) => cohortIds.has(e.userId));
      const enrolled = courseCohortRows.length;
      const completed = courseCohortRows.filter((e) => e.status === "COMPLETED").length;
      const members = cohort.map((member) => ({
        id: member.id,
        name: member.name,
        avatarColor: member.avatarColor,
        role: member.role,
        status: enrollmentByUserCourse.get(`${member.id}:${course.id}`) ?? ("NOT_STARTED" as EnrollmentStatusValue),
      }));
      return {
        id: course.id,
        title: course.title,
        category: course.category,
        enrolled,
        completed,
        rate: progressPercent(completed, enrolled),
        members,
      };
    })
    .sort((a, b) => b.enrolled - a.enrolled);

  const memberProgress: MemberProgressRow[] = cohort.map((member) => {
    const memberCourses = courses.map((course) => ({
      id: course.id,
      title: course.title,
      category: course.category,
      status: enrollmentByUserCourse.get(`${member.id}:${course.id}`) ?? ("NOT_STARTED" as EnrollmentStatusValue),
    }));
    return {
      id: member.id,
      name: member.name,
      avatarColor: member.avatarColor,
      role: member.role,
      completed: memberCourses.filter((c) => c.status === "COMPLETED").length,
      inProgress: memberCourses.filter((c) => c.status === "IN_PROGRESS").length,
      certificates: certsByUser.get(member.id) ?? 0,
      courses: memberCourses,
    };
  });
  const memberProgressById = new Map(memberProgress.map((m) => [m.id, m]));

  // Same "any Enrollment row counts" definition as coursePerformance above,
  // just summed across every course for the team's members instead of
  // scoped to one course.
  const allEnrollmentRows = courses.flatMap((course) => course.enrollments);
  const teamPerformance: TeamPerformanceRow[] = teams.map((team) => {
    const memberIds = new Set(team.members.map((m) => m.id));
    const teamEnrollments = allEnrollmentRows.filter((e) => memberIds.has(e.userId));
    const completed = teamEnrollments.filter((e) => e.status === "COMPLETED").length;
    const members = team.members
      .map((m) => memberProgressById.get(m.id))
      .filter((m): m is MemberProgressRow => m !== undefined);
    return {
      id: team.id,
      name: team.name,
      leadName: team.lead?.name ?? null,
      memberCount: team.members.length,
      completed,
      total: teamEnrollments.length,
      rate: progressPercent(completed, teamEnrollments.length),
      members,
    };
  });

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
            <TeamPerformanceTable teams={teamPerformance} />
          )}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Course performance</h2>
        <CoursePerformanceTable courses={coursePerformance} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{isAdmin ? "Member progress" : "Team members"}</h2>
        <MemberProgressTable members={memberProgress} />
      </section>
    </div>
  );
}
