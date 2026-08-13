"use client";

import { useState, useTransition } from "react";
import { setHonorConfirmedAction } from "@/app/(app)/courses/[courseId]/actions";

export function HonorCheckbox({
  moduleId,
  initialConfirmed,
}: {
  moduleId: string;
  initialConfirmed: boolean;
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

  return (
    <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-onyx">
      <input
        type="checkbox"
        checked={confirmed}
        onChange={handleChange}
        disabled={isPending}
        className="size-4 accent-sapphire"
      />
      Completed
    </label>
  );
}
