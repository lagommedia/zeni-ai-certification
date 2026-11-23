import "server-only";
import { prisma } from "@/lib/prisma";

export type LabProgressFilters = { courseId?: string; status?: "STARTED" | "COMPLETED" };

export type LabProgressRow = {
  id: string;
  learnerName: string;
  learnerEmail: string;
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  labTitle: string;
  status: "STARTED" | "COMPLETED";
  furthestStep: number;
  totalSteps: number;
  mistakes: number;
  startedAt: Date;
  completedAt: Date | null;
  lastEventAt: Date;
  // completedAt − startedAt; only for completed attempts.
  durationMs: number | null;
};

export function parseLabProgressFilters(params: { course?: string; status?: string }): LabProgressFilters {
  return {
    courseId: params.course || undefined,
    status: params.status === "STARTED" || params.status === "COMPLETED" ? params.status : undefined,
  };
}

export async function fetchLabProgress(filters: LabProgressFilters): Promise<LabProgressRow[]> {
  const rows = await prisma.labAttempt.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.courseId ? { block: { module: { courseId: filters.courseId } } } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      block: {
        select: {
          heading: true,
          module: { select: { title: true, course: { select: { id: true, title: true } } } },
        },
      },
    },
    orderBy: { lastEventAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    learnerName: r.user.name,
    learnerEmail: r.user.email,
    courseId: r.block.module.course.id,
    courseTitle: r.block.module.course.title,
    moduleTitle: r.block.module.title,
    labTitle: r.block.heading ?? "Interactive lab",
    status: r.status,
    furthestStep: r.furthestStep,
    totalSteps: r.totalSteps,
    mistakes: r.mistakes,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    lastEventAt: r.lastEventAt,
    durationMs: r.completedAt ? r.completedAt.getTime() - r.startedAt.getTime() : null,
  }));
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatAdminDate(date: Date | null): string {
  if (!date) return "—";
  return `${date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`;
}

// Cells that start with these are treated as formulas by spreadsheet apps —
// learner names are user-controlled, so neutralise them.
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function labProgressToCsv(rows: LabProgressRow[]): string {
  const header = [
    "Learner",
    "Email",
    "Course",
    "Module",
    "Lab",
    "Status",
    "Furthest step",
    "Total steps",
    "Mistakes",
    "Started (UTC)",
    "Completed (UTC)",
    "Time taken (seconds)",
  ];
  const lines = rows.map((r) =>
    [
      r.learnerName,
      r.learnerEmail,
      r.courseTitle,
      r.moduleTitle,
      r.labTitle,
      r.status === "COMPLETED" ? "Completed" : "In progress",
      r.furthestStep,
      r.totalSteps,
      r.mistakes,
      r.startedAt.toISOString(),
      r.completedAt ? r.completedAt.toISOString() : "",
      r.durationMs === null ? "" : Math.round(r.durationMs / 1000),
    ]
      .map(csvCell)
      .join(",")
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
