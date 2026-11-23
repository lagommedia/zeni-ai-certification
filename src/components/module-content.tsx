import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseRichText, type InlineSegment } from "@/lib/rich-text";
import { CopyBlock } from "@/components/copy-block";
import { HonorCheckbox } from "@/components/honor-checkbox";
import { LabCard } from "@/components/lab-card";
import { isHonorCallout } from "@/lib/module-content";
import type { LabAttemptView } from "@/lib/lab-events";

function Segments({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>
      )}
    </>
  );
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = parseRichText(text);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {blocks.map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Segments segments={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Segments segments={block.segments} />
          </p>
        )
      )}
    </div>
  );
}

const CALLOUT_STYLES: Record<string, { container: string; eyebrow: string; body: string }> = {
  NEUTRAL: {
    container: "border-border bg-secondary/50",
    eyebrow: "text-muted-foreground",
    body: "text-foreground",
  },
  HIGHLIGHT: {
    container: "border-gold bg-gold-light/30",
    eyebrow: "text-[#7a5715]",
    body: "text-onyx",
  },
  ACTION: {
    container: "border-jade bg-jade-light/40",
    eyebrow: "text-sapphire-dark",
    body: "text-onyx",
  },
};

export type ContentBlockView = {
  id: string;
  type: "PARAGRAPH" | "HEADING" | "CALLOUT" | "COPY_BLOCK" | "LAB";
  heading: string | null;
  body: string | null;
  variant: "NEUTRAL" | "HIGHLIGHT" | "ACTION" | null;
  fileUrl: string | null;
  fileName: string | null;
  labRequired: boolean;
};

export type LabContext = {
  courseTitle: string;
  moduleTitle: string;
  // Saved attempts for this learner, keyed by LAB block id.
  attempts: Record<string, LabAttemptView>;
};

export function ModuleContent({
  blocks,
  moduleId,
  honorConfirmed,
  labContext,
  labLocked,
}: {
  blocks: ContentBlockView[];
  moduleId?: string;
  honorConfirmed?: boolean;
  labContext?: LabContext;
  // A required lab in this module is still unfinished.
  labLocked?: boolean;
}) {
  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground">
      {blocks.map((block) => {
        if (block.type === "HEADING") {
          return (
            <h4 key={block.id} className="text-h7 font-medium text-onyx">
              {block.heading}
            </h4>
          );
        }

        if (block.type === "COPY_BLOCK") {
          return block.body ? <CopyBlock key={block.id} text={block.body} /> : null;
        }

        if (block.type === "LAB") {
          if (!labContext) return null;
          return (
            <LabCard
              key={block.id}
              blockId={block.id}
              title={block.heading ?? "Interactive lab"}
              required={block.labRequired}
              courseTitle={labContext.courseTitle}
              moduleTitle={labContext.moduleTitle}
              initialAttempt={labContext.attempts[block.id] ?? null}
            >
              {block.body && <RichText text={block.body} />}
            </LabCard>
          );
        }

        if (block.type === "CALLOUT") {
          const styles = CALLOUT_STYLES[block.variant ?? "NEUTRAL"];
          return (
            <div key={block.id} className={cn("rounded-xl border p-4", styles.container)}>
              {block.heading && (
                <p className={cn("mb-1.5 text-xs font-semibold uppercase tracking-wide", styles.eyebrow)}>
                  {block.heading}
                </p>
              )}
              {block.body && <RichText text={block.body} className={styles.body} />}
              {block.fileUrl && (
                <a
                  href={block.fileUrl}
                  download={block.fileName ?? undefined}
                  className={cn(
                    "mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-current/30 bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary/60",
                    styles.body
                  )}
                >
                  <Download className="size-3.5" />
                  {block.fileName ?? "Download file"}
                </a>
              )}
              {moduleId && isHonorCallout(block) && (
                <HonorCheckbox
                  moduleId={moduleId}
                  initialConfirmed={honorConfirmed ?? false}
                  lockedReason={labLocked ? "Finish the lab to unlock this" : undefined}
                />
              )}
            </div>
          );
        }

        return block.body ? <RichText key={block.id} text={block.body} /> : null;
      })}
    </div>
  );
}
