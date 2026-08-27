"use client";

import { useState, useTransition } from "react";
import { renameTeamAction } from "./teams-actions";
import { Input } from "@/components/ui/input";

export function TeamNameInput({ teamId, name }: { teamId: string; name: string }) {
  const [value, setValue] = useState(name);
  const [isPending, startTransition] = useTransition();

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setValue(name);
      return;
    }
    const formData = new FormData();
    formData.set("teamId", teamId);
    formData.set("name", trimmed);
    startTransition(() => {
      renameTeamAction(formData);
    });
  }

  return (
    <Input
      value={value}
      disabled={isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="h-7 w-40 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none hover:border-input focus-visible:border-ring"
    />
  );
}
