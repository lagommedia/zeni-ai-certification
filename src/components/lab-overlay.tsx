"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { labEventSchema, type LabAttemptView, type LabEvent } from "@/lib/lab-events";

type Run = { started: boolean; completedSteps: number; total: number; done: boolean };

// This run's progress, as shown in the top bar. Separate from the saved
// attempt (which keeps the learner's best result across runs).
function reduceRun(prev: Run, event: LabEvent): Run {
  switch (event.type) {
    case "started":
      return { started: true, completedSteps: 0, total: event.total, done: false };
    case "step_completed":
      return {
        started: true,
        total: event.total,
        done: prev.done,
        completedSteps: Math.max(prev.completedSteps, event.step),
      };
    case "mistake":
      return { ...prev, started: true, total: event.total };
    case "completed":
      return { started: true, completedSteps: event.total, total: event.total, done: true };
  }
}

export function LabOverlay({
  blockId,
  title,
  courseTitle,
  moduleTitle,
  onAttempt,
  onClose,
}: {
  blockId: string;
  title: string;
  courseTitle: string;
  moduleTitle: string;
  onAttempt: (attempt: LabAttemptView) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const onAttemptRef = useRef(onAttempt);
  const [run, setRun] = useState<Run>({ started: false, completedSteps: 0, total: 0, done: false });
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    onAttemptRef.current = onAttempt;
  });

  // Events are sent one at a time, in order, so a slow request can never let
  // an older event overwrite a newer one on the server.
  const enqueue = useCallback(
    (event: LabEvent) => {
      queueRef.current = queueRef.current.then(async () => {
        try {
          const res = await fetch("/api/labs/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blockId, event }),
            keepalive: true,
          });
          if (!res.ok) throw new Error(`Progress request failed (${res.status})`);
          const data = (await res.json()) as { attempt: LabAttemptView };
          setSaveFailed(false);
          onAttemptRef.current(data.attempt);
          // Re-render the server-side module state (checkbox / quiz lock).
          if (event.type === "completed") router.refresh();
        } catch (err) {
          console.warn("Couldn't save lab progress", err);
          setSaveFailed(true);
        }
      });
    },
    [blockId, router]
  );

  // Layout effect so the listener exists before the iframe can possibly post.
  useLayoutEffect(() => {
    function handleMessage(e: MessageEvent) {
      // The sandboxed iframe's origin is "null", so identify it by window,
      // not origin — anything from another window (including this page) is dropped.
      if (!e.source || e.source !== iframeRef.current?.contentWindow) return;
      const parsed = labEventSchema.safeParse(e.data);
      if (!parsed.success) return;
      setRun((prev) => reduceRun(prev, parsed.data));
      enqueue(parsed.data);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [enqueue]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Best effort — browsers may refuse, in which case the fixed overlay
    // still covers the whole app.
    rootRef.current?.requestFullscreen?.().catch(() => {});

    return () => {
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  function close() {
    const pending = queueRef.current;
    onClose();
    void pending.finally(() => router.refresh());
  }

  const percent = run.total > 0 ? Math.round((run.completedSteps / run.total) * 100) : 0;
  const stepLabel = run.started
    ? `Step ${Math.min(run.completedSteps + 1, run.total)} of ${run.total}`
    : "Loading lab…";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[1000] flex flex-col bg-background"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-card px-4 py-2.5">
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-xs text-muted-foreground">
            {courseTitle} · {moduleTitle}
          </p>
          <p className="truncate text-sm font-medium text-onyx">{title}</p>
        </div>

        <div className="flex basis-full flex-col gap-1 sm:basis-72">
          {run.done ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" />
              Lab complete
            </span>
          ) : (
            <span className="text-xs font-medium text-onyx">{stepLabel}</span>
          )}
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-300 ${run.done ? "bg-success" : "bg-sapphire"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveFailed && <span className="text-xs text-attention">Couldn&rsquo;t save progress</span>}
          {run.done ? (
            <Button onClick={close}>Back to module</Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmingExit(true)}>
              <X className="size-3.5" />
              Exit lab
            </Button>
          )}
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={`/labs/${blockId}`}
        title={title}
        sandbox="allow-scripts"
        allow="fullscreen"
        className="w-full flex-1 border-0 bg-white"
      />

      {confirmingExit && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-onyx/50 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-5 shadow-lg">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-onyx">Exit this lab?</p>
              <p className="text-sm text-muted-foreground">
                Your progress so far is saved. You can come back to the lab any time from the module page.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmingExit(false)} autoFocus>
                Keep going
              </Button>
              <Button onClick={close}>Exit lab</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
