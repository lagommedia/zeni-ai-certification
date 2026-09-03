export type TimelinePoint = { date: string; enrolled: number; completed: number };

function utcDayKey(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Cumulative "Enrolled" / "Completed" counts per calendar day (UTC), from the
// cohort's first Enrollment row through today. Built entirely in memory from
// enrollment rows already fetched for the page — no extra query.
export function buildEnrollmentTimeline(
  enrollments: { startedAt: Date; completedAt: Date | null }[]
): TimelinePoint[] {
  if (enrollments.length === 0) return [];

  const startedDays = enrollments.map((e) => utcDayKey(e.startedAt)).sort((a, b) => a - b);
  const completedDays = enrollments
    .filter((e): e is { startedAt: Date; completedAt: Date } => e.completedAt !== null)
    .map((e) => utcDayKey(e.completedAt))
    .sort((a, b) => a - b);

  const firstDay = startedDays[0];
  const today = utcDayKey(new Date());

  const points: TimelinePoint[] = [];
  let si = 0;
  let ci = 0;
  let enrolled = 0;
  let completed = 0;
  for (let day = firstDay; day <= today; day += DAY_MS) {
    while (si < startedDays.length && startedDays[si] <= day) {
      enrolled++;
      si++;
    }
    while (ci < completedDays.length && completedDays[ci] <= day) {
      completed++;
      ci++;
    }
    points.push({ date: new Date(day).toISOString().slice(0, 10), enrolled, completed });
  }
  return points;
}
