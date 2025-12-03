"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatAnswer } from "@/lib/call-list-utils";
import type { Question, Answer } from "@/types/call-lists.types";

export interface QuestionAnswerFormProps {
  questions: Question[];
  previousAnswers?: Answer[];
  answers: Record<string, any>;
  onAnswerChange: (questionId: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function QuestionAnswerForm({
  questions,
  previousAnswers = [],
  answers,
  onAnswerChange,
  errors = {},
  disabled = false,
}: QuestionAnswerFormProps) {
  // Create a map of questionId to previous answer for easy lookup
  const previousAnswersMap = new Map(
    previousAnswers.map((answer) => [answer.questionId, answer])
  );

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Questions to Ask</h3>
      {sortedQuestions.map((question) => {
        const previousAnswer = previousAnswersMap.get(question.id);

        return (
          <div key={question.id} className="space-y-2">
            <Label className="text-sm font-medium text-[var(--groups1-text)]">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {/* Show previous answer if exists */}
            {previousAnswer && (
              <div className="p-2 border border-[var(--groups1-border)] rounded bg-[var(--groups1-secondary)] mb-2">
                <p className="text-xs text-[var(--groups1-text-secondary)] mb-1">
                  <span className="font-medium">Previous:</span> {formatAnswer(previousAnswer)}
                </p>
              </div>
            )}

            {/* Render input based on question type */}
            {question.type === "text" && (
              <Input
                value={answers[question.id] || ""}
                onChange={(e) => onAnswerChange(question.id, e.target.value)}
                placeholder="Enter your answer..."
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                disabled={disabled}
              />
            )}

            {question.type === "yes_no" && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={answers[question.id] === true}
                    onChange={() => onAnswerChange(question.id, true)}
                    disabled={disabled}
                    className="rounded border-[var(--groups1-border)]"
                  />
                  <span className="text-sm text-[var(--groups1-text)]">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={answers[question.id] === false}
                    onChange={() => onAnswerChange(question.id, false)}
                    disabled={disabled}
                    className="rounded border-[var(--groups1-border)]"
                  />
                  <span className="text-sm text-[var(--groups1-text)]">No</span>
                </label>
              </div>
            )}

            {question.type === "multiple_choice" && (
              <select
                value={answers[question.id] || ""}
                onChange={(e) => onAnswerChange(question.id, e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                disabled={disabled}
              >
                <option value="">Select an option...</option>
                {question.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {question.type === "number" && (
              <Input
                type="number"
                value={answers[question.id] || ""}
                onChange={(e) => onAnswerChange(question.id, parseFloat(e.target.value) || "")}
                placeholder="Enter a number..."
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                disabled={disabled}
              />
            )}

            {question.type === "date" && (
              <Input
                type="date"
                value={answers[question.id] || ""}
                onChange={(e) => onAnswerChange(question.id, e.target.value)}
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                disabled={disabled}
              />
            )}

            {errors[question.id] && (
              <p className="text-sm text-red-500">{errors[question.id]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

