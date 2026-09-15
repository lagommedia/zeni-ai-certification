// Leaderboard point system.
//
// Per completed course, a user earns up to 100 points:
//   - Speed    (0-40): how fast they finished relative to everyone else who
//                       completed the same course (percentile rank, fastest = 40).
//   - Accuracy (0-40): their final exam score (falls back to the average of
//                       their best module-quiz scores if a course has no
//                       final exam configured).
//   - Mastery  (0-20): the share of that course's quizzes they passed on the
//                       first attempt, no retries.
// A user's total is the sum across every course they've completed — finishing
// more courses is itself worth more, same as the certificates it earns them.

export type LeaderboardUser = {
  id: string;
  name: string;
  avatarColor: string;
  teamId: string | null;
};

export type CompletedEnrollment = {
  userId: string;
  courseId: string;
  startedAt: Date;
  completedAt: Date;
};

export type QuizInfo = {
  id: string;
  courseId: string;
  isFinalExam: boolean;
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
  speedPoints: number;
  accuracyPoints: number;
  masteryPoints: number;
  totalPoints: number;
  // Earliest course completion, for tie-breaking (rewards being first)
  // — null for anyone with no completions yet.
  earliestCompletedAt: Date | null;
};

const SPEED_MAX = 40;
const ACCURACY_MAX = 40;
const MASTERY_MAX = 20;

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeLeaderboard(
  users: LeaderboardUser[],
  completedEnrollments: CompletedEnrollment[],
  quizzes: QuizInfo[],
  attempts: QuizAttemptInfo[]
): LeaderboardRow[] {
  const quizzesByCourse = new Map<string, QuizInfo[]>();
  for (const quiz of quizzes) {
    const list = quizzesByCourse.get(quiz.courseId) ?? [];
    list.push(quiz);
    quizzesByCourse.set(quiz.courseId, list);
  }

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

  // Speed is ranked within each course — fastest completer of THAT course
  // gets full marks, regardless of how long other courses take.
  const speedPointsByCompletion = new Map<string, number>(); // "userId:courseId" -> points
  const byCourse = new Map<string, CompletedEnrollment[]>();
  for (const e of completedEnrollments) {
    const list = byCourse.get(e.courseId) ?? [];
    list.push(e);
    byCourse.set(e.courseId, list);
  }
  const durationMs = (e: CompletedEnrollment) => e.completedAt.getTime() - e.startedAt.getTime();
  for (const courseEnrollments of byCourse.values()) {
    const ranked = [...courseEnrollments].sort((a, b) => durationMs(a) - durationMs(b));
    const n = ranked.length;
    ranked.forEach((e, index) => {
      const percentile = n <= 1 ? 0 : index / (n - 1); // 0 = fastest, 1 = slowest
      speedPointsByCompletion.set(`${e.userId}:${e.courseId}`, Math.round(SPEED_MAX * (1 - percentile)));
    });
  }

  const rowsByUser = new Map<string, LeaderboardRow>();
  for (const user of users) {
    rowsByUser.set(user.id, {
      id: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      teamId: user.teamId,
      completedCourses: 0,
      speedPoints: 0,
      accuracyPoints: 0,
      masteryPoints: 0,
      totalPoints: 0,
      earliestCompletedAt: null,
    });
  }

  for (const enrollment of completedEnrollments) {
    const row = rowsByUser.get(enrollment.userId);
    if (!row) continue; // defensive — every enrollment's user should be in `users`

    const courseQuizzes = quizzesByCourse.get(enrollment.courseId) ?? [];
    const finalExam = courseQuizzes.find((q) => q.isFinalExam);

    const bestScorePerModuleQuiz = courseQuizzes
      .filter((q) => !q.isFinalExam)
      .map((q) => attemptsByUserQuiz.get(`${enrollment.userId}:${q.id}`) ?? [])
      .filter((list) => list.length > 0)
      .map((list) => Math.max(...list.map((a) => a.score)));

    const finalExamAttempts = finalExam
      ? (attemptsByUserQuiz.get(`${enrollment.userId}:${finalExam.id}`) ?? [])
      : [];
    const accuracyScore =
      finalExamAttempts.length > 0
        ? Math.max(...finalExamAttempts.map((a) => a.score))
        : average(bestScorePerModuleQuiz);

    let firstAttemptPassed = 0;
    let quizzesAttempted = 0;
    for (const quiz of courseQuizzes) {
      const list = attemptsByUserQuiz.get(`${enrollment.userId}:${quiz.id}`);
      if (!list || list.length === 0) continue;
      quizzesAttempted++;
      if (list[0].passed) firstAttemptPassed++;
    }
    const masteryRate = quizzesAttempted > 0 ? firstAttemptPassed / quizzesAttempted : 0;

    const speedPoints = speedPointsByCompletion.get(`${enrollment.userId}:${enrollment.courseId}`) ?? 0;
    const accuracyPoints = Math.round(ACCURACY_MAX * (accuracyScore / 100));
    const masteryPoints = Math.round(MASTERY_MAX * masteryRate);

    row.completedCourses += 1;
    row.speedPoints += speedPoints;
    row.accuracyPoints += accuracyPoints;
    row.masteryPoints += masteryPoints;
    row.totalPoints += speedPoints + accuracyPoints + masteryPoints;
    if (!row.earliestCompletedAt || enrollment.completedAt < row.earliestCompletedAt) {
      row.earliestCompletedAt = enrollment.completedAt;
    }
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
