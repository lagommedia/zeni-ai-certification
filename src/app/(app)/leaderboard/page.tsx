import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeLeaderboard, percentileBucket, type EnrollmentInfo, type ModuleCompletionInfo } from "@/lib/leaderboard";
import { getSlackAvatarUrls } from "@/lib/slack";
import { Podium, type PodiumEntry } from "./podium";
import { RankBadge } from "./rank-badge";
import { RankList, type RankListEntry } from "./rank-list";

const DEPARTMENT_TOP_N = 3;

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [users, teams, enrollments, moduleProgress, attempts] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, avatarColor: true, teamId: true } }),
    prisma.team.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.enrollment.findMany({
      select: { userId: true, courseId: true, startedAt: true, completedAt: true },
    }),
    prisma.moduleProgress.findMany({
      where: { completed: true, completedAt: { not: null } },
      select: { completedAt: true, enrollment: { select: { userId: true } } },
    }),
    prisma.quizAttempt.findMany({
      select: { quizId: true, userId: true, score: true, passed: true, createdAt: true },
    }),
  ]);

  const enrollmentInfos: EnrollmentInfo[] = enrollments.map((e) => ({
    userId: e.userId,
    courseId: e.courseId,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
  }));
  const moduleCompletions: ModuleCompletionInfo[] = moduleProgress.map((m) => ({
    userId: m.enrollment.userId,
    completedAt: m.completedAt!,
  }));

  const ranked = computeLeaderboard(users, enrollmentInfos, moduleCompletions, attempts);
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const top3 = ranked.filter((r) => r.totalPoints > 0).slice(0, 3);
  const top3Emails = top3.map((r) => emailById.get(r.id)).filter((e): e is string => !!e);
  const avatarsByEmail = await getSlackAvatarUrls(top3Emails);

  const podiumEntries: PodiumEntry[] = top3.map((r) => ({
    id: r.id,
    name: r.name,
    avatarColor: r.avatarColor,
    avatarUrl: avatarsByEmail.get(emailById.get(r.id) ?? "") ?? null,
    teamName: r.teamId ? (teamNameById.get(r.teamId) ?? null) : null,
    totalPoints: r.totalPoints,
  }));

  const myIndex = ranked.findIndex((r) => r.id === user.id);
  const myRow = myIndex >= 0 ? ranked[myIndex] : null;
  const myRank = myIndex + 1;
  const myBucket = myRow && myRow.totalPoints > 0 ? percentileBucket(myRank, ranked.length) : null;

  const departments = teams
    .map((team) => ({
      team,
      members: ranked.filter((r) => r.teamId === team.id),
    }))
    .filter(({ members }) => members.some((m) => m.totalPoints > 0))
    .map(({ team, members }) => ({
      team,
      leader: members[0],
      entries: members.slice(0, DEPARTMENT_TOP_N).map(
        (m, i): RankListEntry => ({
          id: m.id,
          rank: i + 1,
          name: m.name,
          avatarColor: m.avatarColor,
          totalPoints: m.totalPoints,
        })
      ),
    }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h4 font-medium text-sapphire">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          XP for every module and quiz as you go, bonus XP for finishing fast, and a streak
          bonus for consecutive days of progress.
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <RankBadge rank={myRank} />
        </div>
        {myRow && myRow.totalPoints > 0 ? (
          <div>
            <p className="text-sm font-medium text-onyx">
              {myBucket === 1
                ? "You're #1 in the company"
                : myBucket === 100
                  ? "Keep going — climb the board"
                  : `You're in the Top ${myBucket}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              {myRow.totalPoints.toLocaleString()} XP · rank #{myRank} of {ranked.length}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-onyx">You haven&rsquo;t earned any XP yet</p>
            <p className="text-xs text-muted-foreground">Complete a module to get on the board.</p>
          </div>
        )}
      </div>

      {podiumEntries.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Top 3 company-wide</h2>
          <Podium entries={podiumEntries} />
        </section>
      )}

      {departments.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Department leaders</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {departments.map(({ team, entries }) => (
              <div key={team.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                <h3 className="font-semibold">{team.name}</h3>
                <RankList entries={entries} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
