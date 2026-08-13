import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Trash2 } from "lucide-react";
import {
  addQuizQuestionAction,
  deleteQuizAction,
  deleteQuizQuestionAction,
  updateQuizPassingScoreAction,
  updateQuizQuestionAction,
} from "./actions";

type QuizWithQuestions = {
  id: string;
  passingScore: number;
  questions: {
    id: string;
    prompt: string;
    choices: { id: string; text: string; isCorrect: boolean }[];
  }[];
};

export function QuizEditor({
  quiz,
  courseId,
  createAction,
  createHiddenFields = {},
  label,
}: {
  quiz: QuizWithQuestions | null;
  courseId: string;
  createAction: (formData: FormData) => Promise<void>;
  createHiddenFields?: Record<string, string>;
  label: string;
}) {
  if (!quiz) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <form action={createAction} className="flex items-center justify-between gap-3">
          <input type="hidden" name="courseId" value={courseId} />
          {Object.entries(createHiddenFields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <p className="text-sm text-muted-foreground">No {label} yet.</p>
          <Button type="submit" size="sm" variant="outline">
            Add {label}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action={updateQuizPassingScoreAction} className="flex items-center gap-2">
          <input type="hidden" name="quizId" value={quiz.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <Label htmlFor={`passing-${quiz.id}`} className="text-xs text-muted-foreground">
            Passing score (%)
          </Label>
          <Input
            id={`passing-${quiz.id}`}
            type="number"
            name="passingScore"
            min={1}
            max={100}
            defaultValue={quiz.passingScore}
            className="w-20"
          />
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>
        <form action={deleteQuizAction}>
          <input type="hidden" name="quizId" value={quiz.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <ConfirmSubmitButton
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            confirmMessage={`Remove the ${label}? All of its questions will be deleted too.`}
          >
            <Trash2 className="size-3.5" />
            Remove {label}
          </ConfirmSubmitButton>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {quiz.questions.map((question, index) => (
          <details
            key={question.id}
            className="rounded-lg border bg-secondary/30 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-sm">
              <span>
                {index + 1}. {question.prompt}
              </span>
            </summary>
            <div className="flex flex-col gap-3 border-t p-3">
              <form action={updateQuizQuestionAction} className="flex flex-col gap-3">
                <input type="hidden" name="questionId" value={question.id} />
                <input type="hidden" name="courseId" value={courseId} />
                <div className="flex flex-col gap-1.5">
                  <Label>Question</Label>
                  <Textarea name="prompt" defaultValue={question.prompt} required rows={2} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Choices (select the correct one)</Label>
                  {question.choices.map((choice, i) => (
                    <div key={choice.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctIndex"
                        value={i}
                        defaultChecked={choice.isCorrect}
                        className="size-4 shrink-0 accent-sapphire"
                      />
                      <Input name={`choice${i}`} defaultValue={choice.text} required />
                    </div>
                  ))}
                </div>
                <Button type="submit" size="sm" className="w-fit">
                  Save question
                </Button>
              </form>
              <form action={deleteQuizQuestionAction}>
                <input type="hidden" name="questionId" value={question.id} />
                <input type="hidden" name="courseId" value={courseId} />
                <ConfirmSubmitButton
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  confirmMessage="Delete this question?"
                >
                  <Trash2 className="size-3.5" />
                  Delete question
                </ConfirmSubmitButton>
              </form>
            </div>
          </details>
        ))}
      </div>

      <div className="rounded-lg border border-dashed p-3">
        <p className="mb-2 text-sm font-medium">Add a question</p>
        <form action={addQuizQuestionAction} className="flex flex-col gap-3">
          <input type="hidden" name="quizId" value={quiz.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <div className="flex flex-col gap-1.5">
            <Label>Question</Label>
            <Textarea name="prompt" placeholder="Question prompt" required rows={2} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Choices (select the correct one)</Label>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctIndex"
                  value={i}
                  defaultChecked={i === 0}
                  className="size-4 shrink-0 accent-sapphire"
                />
                <Input name={`choice${i}`} placeholder={`Choice ${i + 1}`} required />
              </div>
            ))}
          </div>
          <Button type="submit" size="sm" className="w-fit">
            Add question
          </Button>
        </form>
      </div>
    </div>
  );
}
