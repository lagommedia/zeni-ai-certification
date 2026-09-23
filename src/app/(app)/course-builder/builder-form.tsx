"use client";

import { useActionState, useState } from "react";
import { generateCourseAction, type CourseBuilderState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";

const INITIAL_STATE: CourseBuilderState = { error: null };

export function BuilderForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, formAction, isPending] = useActionState(generateCourseAction, INITIAL_STATE);
  const [mode, setMode] = useState<"new" | "existing">("new");

  const modeButtonClass = (active: boolean) =>
    cn(
      "inline-flex h-full items-center justify-center rounded-md px-3 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
      active ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground"
    );

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="topic">Topic</Label>
        <Input
          id="topic"
          name="topic"
          placeholder="e.g. Bill Pay approval workflows"
          required
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="referenceMaterial">Reference material (optional)</Label>
        <Textarea
          id="referenceMaterial"
          name="referenceMaterial"
          rows={6}
          placeholder="Paste relevant Knowledge Base excerpts, SOPs, or notes here. Left blank, Claude writes generally about the topic instead of inventing Zeni-specific facts."
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Target</Label>
        <div className="inline-flex h-8 w-fit items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
          <button type="button" onClick={() => setMode("new")} disabled={isPending} className={modeButtonClass(mode === "new")}>
            New course
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            disabled={isPending || courses.length === 0}
            className={modeButtonClass(mode === "existing")}
          >
            Add to existing
          </button>
        </div>
      </div>

      {mode === "existing" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetCourseId">Course</Label>
          <Select name="targetCourseId" defaultValue={courses[0]?.id} disabled={isPending}>
            <SelectTrigger id="targetCourseId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="moduleCount">Modules to generate</Label>
        <Select name="moduleCount" defaultValue="1" disabled={isPending}>
          <SelectTrigger id="moduleCount" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 module</SelectItem>
            <SelectItem value="2">2 modules</SelectItem>
            <SelectItem value="3">3 modules</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate
            </>
          )}
        </Button>
        {isPending && (
          <p className="text-xs text-muted-foreground">
            This can take a minute — writing lesson content and a quiz for each module.
          </p>
        )}
      </div>
    </form>
  );
}
