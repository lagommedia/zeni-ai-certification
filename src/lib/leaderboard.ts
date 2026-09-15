// Leaderboard point system — XP-style, so points accrue as people make
// progress rather than only paying out in one lump sum at the end. Modeled
// on the mechanics real learning/gamification platforms use for this:
//
//   - Module XP         Duolingo-style — XP per lesson/module finished, not
//                        just per course, so partial progress already shows
//                        up on the board.
//   - Quiz score XP      Khan Academy / Codecademy-style — your best score on
//                        each quiz IS its XP (0-100), summed across every
//                        quiz you've attempted. This is the biggest lever and
//                        the main source of variance between people.
//   - First-try bonus    A flat bonus per quiz passed with no retry — common
//                        "mastery" bonus in LMS gamification, rewards not
//                        needing a second attempt over just eventually
//                        clicking the right answer.
//   - Completion bonus   Trailhead-style badge/trail bonus for finishing a
//                        course outright, on top of the XP already earned
//                        along the way.
//   - Speed placement    A flat "race" bonus for finishing a course fast
//                        relative to everyone else who's finished it — 1st,
//                        2nd, 3rd, and top-10 each get a fixed bonus, like a
//                        launch-week leaderboard prize rather than a smooth
//                        curve, so being first is genuinely worth something.
//   - Streak bonus       Duolingo's signature mechanic — your longest run of
//                        consecutive days completing at least one module.
//
// Total points have no fixed cap; they're an open-ended score, not a
// percentage, which is deliberate — it's what gives the board room to
// separate people instead of everyone clustering near 100.

export type LeaderboardUser = {
  id: string;
  name: string;
  avatarColor: string;
  teamId: string | null;
};

export type EnrollmentInfo = {
  userId: string;
  courseId: string;
  startedAt: Date;
  completedAt: Date | null;
};

export type ModuleCompletionInfo = {
  userId: string;
  completedAt: Date;
};

export type QuizAttemptInfo = {
  quizId: string;
  userId: string;
  score: number;
  passed: boolean;
  createdAt: Date;
};

export type LeaderboardRow = {
  id: string;
  name: string;
  avatarColor: string;
  teamId: string | null;
  completedCourses: number;
  moduleXp: number;
  quizXp: number;
  firstTryBonus: number;
  completionBonus: number;
  speedBonus: number;
  streakBonus: number;
  streakDays: number;
  totalPoints: number;
  // Earliest course completion, for tie-breaking (rewards being first)
  // — null for anyone with no completions yet.
  earliestCompletedAt: Date | null;
};

const MODULE_XP = 10;
const FIRST_TRY_BONUS = 15;
const COMPLETION_BONUS = 150;
const STREAK_XP_PER_DAY = 5;
const STREAK_CAP_DAYS = 10;
const SPEED_BONUS_BY_PLACE = [100, 60, 40] as const; // 1st, 2nd, 3rd
const SPEED_BONUS_TOP_10 = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDayKey = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

function longestStreakDays(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = [...new Set(dates.map(utcDayKey))].sort((a, b) => a - b);
  let best = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    current = days[i] - days[i - 1] === DAY_MS ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}

function speedBonusForPlace(place: number): number {
  if (place <= 3) return SPEED_BONUS_BY_PLACE[place - 1];
  if (place <= 10) return SPEED_BONUS_TOP_10;
  return 0;
}

export function computeLeaderboard(
  users: LeaderboardUser[],
  enrollments: EnrollmentInfo[],
  moduleCompletions: ModuleCompletionInfo[],
  attempts: QuizAttemptInfo[]
): LeaderboardRow[] {
  const attemptsByUserQuiz = new Map<string, QuizAttemptInfo[]>();
  for (const attempt of attempts) {
    const key = `${attempt.userId}:${attempt.quizId}`;
    const list = attemptsByUserQuiz.get(key) ?? [];
    list.push(attempt);
    attemptsByUserQuiz.set(key, list);
  }
  for (const list of attemptsByUserQuiz.values()) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  const moduleCompletionsByUser = new Map<string, Date[]>();
  for (const m of moduleCompletions) {
    const list = moduleCompletionsByUser.get(m.userId) ?? [];
    list.push(m.completedAt);
    moduleCompletionsByUser.set(m.userId, list);
  }

  // Speed placement is ranked within each course — the race is against
  // everyone who finished THAT course, not the whole company.
  const speedBonusByCompletion = new Map<string, number>(); // "userId:courseId" -> bonus
  const completedByCourse = new Map<string, EnrollmentInfo[]>();
  for (const e of enrollments) {
    if (!e.completedAt) continue;
    const list = completedByCourse.get(e.courseId) ?? [];
    list.push(e);
    completedByCourse.set(e.courseId, list);
  }
  const durationMs = (e: EnrollmentInfo) => e.completedAt!.getTime() - e.startedAt.getTime();
  for (const courseEnrollments of completedByCourse.values()) {
    const ranked = [...courseEnrollments].sort((a, b) => durationMs(a) - durationMs(b));
    ranked.forEach((e, index) => {
      speedBonusByCompletion.set(`${e.userId}:${e.courseId}`, speedBonusForPlace(index + 1));
    });
  }

  const rowsByUser = new Map<string, LeaderboardRow>();
  for (const user of users) {
    const moduleDates = moduleCompletionsByUser.get(user.id) ?? [];
    rowsByUser.set(user.id, {
      id: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      teamId: user.teamId,
      completedCourses: 0,
      moduleXp: moduleDates.length * MODULE_XP,
      quizXp: 0,
      firstTryBonus: 0,
      completionBonus: 0,
      speedBonus: 0,
      streakBonus: 0,
      streakDays: longestStreakDays(moduleDates),
      totalPoints: 0,
      earliestCompletedAt: null,
    });
  }

  // Quiz XP + first-try bonus: every quiz a user has ever attempted counts,
  // independent of whether the course it belongs to is finished yet.
  for (const [key, list] of attemptsByUserQuiz) {
    const userId = key.split(":")[0];
    const row = rowsByUser.get(userId);
    if (!row) continue;
    row.quizXp += Math.max(...list.map((a) => a.score));
    if (list[0].passed) row.firstTryBonus += FIRST_TRY_BONUS;
  }

  for (const enrollment of enrollments) {
    if (!enrollment.completedAt) continue;
    const row = rowsByUser.get(enrollment.userId);
    if (!row) continue; // defensive — every enrollment's user should be in `users`

    row.completedCourses += 1;
    row.completionBonus += COMPLETION_BONUS;
    row.speedBonus += speedBonusByCompletion.get(`${enrollment.userId}:${enrollment.courseId}`) ?? 0;
    if (!row.earliestCompletedAt || enrollment.completedAt < row.earliestCompletedAt) {
      row.earliestCompletedAt = enrollment.completedAt;
    }
  }

  for (const row of rowsByUser.values()) {
    row.streakBonus = STREAK_XP_PER_DAY * Math.min(row.streakDays, STREAK_CAP_DAYS);
    row.totalPoints =
      row.moduleXp + row.quizXp + row.firstTryBonus + row.completionBonus + row.speedBonus + row.streakBonus;
  }

  return [...rowsByUser.values()].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (a.earliestCompletedAt && b.earliestCompletedAt) {
      return a.earliestCompletedAt.getTime() - b.earliestCompletedAt.getTime();
    }
    if (a.earliestCompletedAt) return -1;
    if (b.earliestCompletedAt) return 1;
    return a.name.localeCompare(b.name);
  });
}

const PERCENTILE_BUCKETS = [1, 5, 10, 20, 30, 50, 75, 100];

// 1-indexed rank -> the smallest "Top N%" bucket it fits in, e.g. rank 8 of
// 100 is "Top 10%" (not a raw "92nd percentile", which reads clinically).
export function percentileBucket(rank: number, total: number): number {
  const percentile = (rank / total) * 100;
  return PERCENTILE_BUCKETS.find((bucket) => percentile <= bucket) ?? 100;
}
