import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const QUESTION_COUNT = 20;
const CHOICE_COUNT = 4;

const ExamResponseSchema = z.object({
  questions: z.array(
    z.object({
      prompt: z.string().min(1),
      choices: z.array(z.string().min(1)),
      correctIndex: z.number().int(),
    })
  ),
});

export type GeneratedExamQuestion = {
  prompt: string;
  choices: string[];
  correctIndex: number;
};

const EXAM_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
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
  required: ["questions"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are writing the final certification exam for a Zeni employee training course. You will be given the full written content of every module, plus each module's own quiz (included for reference only, to show what's already been tested) — do not reuse those questions verbatim or lightly reword them; write new questions in your own words, and prefer synthesizing across multiple modules over restating a single module quiz question.

Write exactly ${QUESTION_COUNT} multiple-choice questions, each with exactly ${CHOICE_COUNT} answer choices and exactly one correct answer (correctIndex 0-${CHOICE_COUNT - 1}).

Test understanding of the PRINCIPLES and OPERATIONS of how the AI CFO product works and how a Zeni team member should use and talk about it — not memorization of specific figures, dates, or dollar amounts that appear in the course's worked examples. Never write a question whose only correct answer is a specific number, date, or figure quoted from an example (e.g. do not ask "What was the Q2 net burn?" or "How much did severance total?" or "What was the runway in months?").

Prioritize, in roughly this order:
1. How the product actually works — the underlying pipeline, workflow, and mechanics the course describes (e.g. how an answer gets produced, what the reasoning stream shows, how breakdowns relate to statements, how benchmarks relate to book-truth, configuration caveats, available skills, follow-ups, artifacts, document workflows — whatever the specific course material actually covers).
2. Realistic scenarios: given a situation with a customer or teammate, what is the right way to interact with the AI CFO or communicate the result? These require judgment, not recall of a number.
3. Common misconceptions or mistakes a new team member might make, and the caveats the course explicitly calls out.

Cover breadth across all modules in the material — do not repeat the same underlying concept more than two or three times across the ${QUESTION_COUNT} questions. Write plausible, non-trivial wrong answers; avoid choices that are obviously silly filler.

CHOICE LENGTH — this is a hard requirement, not a suggestion. Across every question you write, the most common failure is making the correct choice the longest, most detailed, or most hedged one — that alone lets a test-taker guess it without knowing the material. For each question:
- Count words. All ${CHOICE_COUNT} choices must land within about 20% of each other in word count — roughly the same length, give or take a few words. None may be dramatically longer or shorter than the rest.
- Match register too: if the correct choice is a single crisp sentence, every distractor must also be a single crisp sentence (not a fragment, not a run-on). If distractors are short and punchy, the correct choice must be equally short and punchy — cut it down rather than leaving it as the one detailed, qualified answer.
- Do not signal correctness through hedging, extra caveats, or "more precise-sounding" phrasing on the right answer. Wrong answers should be just as specific and confidently worded — plausible enough that only someone who actually knows the material can eliminate them.

Bad example (correct answer is obvious from length/detail alone — never write like this):
  A) It shows progress.
  B) It streams the model's intermediate reasoning steps in real time as it works through the financial data, so the user can see how the answer is being derived rather than just waiting for a final number.
  C) It's a loading spinner.
  D) It logs errors.
Good example (same correct answer, rewritten so all four are comparable):
  A) It shows a generic loading indicator.
  B) It streams the model's intermediate reasoning steps as it works.
  C) It displays a static progress percentage.
  D) It logs backend errors for debugging.

Also vary which position (first, second, third, fourth) holds the correct answer across the ${QUESTION_COUNT} questions, rather than favoring one slot. Before finalizing each question, check it against both rules above and rewrite any choice that stands out.`;

async function buildCourseDigest(courseId: string): Promise<{ title: string; digest: string }> {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          blocks: { orderBy: { order: "asc" } },
          quiz: {
            include: {
              questions: {
                orderBy: { order: "asc" },
                include: { choices: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  const sections = course.modules.map((module) => {
    const lines: string[] = [`## Module: ${module.title}`];
    if (module.subtitle) lines.push(module.subtitle);
    for (const block of module.blocks) {
      if (block.heading) lines.push(`**${block.heading}**`);
      if (block.body) lines.push(block.body);
    }
    if (module.quiz && module.quiz.questions.length > 0) {
      lines.push(
        "**Module quiz (reference only — covers concepts worth testing; write new questions in your own words, don't copy these verbatim):**"
      );
      module.quiz.questions.forEach((q, i) => {
        const correct = q.choices.find((c) => c.isCorrect);
        lines.push(
          `${i + 1}. ${q.prompt}\n` +
            q.choices.map((c) => `- ${c.text}`).join("\n") +
            (correct ? `\n(Correct: ${correct.text})` : "")
        );
      });
    }
    return lines.join("\n\n");
  });

  const digest = [`# ${course.title}`, course.description, ...sections].join("\n\n---\n\n");
  return { title: course.title, digest };
}

/** Calls Claude to write a 20-question final exam from a course's written module content. */
export async function generateFinalExamQuestions(courseId: string): Promise<GeneratedExamQuestion[]> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error(
      "No Anthropic credentials found. Add ANTHROPIC_API_KEY to your .env file to use AI exam generation."
    );
  }

  const { digest } = await buildCourseDigest(courseId);

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: EXAM_JSON_SCHEMA } },
    messages: [{ role: "user", content: digest }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to generate this exam. Try again or adjust the course content.");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model didn't return any exam content.");
  }

  const parsed = ExamResponseSchema.parse(JSON.parse(textBlock.text));

  if (parsed.questions.length !== QUESTION_COUNT) {
    throw new Error(`Expected ${QUESTION_COUNT} questions, got ${parsed.questions.length}. Try regenerating.`);
  }
  for (const q of parsed.questions) {
    if (q.choices.length !== CHOICE_COUNT) {
      throw new Error(`Question "${q.prompt}" has ${q.choices.length} choices, expected ${CHOICE_COUNT}.`);
    }
    if (q.correctIndex < 0 || q.correctIndex >= CHOICE_COUNT) {
      throw new Error(`Question "${q.prompt}" has an out-of-range correctIndex.`);
    }
  }

  return parsed.questions;
}
