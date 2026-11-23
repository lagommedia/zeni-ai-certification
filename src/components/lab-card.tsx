"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabOverlay } from "@/components/lab-overlay";
import type { LabAttemptView } from "@/lib/lab-events";

const subscribeNothing = () => () => {};

function formatDate(iso: string, localTime: boolean) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    // Server render + hydration use UTC so the markup is identical; once
    // mounted we switch to the learner's own timezone.
    ...(localTime ? {} : { timeZone: "UTC" }),
  });
}

export function LabCard({
  blockId,
  title,
  required,
  courseTitle,
  moduleTitle,
  initialAttempt,
  children,
}: {
  blockId: string;
  title: string;
  required: boolean;
  courseTitle: string;
  moduleTitle: string;
  initialAttempt: LabAttemptView | null;
  children?: ReactNode;
}) {
  // The overlay reports the saved attempt back as events land; until then (and
  // after any server refresh) the server-rendered attempt is the source of truth.
  const [liveAttempt, setLiveAttempt] = useState<LabAttemptView | null>(null);
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );

  const attempt = liveAttempt ?? initialAttempt;
  const completed = attempt?.status === "COMPLETED";
  const buttonLabel = !attempt ? "Start lab" : completed ? "Retake" : "Resume";

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-sapphire/30 bg-sapphire-light/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sapphire-dark">
            <FlaskConical className="size-3.5" />
            Interactive lab
          </p>
          {required && (
            <span className="rounded-full border border-sapphire/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sapphire-dark">
              Required
            </span>
          )}
        </div>

        <h4 className="text-h7 font-medium text-onyx">{title}</h4>
        {children}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">
            {!attempt && <span className="text-muted-foreground">Not started</span>}
            {attempt && !completed && (
              <span className="font-medium text-sapphire">
                In progress: step {Math.min(attempt.furthestStep + 1, attempt.totalSteps)} of{" "}
                {attempt.totalSteps}
              </span>
            )}
            {attempt && completed && (
              <span className="flex items-center gap-1.5 font-medium text-success">
                <CheckCircle2 className="size-4" />
                Completed
                {attempt.completedAt && ` ${formatDate(attempt.completedAt, mounted)}`}
              </span>
            )}
          </span>
          <Button variant={completed ? "outline" : "default"} onClick={() => setOpen(true)}>
            {buttonLabel}
          </Button>
        </div>
      </div>

      {open &&
        createPortal(
          <LabOverlay
            blockId={blockId}
            title={title}
            courseTitle={courseTitle}
            moduleTitle={moduleTitle}
            onAttempt={setLiveAttempt}
            onClose={() => setOpen(false)}
          />,
          document.body
        )}
    </>
  );
}
