import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HONOR_CALLOUT_HEADING } from "@/lib/module-content";

const CHOICE_COUNT = 4;
const QUESTIONS_PER_MODULE = 5;

const ContentBlockSchema = z.object({
  type: z.enum(["PARAGRAPH", "HEADING", "CALLOUT"]),
  heading: z.string().nullable(),
  body: z.string().nullable(),
  variant: z.enum(["NEUTRAL", "HIGHLIGHT", "ACTION"]).nullable(),
});

const QuizQuestionSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).length(CHOICE_COUNT),
  correctIndex: z.number().int().min(0).max(CHOICE_COUNT - 1),
});

const GeneratedModuleSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  durationMins: z.number().int().min(5).max(60),
  objectives: z.array(z.string().min(1)).min(3).max(6),
  contentBlocks: z.array(ContentBlockSchema).min(3),
  quiz: z.array(QuizQuestionSchema).length(QUESTIONS_PER_MODULE),
});

const ModuleBuilderResponseSchema = z.object({
  course: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      category: z.string().min(1),
      level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
    })
    .nullable(),
  modules: z.array(GeneratedModuleSchema).min(1),
});

export type GeneratedModule = z.infer<typeof GeneratedModuleSchema>;
export type ModuleBuilderResult = z.infer<typeof ModuleBuilderResponseSchema>;

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    course: {
      type: ["object", "null"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
        level: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] },
      },
      required: ["title", "description", "category", "level"],
      additionalProperties: false,
    },
    modules: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          durationMins: { type: "integer" },
          objectives: { type: "array", items: { type: "string" } },
          contentBlocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["PARAGRAPH", "HEADING", "CALLOUT"] },
                heading: { type: ["string", "null"] },
                body: { type: ["string", "null"] },
                variant: { anyOf: [{ type: "string", enum: ["NEUTRAL", "HIGHLIGHT", "ACTION"] }, { type: "null" }] },
              },
              required: ["type", "heading", "body", "variant"],
              additionalProperties: false,
            },
          },
          quiz: {
            type: "array",
            items: {
              type: "object",
              properties: {
                prompt: { type: "string" },
                choices: { type: "array", items: { type: "string" } },
                correctIndex: { type: "integer" },
              },
              required: ["prompt", "choices", "correctIndex"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "subtitle", "durationMins", "objectives", "contentBlocks", "quiz"],
        additionalProperties: false,
      },
    },
  },
  required: ["course", "modules"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are drafting training module(s) for Zeni's internal employee certification course platform. Zeni is an AI-powered finance/CFO platform for startups; this course trains Zeni's own team on a topic so they can use and talk about it correctly with customers.

You will be given: a topic, optional reference material (treat this as ground truth — Zeni-specific facts, figures, policies, or product behavior), optionally the target course's existing description/category/level and its existing module titles (write around them, don't duplicate), and a sample of an existing module's real content to match tone and structure.

GROUNDING — this is the most important rule. If reference material is supplied, every Zeni-specific claim (how a feature works, a policy, a number, a workflow step) must come from it. Never invent a specific figure, policy detail, or product behavior that isn't in the reference material or the sample module. If reference material is thin or absent, write generally and pedagogically about the topic rather than fabricating Zeni-specific specifics — clearly-labeled general/industry framing is fine; a plausible-sounding but made-up Zeni fact is not.

For each module, write:
- title, subtitle: concise, matching the sample module's register.
- durationMins: a realistic estimate (5-60) given how much content you're writing.
- objectives: 3-6 short "by the end of this module you should be able to..." bullets (imperative, no leading dash, no trailing period).
- contentBlocks: the lesson body as an ordered sequence of blocks. Use PARAGRAPH for body copy, HEADING for a sub-section break (heading text only, body null), CALLOUT for a highlighted box (set variant: NEUTRAL for a neutral aside, HIGHLIGHT for a key habit/must-remember point, ACTION for a prompt to go do something). Write substantive paragraphs (several sentences each), not single-line fragments. Always end the block sequence with exactly one CALLOUT block whose heading is EXACTLY "${HONOR_CALLOUT_HEADING}" (case-sensitive) and whose body describes a short hands-on exercise the reader should actually go do related to this module's topic — this is a recognized platform convention that gates the quiz behind a self-reported checkbox, so it must be the last block and that heading must match exactly.
- quiz: exactly ${QUESTIONS_PER_MODULE} multiple-choice questions, each with exactly ${CHOICE_COUNT} choices and one correctIndex (0-${CHOICE_COUNT - 1}), testing understanding of this module's content specifically (not other modules). Follow these hard rules for every question:
  - All ${CHOICE_COUNT} choices must be within about 20% of each other in word count and match register (don't make the correct choice the longest/most hedged one — that alone gives it away).
  - Write plausible, non-trivial wrong answers, not silly filler.
  - Vary which position holds the correct answer across the ${QUESTIONS_PER_MODULE} questions rather than favoring one slot.
  - Never write a question whose only correct answer is a specific number/date/figure quoted from an example — test the underlying concept.

If you were given a course to create (not add to), also write: title, description, category (a short label like an existing category, e.g. "AI CFO"), and level (BEGINNER/INTERMEDIATE/ADVANCED). Otherwise the course field must be null.`;

function buildUserPrompt(input: {
  topic: string;
  referenceMaterial: string;
  moduleCount: number;
  existingCourse: { title: string; description: string; category: string; existingModuleTitles: string[] } | null;
  sampleModule: string | null;
}): string {
  const parts: string[] = [`# Topic\n${input.topic}`, `# Modules to write\n${input.moduleCount}`];

  if (input.referenceMaterial.trim()) {
    parts.push(`# Reference material (ground truth — use this for any Zeni-specific facts)\n${input.referenceMaterial.trim()}`);
  } else {
    parts.push(`# Reference material\n(none supplied — write generally about the topic, do not invent Zeni-specific specifics)`);
  }

  if (input.existingCourse) {
    parts.push(
      `# Target course (adding module(s) to this existing course — write in scope for it, don't duplicate its existing modules, and course must be null in your response)\n` +
        `Title: ${input.existingCourse.title}\nDescription: ${input.existingCourse.description}\nCategory: ${input.existingCourse.category}\n` +
        `Existing modules: ${input.existingCourse.existingModuleTitles.join(", ") || "(none yet)"}`
    );
  } else {
    parts.push(`# Target course\n(none — propose a new course for this topic; course must be filled in in your response)`);
  }

  if (input.sampleModule) {
    parts.push(`# Sample of an existing module (match this tone/structure, don't reuse its content)\n${input.sampleModule}`);
  }

  return parts.join("\n\n---\n\n");
}

async function getSampleModuleDigest(): Promise<string | null> {
  const sample = await prisma.module.findFirst({
    where: { blocks: { some: {} } },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (!sample) return null;

  const lines = [`## ${sample.title}`, sample.subtitle ?? ""];
  for (const block of sample.blocks) {
    if (block.heading) lines.push(`**${block.heading}**`);
    if (block.body) lines.push(block.body);
  }
  return lines.filter(Boolean).join("\n\n");
}

export async function generateCourseModules(input: {
  topic: string;
  referenceMaterial: string;
  moduleCount: number;
  targetCourseId: string | null;
}): Promise<ModuleBuilderResult> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error(
      "No Anthropic credentials found. Add ANTHROPIC_API_KEY to your .env file to use the course builder."
    );
  }
  if (!input.topic.trim()) throw new Error("A topic is required");

  const [existingCourse, sampleModule] = await Promise.all([
    input.targetCourseId
      ? prisma.course.findUniqueOrThrow({
          where: { id: input.targetCourseId },
          include: { modules: { orderBy: { order: "asc" }, select: { title: true } } },
        })
      : Promise.resolve(null),
    getSampleModuleDigest(),
  ]);

  const userPrompt = buildUserPrompt({
    topic: input.topic,
    referenceMaterial: input.referenceMaterial,
    moduleCount: input.moduleCount,
    existingCourse: existingCourse
      ? {
          title: existingCourse.title,
          description: existingCourse.description,
          category: existingCourse.category,
          existingModuleTitles: existingCourse.modules.map((m) => m.title),
        }
      : null,
    sampleModule,
  });

  // Streamed — at this max_tokens the SDK refuses a plain (non-streaming)
  // request outright, since a multi-module response can plausibly run long
  // enough to hit the 10-minute non-streaming cap.
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: RESPONSE_JSON_SCHEMA } },
    messages: [{ role: "user", content: userPrompt }],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to generate this content. Try a different topic or reference material.");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model didn't return any content.");
  }

  const parsed = ModuleBuilderResponseSchema.parse(JSON.parse(textBlock.text));

  if (parsed.modules.length !== input.moduleCount) {
    throw new Error(`Expected ${input.moduleCount} module(s), got ${parsed.modules.length}. Try regenerating.`);
  }
  if (!input.targetCourseId && !parsed.course) {
    throw new Error("The model didn't propose a course. Try regenerating.");
  }

  return parsed;
}
