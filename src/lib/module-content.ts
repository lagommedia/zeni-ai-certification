// The "what you'll learn" objectives box is a regular CALLOUT content block,
// but it's auto-managed from the module form's dedicated field rather than
// the general block editor. This fixed heading is how we recognize it —
// and `order: 0` (below the general add-block form's 1-based counter)
// guarantees it always sorts first without having to renumber siblings.
export const OBJECTIVES_BLOCK_HEADING = "BY THE END OF THIS MODULE, YOU SHOULD BE ABLE TO:";
export const OBJECTIVES_BLOCK_ORDER = 0;

// Sentinel heading (matched case-insensitively) recognizing a module's
// "now you try it" action callout — the one that gets an honor-system
// checkbox gating the quiz. Same convention as OBJECTIVES_BLOCK_HEADING:
// authored as plain heading text on a regular CALLOUT block, no separate
// schema field.
export const HONOR_CALLOUT_HEADING = "Now it's your turn";

export function isHonorCallout(block: { type: string; heading: string | null }): boolean {
  return block.type === "CALLOUT" && block.heading?.trim().toLowerCase() === HONOR_CALLOUT_HEADING.toLowerCase();
}

/** Turns freeform lines of admin input into "- " bullet body text. */
export function formatObjectivesBody(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith("- ") ? line : `- ${line}`))
    .join("\n");
}

/** Reverses formatObjectivesBody, for pre-filling the edit form. */
export function parseObjectivesBody(body: string): string {
  return body
    .split("\n")
    .map((line) => line.trim().replace(/^- /, ""))
    .filter(Boolean)
    .join("\n");
}
