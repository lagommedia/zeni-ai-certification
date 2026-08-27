"use client";

import { useState, useTransition } from "react";
import { setTeamLeadAction } from "./teams-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TeamLeadSelect({
  teamId,
  leadUserId,
  members,
}: {
  teamId: string;
  leadUserId: string | null;
  members: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(leadUserId ?? "none");
  const [isPending, startTransition] = useTransition();

  function handleValueChange(newValue: unknown) {
    const nextLeadUserId = String(newValue);
    setValue(nextLeadUserId);

    const formData = new FormData();
    formData.set("teamId", teamId);
    formData.set("leadUserId", nextLeadUserId);
    startTransition(() => {
      setTeamLeadAction(formData);
    });
  }

  return (
    <Select value={value} disabled={isPending || members.length === 0} onValueChange={handleValueChange}>
      <SelectTrigger size="sm" className="w-44">
        <SelectValue placeholder="No lead" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No lead</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
