"use client";

import { useRef, useState } from "react";
import { setCoursePublishedAction } from "./actions";
import { Switch } from "@/components/ui/switch";

export function PublishSwitch({
  courseId,
  published,
}: {
  courseId: string;
  published: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [checked, setChecked] = useState(published);

  return (
    <form ref={formRef} action={setCoursePublishedAction}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="published" value={checked ? "true" : "false"} />
      <Switch
        checked={checked}
        onCheckedChange={(value) => {
          setChecked(value);
          requestAnimationFrame(() => formRef.current?.requestSubmit());
        }}
      />
    </form>
  );
}
