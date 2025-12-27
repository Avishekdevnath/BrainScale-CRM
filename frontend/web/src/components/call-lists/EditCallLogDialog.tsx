"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Textarea component - using native textarea for now
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatAnswer } from "@/lib/call-list-utils";
import type { CallLog, CallLogStatus, UpdateCallLogRequest, Answer, Question } from "@/types/call-lists.types";

export interface EditCallLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callLog: CallLog | null;
  onSuccess?: () => void;
}

const STATUS_OPTIONS: { value: CallLogStatus; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "busy", label: "Busy" },
  { value: "no_answer", label: "No Answer" },
  { value: "voicemail", label: "Voicemail" },
  { value: "other", label: "Other" },
];

export function EditCallLogDialog({
  open,
  onOpenChange,
  callLog,
  onSuccess,
}: EditCallLogDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<UpdateCallLogRequest>({
    status: undefined,
    callDuration: undefined,
    notes: undefined,
    callerNote: undefined,
    followUpRequired: undefined,
    followUpDate: undefined,
    answers: undefined,
  });
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [followUpNote, setFollowUpNote] = useState("");

  // Initialize form data when call log changes
  useEffect(() => {
    if (callLog && open) {
      // Initialize answers from existing call log
      const answersMap: Record<string, any> = {};
      if (callLog.answers && callLog.answers.length > 0) {
        callLog.answers.forEach((answer) => {
          answersMap[answer.questionId] = answer.answer;
        });
      }
      setAnswers(answersMap);

      // Extract follow-up note from notes if it exists
      let notesText = callLog.notes || "";
      let extractedFollowUpNote = "";
      
      if (notesText.includes("--- Follow-up Note ---")) {
        const parts = notesText.split("--- Follow-up Note ---");
        notesText = parts[0].trim();
        extractedFollowUpNote = parts[1]?.trim() || "";
      }

      setFormData({
        status: callLog.status,
        callDuration: callLog.callDuration || 0,
        notes: notesText,
        callerNote: callLog.callerNote || "",
        followUpRequired: callLog.followUpRequired || false,
        followUpDate: callLog.followUpDate
          ? new Date(callLog.followUpDate).toISOString().split("T")[0]
          : undefined,
        answers: callLog.answers || [],
      });
      
      // Initialize follow-up note from extracted note or empty
      setFollowUpNote(extractedFollowUpNote);
    }
  }, [callLog, open]);

  const questions: Question[] = callLog?.callList?.questions || [];

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callLog) return;

    setIsSubmitting(true);
    try {
      // Build answers array from answers state
      const answersArray: Answer[] = questions
        .filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "")
        .map((question) => {
          const existingAnswer = callLog.answers?.find((a) => a.questionId === question.id);
          return {
            questionId: question.id,
            question: question.question,
            answer: answers[question.id],
            answerType: question.type,
          };
        });

      const payload: UpdateCallLogRequest = {
        status: formData.status,
        callDuration: formData.callDuration,
        notes: formData.notes || undefined,
        callerNote: formData.callerNote || undefined,
        followUpRequired: formData.followUpRequired,
        followUpDate: formData.followUpDate
          ? new Date(formData.followUpDate).toISOString()
          : undefined,
        followUpNote: formData.followUpRequired && followUpNote.trim() ? followUpNote.trim() : undefined,
        answers: answersArray.length > 0 ? answersArray : undefined,
      };

      await apiClient.updateCallLog(callLog.id, payload);
      toast.success("Call log updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to update call log:", error);
      toast.error(error?.message || "Failed to update call log");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!callLog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Edit Call Log</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Info (Read-only) */}
          {callLog.student && (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <Label className="text-sm font-semibold text-[var(--groups1-text)] mb-2 block">
                Student
              </Label>
              <p className="text-sm text-[var(--groups1-text)]">
                {callLog.student.name}
                {callLog.student.email && ` (${callLog.student.email})`}
              </p>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status || ""}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as CallLogStatus })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Call Duration */}
          <div className="space-y-2">
            <Label htmlFor="callDuration">Call Duration (seconds)</Label>
            <Input
              id="callDuration"
              type="number"
              min="0"
              value={formData.callDuration || 0}
              onChange={(e) =>
                setFormData({ ...formData, callDuration: parseInt(e.target.value) || 0 })
              }
              className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
            />
          </div>

          {/* Questions and Answers */}
          {questions.length > 0 && (
            <div className="space-y-4 p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3">
                Questions & Answers
              </h3>
              <div className="space-y-4">
                {questions
                  .sort((a, b) => a.order - b.order)
                  .map((question) => {
                    const currentAnswer = answers[question.id];
                    const existingAnswer = callLog.answers?.find((a) => a.questionId === question.id);

                    return (
                      <div key={question.id} className="space-y-2">
                        <Label className="text-sm font-medium text-[var(--groups1-text)]">
                          {question.question}
                          {question.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>

                        {/* Show previous answer if exists */}
                        {existingAnswer && (
                          <div className="text-xs text-[var(--groups1-text-secondary)] mb-1 p-2 bg-[var(--groups1-background)] rounded border border-[var(--groups1-border)]">
                            <span className="font-medium">Previous answer: </span>
                            {formatAnswer(existingAnswer)}
                          </div>
                        )}

                        {/* Text input */}
                        {question.type === "text" && (
                          <Input
                            value={currentAnswer || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="Enter your answer..."
                            className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                            disabled={isSubmitting}
                          />
                        )}

                        {/* Yes/No */}
                        {question.type === "yes_no" && (
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value="true"
                                checked={currentAnswer === true || currentAnswer === "true"}
                                onChange={() => handleAnswerChange(question.id, true)}
                                disabled={isSubmitting}
                                className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-[var(--groups1-focus-ring)]"
                              />
                              <span className="text-sm text-[var(--groups1-text)]">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value="false"
                                checked={currentAnswer === false || currentAnswer === "false"}
                                onChange={() => handleAnswerChange(question.id, false)}
                                disabled={isSubmitting}
                                className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-[var(--groups1-focus-ring)]"
                              />
                              <span className="text-sm text-[var(--groups1-text)]">No</span>
                            </label>
                          </div>
                        )}

                        {/* Multiple choice */}
                        {question.type === "multiple_choice" && question.options && (
                          <select
                            value={currentAnswer || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                            disabled={isSubmitting}
                          >
                            <option value="">Select an option...</option>
                            {question.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Number */}
                        {question.type === "number" && (
                          <Input
                            type="number"
                            value={currentAnswer || ""}
                            onChange={(e) =>
                              handleAnswerChange(
                                question.id,
                                e.target.value ? parseFloat(e.target.value) : ""
                              )
                            }
                            placeholder="Enter a number..."
                            className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                            disabled={isSubmitting}
                          />
                        )}

                        {/* Date */}
                        {question.type === "date" && (
                          <Input
                            type="date"
                            value={
                              currentAnswer
                                ? typeof currentAnswer === "string"
                                  ? currentAnswer.split("T")[0]
                                  : ""
                                : ""
                            }
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                            disabled={isSubmitting}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-none"
              placeholder="What the student is saying - additional information besides answering questions..."
            />
          </div>

          {/* Caller Note */}
          <div className="space-y-2">
            <Label htmlFor="callerNote">Caller Note (Optional)</Label>
            <textarea
              id="callerNote"
              value={formData.callerNote || ""}
              onChange={(e) => setFormData({ ...formData, callerNote: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-none"
              placeholder="Add your remarks or observations about this call..."
            />
          </div>

          {/* Follow-up Section */}
          <div className="space-y-4 p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="followUpRequired"
                checked={formData.followUpRequired || false}
                onChange={(e) =>
                  setFormData({ ...formData, followUpRequired: e.target.checked })
                }
                className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-[var(--groups1-focus-ring)]"
              />
              <Label htmlFor="followUpRequired" className="text-sm font-semibold text-[var(--groups1-text)]">
                Requires Follow-up
              </Label>
            </div>

            {formData.followUpRequired && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="followUpDate">Follow-up Date</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={formData.followUpDate || ""}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="followUpNote">Follow-up Note</Label>
                  <textarea
                    id="followUpNote"
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-none"
                    placeholder="Add a note for the follow-up call..."
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-[var(--groups1-text-secondary)]">
                    This note will be visible when making the follow-up call
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--groups1-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Call Log"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

