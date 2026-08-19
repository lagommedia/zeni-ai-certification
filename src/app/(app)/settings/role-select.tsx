"use client";

import { useState, useTransition } from "react";
import { updateUserRoleAction } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: "ADMIN" | "USER";
  disabled?: boolean;
}) {
  const [value, setValue] = useState(role);
  const [isPending, startTransition] = useTransition();

  function handleValueChange(newValue: unknown) {
    const nextRole = String(newValue) as "ADMIN" | "USER";
    setValue(nextRole);

    // Build the FormData from the value the callback just handed us, rather
    // than reading it back off the form's hidden input via requestSubmit() —
    // that hidden input hadn't finished updating yet by the time the submit
    // fired, so the server was silently receiving the *previous* role.
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("role", nextRole);
    startTransition(() => {
      updateUserRoleAction(formData);
    });
  }

  return (
    <Select
      name="role"
      value={value}
      disabled={disabled || isPending}
      onValueChange={handleValueChange}
    >
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">Member</SelectItem>
        <SelectItem value="ADMIN">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
