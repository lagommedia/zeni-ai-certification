import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchLabProgress,
  formatAdminDate,
  formatDuration,
  parseLabProgressFilters,
} from "@/lib/lab-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download } from "lucide-react";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function LabProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/courses");

  const params = await searchParams;
  const filters = parseLabProgressFilters(params);
  const [rows, courses] = await Promise.all([
    fetchLabProgress(filters),
    prisma.course.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, title: true } }),
  ]);

  const completed = rows.filter((r) => r.status === "COMPLETED").length;
  const exportQuery = new URLSearchParams();
  if (filters.courseId) exportQuery.set("course", filters.courseId);
  if (filters.status) exportQuery.set("status", filters.status);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/settings"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to settings
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-h4 font-medium text-sapphire">Lab progress</h1>
        <p className="text-sm text-muted-foreground">
          One row per learner per interactive lab. Progress is reported by the learner&rsquo;s browser, so
          treat it as a training record, not an exam control.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course">Course</Label>
            <select id="course" name="course" defaultValue={filters.courseId ?? ""} className={SELECT_CLASS}>
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" defaultValue={filters.status ?? ""} className={SELECT_CLASS}>
              <option value="">All statuses</option>
              <option value="STARTED">In progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {rows.length} attempt{rows.length === 1 ? "" : "s"} · {completed} completed
          </span>
          <Button
            render={<a href={`/settings/lab-progress/export${exportQuery.size ? `?${exportQuery}` : ""}`} />}
            nativeButton={false}
            variant="outline"
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          No lab attempts yet{filters.courseId || filters.status ? " for these filters" : ""}.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Furthest step</TableHead>
                <TableHead className="text-right">Mistakes</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Time taken</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.learnerName}</span>
                      <span className="text-xs text-muted-foreground">{row.learnerEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.labTitle}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.courseTitle} · {row.moduleTitle}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.status === "COMPLETED" ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : (
                      <Badge variant="outline">In progress</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.furthestStep} / {row.totalSteps}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{row.mistakes}</TableCell>
                  <TableCell className="text-muted-foreground">{formatAdminDate(row.startedAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatAdminDate(row.completedAt)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatDuration(row.durationMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
