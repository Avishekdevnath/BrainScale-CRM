"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractQuestions } from "@/lib/call-list-utils";
import type { CallList } from "@/types/call-lists.types";

export interface CollapsibleCallListDetailsProps {
  callList: CallList;
}

export function CollapsibleCallListDetails({ callList }: CollapsibleCallListDetailsProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  const questions = extractQuestions(callList);
  const hasDescription = !!callList.description;
  const hasMessages = callList.messages && callList.messages.length > 0;
  const hasQuestions = questions.length > 0;

  if (!hasDescription && !hasMessages && !hasQuestions) {
    return null;
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <Card variant="groups1">
      <CardHeader variant="groups1" className="py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Call List Details</h3>
          <div className="flex items-center gap-2">
            {hasDescription && (
              <span className="text-xs text-[var(--groups1-text-secondary)]">Description</span>
            )}
            {hasMessages && (
              <span className="text-xs text-[var(--groups1-text-secondary)]">Messages</span>
            )}
            {hasQuestions && (
              <span className="text-xs text-[var(--groups1-text-secondary)]">Questions</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent variant="groups1" className="py-2 space-y-2">
        {/* Description Section */}
        {hasDescription && (
          <div className="border border-[var(--groups1-border)] rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection("description")}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>Description</span>
              </div>
              {expandedSections.has("description") ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections.has("description") && (
              <div className="px-3 pb-3 pt-2 border-t border-[var(--groups1-border)]">
                <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap">
                  {callList.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Messages Section */}
        {hasMessages && (
          <div className="border border-[var(--groups1-border)] rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection("messages")}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>Messages to Convey</span>
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  ({callList.messages?.length || 0})
                </span>
              </div>
              {expandedSections.has("messages") ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections.has("messages") && (
              <div className="px-3 pb-3 pt-2 border-t border-[var(--groups1-border)]">
                <ul className="list-disc list-inside space-y-2 text-sm text-[var(--groups1-text)]">
                  {callList.messages?.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Questions Section */}
        {hasQuestions && (
          <div className="border border-[var(--groups1-border)] rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection("questions")}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                <span>Questions to Ask</span>
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  ({questions.length})
                </span>
              </div>
              {expandedSections.has("questions") ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {expandedSections.has("questions") && (
              <div className="px-3 pb-3 pt-2 border-t border-[var(--groups1-border)]">
                <div className="space-y-3">
                  {questions
                    .sort((a, b) => a.order - b.order)
                    .map((question) => (
                      <div
                        key={question.id}
                        className="p-3 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-background)]"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-[var(--groups1-text)]">
                            {question.question}
                            {question.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </p>
                          <span className="text-xs px-2 py-1 rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
                            {question.type.replace("_", " ")}
                          </span>
                        </div>
                        {question.type === "multiple_choice" && question.options && (
                          <div className="mt-2">
                            <p className="text-xs text-[var(--groups1-text-secondary)] mb-1">Options:</p>
                            <ul className="list-disc list-inside text-xs text-[var(--groups1-text)] space-y-1">
                              {question.options.map((option, idx) => (
                                <li key={idx}>{option}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

