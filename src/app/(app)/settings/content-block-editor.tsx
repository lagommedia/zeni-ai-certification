import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Paperclip, Trash2 } from "lucide-react";
import {
  addContentBlockAction,
  deleteContentBlockAction,
  moveContentBlockAction,
  updateContentBlockAction,
} from "./actions";

type ContentBlockRow = {
  id: string;
  type: "PARAGRAPH" | "HEADING" | "CALLOUT" | "COPY_BLOCK";
  order: number;
  heading: string | null;
  body: string | null;
  variant: "NEUTRAL" | "HIGHLIGHT" | "ACTION" | null;
  fileUrl: string | null;
  fileName: string | null;
};

const TYPE_LABEL: Record<ContentBlockRow["type"], string> = {
  PARAGRAPH: "Paragraph",
  HEADING: "Heading",
  CALLOUT: "Callout",
  COPY_BLOCK: "Copy box",
};

function BlockFields({ block }: { block?: ContentBlockRow }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Block type</Label>
          <Select name="type" defaultValue={block?.type ?? "PARAGRAPH"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PARAGRAPH">Paragraph</SelectItem>
              <SelectItem value="HEADING">Heading</SelectItem>
              <SelectItem value="CALLOUT">Callout</SelectItem>
              <SelectItem value="COPY_BLOCK">Copy box — sapphire, with a Copy button</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Callout color (callouts only)</Label>
          <Select name="variant" defaultValue={block?.variant ?? "NEUTRAL"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEUTRAL">Neutral gray — e.g. objectives</SelectItem>
              <SelectItem value="HIGHLIGHT">Gold — e.g. key habit</SelectItem>
              <SelectItem value="ACTION">Jade — e.g. an action prompt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Heading text (for a Heading block) or eyebrow label (for a Callout)</Label>
        <Input name="heading" defaultValue={block?.heading ?? ""} placeholder="e.g. Now you" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Body (Paragraph / Callout / Copy box)</Label>
        <Textarea
          name="body"
          defaultValue={block?.body ?? ""}
          rows={3}
          placeholder={
            "Supports **bold** and \"- \" bullet lines. For a Copy box, this is the exact text the Copy button copies."
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Attachment (callouts only) — lets the user download a file to test with</Label>
        {block?.fileName && (
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 truncate">
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              {block.fileName}
            </span>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="removeFile" value="true" className="size-3.5 accent-sapphire" />
              Remove
            </label>
          </div>
        )}
        <Input name="file" type="file" />
      </div>
    </>
  );
}

export function ContentBlockEditor({
  moduleId,
  courseId,
  blocks,
}: {
  moduleId: string;
  courseId: string;
  blocks: ContentBlockRow[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <details
          key={block.id}
          className="rounded-lg border bg-secondary/30 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm">
            <span className="truncate">
              <span className="font-medium">{TYPE_LABEL[block.type]}</span>
              {(block.heading || block.body) && (
                <span className="ml-2 text-muted-foreground">{block.heading || block.body}</span>
              )}
            </span>
          </summary>
          <div className="flex flex-col gap-3 border-t p-3">
            <form action={updateContentBlockAction} className="flex flex-col gap-3">
              <input type="hidden" name="blockId" value={block.id} />
              <input type="hidden" name="courseId" value={courseId} />
              <BlockFields block={block} />
              <Button type="submit" size="sm" className="w-fit">
                Save block
              </Button>
            </form>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <form action={moveContentBlockAction}>
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="ghost" size="icon-sm" disabled={index === 0}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                </form>
                <form action={moveContentBlockAction}>
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="direction" value="down" />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === blocks.length - 1}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </form>
              </div>
              <form action={deleteContentBlockAction}>
                <input type="hidden" name="blockId" value={block.id} />
                <input type="hidden" name="courseId" value={courseId} />
                <ConfirmSubmitButton
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  confirmMessage="Delete this block?"
                >
                  <Trash2 className="size-3.5" />
                  Delete block
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </details>
      ))}

      <div className="rounded-lg border border-dashed p-3">
        <p className="mb-2 text-sm font-medium">Add a block</p>
        <form action={addContentBlockAction} className="flex flex-col gap-3">
          <input type="hidden" name="moduleId" value={moduleId} />
          <input type="hidden" name="courseId" value={courseId} />
          <BlockFields />
          <Button type="submit" size="sm" className="w-fit">
            Add block
          </Button>
        </form>
      </div>
    </div>
  );
}
