"use client";

import { useState, useTransition } from "react";
import { assignUserTeamAction } from "./teams-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TeamSelect({
  userId,
  teamId,
  teams,
}: {
  userId: string;
  teamId: string | null;
  teams: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(teamId ?? "none");
  const [isPending, startTransition] = useTransition();
  const teamsById = new Map(teams.map((team) => [team.id, team.name]));

  function handleValueChange(newValue: unknown) {
    const nextTeamId = String(newValue);
    setValue(nextTeamId);

    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("teamId", nextTeamId);
    startTransition(() => {
      assignUserTeamAction(formData);
    });
  }

  return (
    <Select value={value} disabled={isPending} onValueChange={handleValueChange}>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue>
          {(currentTeamId: string) =>
            currentTeamId === "none" ? "No team" : (teamsById.get(currentTeamId) ?? "No team")
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No team</SelectItem>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
