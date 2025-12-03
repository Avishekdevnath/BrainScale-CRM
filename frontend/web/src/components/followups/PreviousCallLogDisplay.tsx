"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatCallDuration, formatAnswer, getStatusLabel, getStatusColor } from "@/lib/call-list-utils";
import type { FollowupPreviousCallLog } from "@/types/followups.types";
import type { Question } from "@/types/call-lists.types";
import { Calendar, Clock, User } from "lucide-react";

export interface PreviousCallLogDisplayProps {
  previousCallLog: FollowupPreviousCallLog;
  questions?: Question[];
}

export function PreviousCallLogDisplay({
  previousCallLog,
  questions = [],
}: PreviousCallLogDisplayProps) {
  const statusColor = getStatusColor(previousCallLog.status);
  const statusVariant = statusColor === "green" ? "success" : statusColor === "red" ? "error" : statusColor === "yellow" ? "warning" : "info";

  // Create a map of questionId to question for easy lookup
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)] opacity-90">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
        <h3 className="text-sm font-semibold text-[var(--groups1-text-secondary)]">
          Previous Call Information
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <span className="text-gray-500">Call Date:</span>{" "}
          <span className="font-medium text-[var(--groups1-text-secondary)]">
            {new Date(previousCallLog.callDate).toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Status:</span>{" "}
          <StatusBadge variant={statusVariant} size="sm" className="ml-2">
            {getStatusLabel(previousCallLog.status)}
          </StatusBadge>
        </div>
        {previousCallLog.callDuration !== null && (
          <div>
            <span className="text-gray-500">Duration:</span>{" "}
            <span className="font-medium text-[var(--groups1-text-secondary)]">
              {formatCallDuration(previousCallLog.callDuration)}
            </span>
          </div>
        )}
        {previousCallLog.caller && (
          <div>
            <span className="text-gray-500">Caller:</span>{" "}
            <span className="font-medium text-[var(--groups1-text-secondary)]">
              {previousCallLog.caller.name}
            </span>
          </div>
        )}
      </div>

      {/* Previous Answers */}
      {previousCallLog.answers && previousCallLog.answers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-2">
            Previous Answers
          </h4>
          <div className="space-y-2">
            {previousCallLog.answers.map((answer, index) => {
              const question = questionMap.get(answer.questionId);
              return (
                <div
                  key={index}
                  className="p-2 border border-[var(--groups1-border)] rounded bg-[var(--groups1-background)]"
                >
                  <p className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">
                    {answer.question}
                  </p>
                  <p className="text-xs text-[var(--groups1-text-secondary)]">
                    {formatAnswer(answer)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Previous Notes */}
      {(previousCallLog.notes || previousCallLog.callerNote || previousCallLog.summaryNote) && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-2">
            Previous Notes
          </h4>
          <div className="space-y-2 text-sm">
            {previousCallLog.notes && (
              <div>
                <span className="font-medium text-[var(--groups1-text-secondary)] block mb-1">Notes:</span>
                <p className="text-[var(--groups1-text-secondary)] whitespace-pre-wrap bg-[var(--groups1-background)] p-2 rounded border border-[var(--groups1-border)]">
                  {previousCallLog.notes}
                </p>
              </div>
            )}
            {previousCallLog.callerNote && (
              <div>
                <span className="font-medium text-[var(--groups1-text-secondary)] block mb-1">Caller Note:</span>
                <p className="text-[var(--groups1-text-secondary)] whitespace-pre-wrap bg-[var(--groups1-background)] p-2 rounded border border-[var(--groups1-border)]">
                  {previousCallLog.callerNote}
                </p>
              </div>
            )}
            {previousCallLog.summaryNote && (
              <div>
                <span className="font-medium text-[var(--groups1-text-secondary)] block mb-1">AI Summary:</span>
                <p className="text-[var(--groups1-text-secondary)] whitespace-pre-wrap bg-[var(--groups1-background)] p-2 rounded border border-[var(--groups1-border)]">
                  {previousCallLog.summaryNote}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

