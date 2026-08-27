import { CheckCircle2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type EnrollmentStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

// Same status vocabulary/visual language as the student-facing Courses page
// (src/app/(app)/courses/page.tsx) — kept in sync deliberately so "in
// progress" and "completed" mean the same thing everywhere in the app.
export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatusValue }) {
  if (status === "COMPLETED") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 className="size-3.5" />
        Completed
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-sapphire">
        <PlayCircle className="size-3.5" />
        In progress
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Not started</span>;
}

export function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
        expanded && "rotate-90"
      )}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
