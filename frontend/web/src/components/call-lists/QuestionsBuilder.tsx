"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildQuestionId } from "@/lib/call-list-utils";
import type { Question, QuestionType } from "@/types/call-lists.types";

export interface QuestionsBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
  disabled?: boolean;
}

export function QuestionsBuilder({ questions, onChange, disabled }: QuestionsBuilderProps) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: buildQuestionId(),
      question: "",
      type: "text",
      required: false,
      order: questions.length,
    };
    onChange([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    const filtered = questions.filter((q) => q.id !== id);
    // Reorder remaining questions
    const reordered = filtered.map((q, index) => ({
      ...q,
      order: index,
    }));
    onChange(reordered);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    onChange(
      questions.map((q) => {
        if (q.id === id) {
          return { ...q, ...updates };
        }
        return q;
      })
    );
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === questions.length - 1) return;

    const updated = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    
    // Update order values
    updated.forEach((q, i) => {
      q.order = i;
    });
    
    onChange(updated);
  };

  const addOption = (questionId: string) => {
    onChange(
      questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: [...(q.options || []), ""],
          };
        }
        return q;
      })
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    onChange(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = (q.options || []).filter((_, i) => i !== optionIndex);
          return {
            ...q,
            options: newOptions.length > 0 ? newOptions : undefined,
          };
        }
        return q;
      })
    );
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    onChange(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...(q.options || [])];
          newOptions[optionIndex] = value;
          return {
            ...q,
            options: newOptions,
          };
        }
        return q;
      })
    );
  };

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-[var(--groups1-text)]">
          Questions to Ask
          <span className="text-gray-400 text-xs font-normal ml-1">(Optional)</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addQuestion}
          disabled={disabled}
          className="h-8 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Question
        </Button>
      </div>

      {sortedQuestions.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No questions added yet</p>
      ) : (
        <div className="space-y-4">
          {sortedQuestions.map((question, index) => (
            <div
              key={question.id}
              className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]"
            >
              <div className="flex items-start gap-2 mb-3">
                <div className="flex flex-col gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, "up")}
                    disabled={disabled || index === 0}
                    className={cn(
                      "p-1 rounded hover:bg-[var(--groups1-secondary)] disabled:opacity-30 disabled:cursor-not-allowed",
                      index === 0 && "opacity-30"
                    )}
                  >
                    <ChevronUp className="w-4 h-4 text-[var(--groups1-text)]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, "down")}
                    disabled={disabled || index === sortedQuestions.length - 1}
                    className={cn(
                      "p-1 rounded hover:bg-[var(--groups1-secondary)] disabled:opacity-30 disabled:cursor-not-allowed",
                      index === sortedQuestions.length - 1 && "opacity-30"
                    )}
                  >
                    <ChevronDown className="w-4 h-4 text-[var(--groups1-text)]" />
                  </button>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-[var(--groups1-text)] mb-1 block">
                      Question Text
                    </Label>
                    <Input
                      value={question.question}
                      onChange={(e) =>
                        updateQuestion(question.id, { question: e.target.value })
                      }
                      placeholder="Enter question text..."
                      className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                      disabled={disabled}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium text-[var(--groups1-text)] mb-1 block">
                        Type
                      </Label>
                      <select
                        value={question.type}
                        onChange={(e) => {
                          const newType = e.target.value as QuestionType;
                          updateQuestion(question.id, {
                            type: newType,
                            options: newType === "multiple_choice" ? question.options || [""] : undefined,
                          });
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                        disabled={disabled}
                      >
                        <option value="text">Text</option>
                        <option value="yes_no">Yes/No</option>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-7">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) =>
                          updateQuestion(question.id, { required: e.target.checked })
                        }
                        disabled={disabled}
                        className="rounded border-[var(--groups1-border)]"
                        id={`required-${question.id}`}
                      />
                      <Label
                        htmlFor={`required-${question.id}`}
                        className="text-sm text-[var(--groups1-text)] cursor-pointer"
                      >
                        Required
                      </Label>
                    </div>
                  </div>

                  {question.type === "multiple_choice" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-[var(--groups1-text)]">
                          Options <span className="text-red-500">*</span>
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(question.id)}
                          disabled={disabled}
                          className="h-7 text-xs bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(question.options || []).map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                              placeholder={`Option ${optIndex + 1}...`}
                              className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                              disabled={disabled}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(question.id, optIndex)}
                              disabled={disabled || (question.options?.length || 0) <= 2}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {(question.options?.length || 0) < 2 && (
                          <p className="text-xs text-red-500">
                            Multiple choice questions require at least 2 options
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(question.id)}
                  disabled={disabled}
                  className="mt-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

