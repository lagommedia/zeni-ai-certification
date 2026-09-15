import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeLeaderboard, type CompletedEnrollment, type QuizInfo } from "@/lib/leaderboard";
import { Trophy } from "lucide-react";
import { LeaderboardTable, type LeaderboardDisplayRow } from "./leaderboard-table";
import { RankBadge } from "./rank-badge";

const TOP_N = 10;

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [users, teams, completedEnrollments, quizzes, attempts] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, avatarColor: true, teamId: true } }),
    prisma.team.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.enrollment.findMany({
      where: { status: "COMPLETED", completedAt: { not: null } },
      select: { userId: true, courseId: true, startedAt: true, completedAt: true },
    }),
    prisma.quiz.findMany({
      select: { id: true, courseId: true, module: { select: { courseId: true } } },
    }),
    prisma.quizAttempt.findMany({
      select: { quizId: true, userId: true, score: true, passed: true, createdAt: true },
    }),
  ]);

  const quizInfos: QuizInfo[] = quizzes
    .map((q) => ({
      id: q.id,
      courseId: q.courseId ?? q.module?.courseId ?? null,
      isFinalExam: q.courseId !== null,
    }))
    .filter((q): q is QuizInfo => q.courseId !== null);

  const completions: CompletedEnrollment[] = completedEnrollments.map((e) => ({
    userId: e.userId,
    courseId: e.courseId,
    startedAt: e.startedAt,
    completedAt: e.completedAt!,
  }));

  const ranked = computeLeaderboard(users, completions, quizInfos, attempts);

  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  const toDisplayRow = (row: (typeof ranked)[number], rank: number): LeaderboardDisplayRow => ({
    id: row.id,
    rank,
    name: row.name,
    avatarColor: row.avatarColor,
    teamId: row.teamId,
    teamName: row.teamId ? (teamNameById.get(row.teamId) ?? null) : null,
    completedCourses: row.completedCourses,
    speedPoints: row.speedPoints,
    accuracyPoints: row.accuracyPoints,
    masteryPoints: row.masteryPoints,
    totalPoints: row.totalPoints,
  });

  const displayRows = ranked.map(toDisplayRow);
  const topRows = displayRows.slice(0, TOP_N);

  const myIndex = ranked.findIndex((r) => r.id === user.id);
  const myRow = myIndex >= 0 ? displayRows[myIndex] : null;
  const showMyStanding = myRow !== null && myRow.totalPoints > 0 && myIndex >= TOP_N;

  const departments = teams
    .map((team) => ({
      team,
      members: displayRows.filter((r) => r.teamId === team.id),
    }))
    .filter(({ members }) => members.some((m) => m.totalPoints > 0))
    .map(({ team, members }) => ({
      team,
      // Re-rank within the department (1..N) rather than reusing the global
      // rank number, which would otherwise read like gaps/skips.
      members: members.map((m, i) => ({ ...m, rank: i + 1 })),
    }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h4 font-medium text-sapphire">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Up to 100 points per completed course — 40 for speed, 40 for accuracy, and 20 for
          passing every quiz on the first try.
        </p>
      </div>

      {showMyStanding && myRow && (
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <RankBadge rank={myIndex + 1} />
          </div>
          <div>
            <p className="text-sm font-medium text-onyx">
              You&rsquo;re ranked #{myIndex + 1} of {ranked.length}
            </p>
            <p className="text-xs text-muted-foreground">{myRow.totalPoints} points</p>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Top performers</h2>
        {topRows.every((r) => r.totalPoints === 0) ? (
          <p className="rounded-xl border border-dashed bg-card px-5 py-6 text-center text-sm text-muted-foreground">
            No completions yet — finish a course to be the first on the board.
          </p>
        ) : (
          <LeaderboardTable rows={topRows} showTeam />
        )}
      </section>

      {departments.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Department leaders</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {departments.map(({ team, members }) => {
              const leader = members[0];
              return (
                <div key={team.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{team.name}</h3>
                    <span className="flex items-center gap-1 text-xs font-medium text-gold">
                      <Trophy className="size-3.5" />
                      Leader
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-3">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-onyx"
                      style={{ backgroundColor: leader.avatarColor }}
                    >
                      {leader.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{leader.name}</p>
                      <p className="text-xs text-muted-foreground">{leader.totalPoints} points</p>
                    </div>
                  </div>
                  {members.length > 1 && <LeaderboardTable rows={members} showBreakdown={false} />}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
