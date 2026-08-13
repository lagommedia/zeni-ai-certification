type QuizQuestionView = {
  id: string;
  prompt: string;
  choices: { id: string; text: string }[];
};

export function QuizQuestions({ questions }: { questions: QuizQuestionView[] }) {
  return (
    <div className="flex flex-col gap-5">
      {questions.map((question, index) => (
        <div
          key={question.id}
          role="group"
          aria-labelledby={`question-${question.id}-label`}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5"
        >
          <input type="hidden" name="questionId" value={question.id} />
          <p id={`question-${question.id}-label`} className="mb-1 text-sm font-medium leading-snug">
            {index + 1}. {question.prompt}
          </p>
          {question.choices.map((choice) => (
            <label
              key={choice.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm hover:bg-secondary/60 has-[:checked]:border-sapphire has-[:checked]:bg-accent/40"
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={choice.id}
                required
                className="size-4 accent-sapphire"
              />
              {choice.text}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
