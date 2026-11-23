"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { setHonorConfirmedAction } from "@/app/(app)/courses/[courseId]/actions";

export function HonorCheckbox({
  moduleId,
  initialConfirmed,
  lockedReason,
}: {
  moduleId: string;
  initialConfirmed: boolean;
  // Set while something else (e.g. a required lab) still has to be finished
  // before this can be ticked; the server enforces the same rule.
  lockedReason?: string;
}) {
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setConfirmed(next);
    startTransition(async () => {
      await setHonorConfirmedAction(moduleId, next);
    });
  }

  const locked = !!lockedReason && !confirmed;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <label
        className={`flex w-fit items-center gap-2 text-sm font-medium text-onyx ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={handleChange}
          disabled={isPending || locked}
          className="size-4 accent-sapphire"
        />
        Completed
      </label>
      {locked && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3" />
          {lockedReason}
        </span>
      )}
    </div>
  );
}
