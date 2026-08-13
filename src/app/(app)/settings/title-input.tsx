"use client";

import { useRef, useState } from "react";
import { updateUserTitleAction } from "./actions";
import { Input } from "@/components/ui/input";

export function TitleInput({ userId, title }: { userId: string; title: string | null }) {
  const [value, setValue] = useState(title ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateUserTitleAction}>
      <input type="hidden" name="userId" value={userId} />
      <Input
        name="title"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="—"
        className="h-7 w-40 border-transparent bg-transparent px-1.5 text-sm shadow-none hover:border-input focus-visible:border-ring"
        onBlur={() => formRef.current?.requestSubmit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </form>
  );
}
