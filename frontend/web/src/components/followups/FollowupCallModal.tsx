"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFollowupCallContext } from "@/hooks/useFollowupCallContext";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Phone, User, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { PreviousCallLogDisplay } from "@/components/followups/PreviousCallLogDisplay";
import { QuestionAnswerForm } from "@/components/followups/QuestionAnswerForm";
import { validateCallLog, formatCallDuration } from "@/lib/call-list-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Answer, CallLogStatus } from "@/types/call-lists.types";

const STATUS_OPTIONS: Array<{ value: CallLogStatus; label: string }> = [
  { value: "completed", label: "Complete" },
  { value: "missed", label: "Missed" },
  { value: "busy", label: "Number Busy" },
  { value: "no_answer", label: "Number Off" },
  { value: "voicemail", label: "Voicemail" },
  { value: "other", label: "Abroad Number" },
];

export interface FollowupCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followupId: string | null;
  onSuccess?: () => void;
}

export function FollowupCallModal({
  open,
  onOpenChange,
  followupId,
  onSuccess,
}: FollowupCallModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const [callerNote, setCallerNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showCallerNote, setShowCallerNote] = useState(false);
  const [showPreviousCall, setShowPreviousCall] = useState(false);
  const [status, setStatus] = useState<CallLogStatus>("completed");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [callDuration, setCallDuration] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: context, isLoading, error } = useFollowupCallContext(followupId || "");

  const followup = context?.followup;
  const callList = context?.callList;
  const previousCallLog = context?.previousCallLog;
  const questions = callList?.questions || [];
  const messages = callList?.messages || [];
  const previousAnswers = previousCallLog?.answers || [];
  const student = followup?.student;
  const primaryPhone = student?.phones?.find((p) => p.isPrimary) || student?.phones?.[0];

  // Reset form when modal opens/closes or followup changes
  useEffect(() => {
    if (open && followupId) {
      setAnswers({});
      setNotes("");
      setCallerNote("");
      setShowNotes(false);
      setShowCallerNote(false);
      setShowPreviousCall(false);
      setStatus("completed");
      setFollowUpRequired(false);
      // Auto-populate follow-up date from previous call if available
      if (previousCallLog?.followUpDate) {
        const date = new Date(previousCallLog.followUpDate);
        setFollowUpDate(date.toISOString().split("T")[0]);
      } else {
        setFollowUpDate("");
      }
      setFollowUpNote("");
      setCallDuration("");
      setErrors({});
    }
  }, [open, followupId, previousCallLog]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!callList) return true; // Skip validation if no call list
    
    // Prepare answers array for validation
    const answersArray: Answer[] = Object.keys(answers)
      .map((questionId) => {
        const question = questions.find((q) => q.id === questionId);
        if (!question) return null;
        return {
          questionId,
          question: question.question,
          answer: answers[questionId],
          answerType: question.type,
        };
      })
      .filter((a): a is Answer => a !== null);
    
    // validateCallLog expects answers array as first parameter, questions as second
    const validation = validateCallLog(answersArray, questions);

    if (!validation.valid) {
      // Convert array of error messages to object format for setErrors
      const errorObj: Record<string, string> = {};
      validation.errors.forEach((error, index) => {
        errorObj[`validation_${index}`] = error;
      });
      setErrors(errorObj);
      toast.error("Please fix the errors before submitting");
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!context || !followup || !validateForm()) return;

    setSubmitting(true);
    try {
      // Prepare answers array
      const answersArray: Answer[] = questions
        .filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "")
        .map((q) => {
          let answerValue: string | number | boolean = answers[q.id];

          // Convert answer based on question type
          if (q.type === "number" && typeof answerValue === "string") {
            const numValue = parseFloat(answerValue);
            if (isNaN(numValue)) {
              throw new Error(`Invalid number for question "${q.question}"`);
            }
            answerValue = numValue;
          } else if (q.type === "yes_no" && typeof answerValue === "string") {
            answerValue = answerValue === "true" || answerValue === "yes";
          }

          return {
            questionId: q.id,
            question: q.question,
            answer: answerValue,
            answerType: q.type,
          };
        });

      // Ensure at least one answer is provided (backend requirement)
      if (answersArray.length === 0 && questions.length > 0) {
        toast.error("Please provide at least one answer");
        setSubmitting(false);
        return;
      }

      await apiClient.createFollowupCallLog({
        followupId: followup.id,
        status,
        answers: answersArray,
        notes: notes.trim() || undefined,
        callerNote: callerNote.trim() || undefined,
        followUpDate: followUpRequired && followUpDate ? new Date(followUpDate).toISOString() : undefined,
        followUpRequired: followUpRequired || undefined,
        followUpNote: followUpRequired && followUpNote.trim() ? followUpNote.trim() : undefined,
        callDuration: callDuration ? parseInt(callDuration, 10) : undefined,
      });

      toast.success("Follow-up call log created successfully");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Follow-up call log creation error:", error);
      const errorMessage = error?.message || error?.error?.message || "Failed to create follow-up call log";

      if (error?.status === 400) {
        toast.error(errorMessage);
      } else if (error?.status === 403) {
        toast.error("Access denied");
      } else if (error?.status === 404) {
        toast.error("Follow-up not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!followupId || !open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            {student?.name || "Follow-up Call"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--groups1-primary)]" />
            <p className="mt-2 text-sm text-[var(--groups1-text-secondary)]">Loading follow-up details...</p>
          </div>
        ) : error || !context || !followup ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load follow-up call context"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student Information */}
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3">Student Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>{" "}
                  <Link
                    href={`/app/students/${student.id}`}
                    className="font-medium text-[var(--groups1-primary)] hover:underline"
                  >
                    {student.name}
                  </Link>
                </div>
                {student.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{student.email}</span>
                  </div>
                )}
                {primaryPhone && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Phone:</span>{" "}
                    <a
                      href={`tel:${primaryPhone.phone}`}
                      className="font-medium text-[var(--groups1-primary)] hover:underline"
                    >
                      {primaryPhone.phone}
                    </a>
                  </div>
                )}
                {followup.group && (
                  <div>
                    <span className="text-gray-500">Group:</span>{" "}
                    <Link
                      href={`/app/groups/${followup.group.id}`}
                      className="font-medium text-[var(--groups1-primary)] hover:underline"
                    >
                      {followup.group.name}
                    </Link>
                  </div>
                )}
                {callList && (
                  <div>
                    <span className="text-gray-500">Call List:</span>{" "}
                    <Link
                      href={`/app/call-lists/${callList.id}`}
                      className="font-medium text-[var(--groups1-primary)] hover:underline"
                    >
                      {callList.name}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Previous Follow-up Note */}
            {followup.notes && (
              <div className="p-4 border-2 border-[var(--groups1-primary)] rounded-lg bg-[var(--groups1-secondary)]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[var(--groups1-primary)]" />
                  <h3 className="text-sm font-semibold text-[var(--groups1-primary)]">
                    Follow-up Note (from previous follow-up)
                  </h3>
                </div>
                <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap">
                  {followup.notes}
                </p>
              </div>
            )}

            {/* Previous Call Log - Toggle */}
            {previousCallLog && (
              <div className="border border-[var(--groups1-border)] rounded-lg">
                <div className="flex items-center justify-between p-4">
                  <h3 className="text-sm font-semibold text-[var(--groups1-text)] flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Previous Call Information
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreviousCall(!showPreviousCall)}
                    className="h-7 px-2 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                    disabled={submitting}
                  >
                    {showPreviousCall ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
                {showPreviousCall && (
                  <div className="px-4 pb-4">
                    <PreviousCallLogDisplay previousCallLog={previousCallLog} questions={questions} />
                  </div>
                )}
              </div>
            )}

            {/* Messages to Convey */}
            {messages.length > 0 && (
              <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Messages to Convey
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-[var(--groups1-text)]">
                  {messages.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions Form */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Questions</h3>
                <QuestionAnswerForm
                  questions={questions}
                  previousAnswers={previousAnswers}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                  errors={errors}
                  disabled={submitting}
                />
              </div>
            )}

            {/* Call Details Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Call Details
              </h3>

              {/* Call Status and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-[var(--groups1-text)] mb-2 block">
                    Call Status <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CallLogStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                    disabled={submitting}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-[var(--groups1-text)] mb-2 block">
                    Call Duration (seconds)
                  </Label>
                  <Input
                    type="number"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    placeholder="Optional"
                    min="0"
                    className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Notes with Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-[var(--groups1-text)]">
                    Notes
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotes(!showNotes)}
                    className="h-7 px-2 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                    disabled={submitting}
                  >
                    {showNotes ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
                {showNotes && (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What the student is saying - additional information besides answering questions..."
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
                    disabled={submitting}
                  />
                )}
              </div>

              {/* Caller Note with Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-[var(--groups1-text)]">
                    Caller Notes
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCallerNote(!showCallerNote)}
                    className="h-7 px-2 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                    disabled={submitting}
                  >
                    {showCallerNote ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
                {showCallerNote && (
                  <textarea
                    value={callerNote}
                    onChange={(e) => setCallerNote(e.target.value)}
                    placeholder="Add your remarks or observations about this call..."
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
                    disabled={submitting}
                  />
                )}
              </div>

              {/* Follow-up */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpRequired}
                    onChange={(e) => {
                      setFollowUpRequired(e.target.checked);
                      if (!e.target.checked) {
                        setFollowUpDate("");
                        setFollowUpNote("");
                        if (errors.followUpDate) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.followUpDate;
                            return newErrors;
                          });
                        }
                      }
                    }}
                    disabled={submitting}
                    className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-focus-ring)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-medium text-[var(--groups1-text)]">Requires follow-up</span>
                </label>

                {followUpRequired && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-[var(--groups1-text)] mb-2 block flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Follow-up Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => {
                          setFollowUpDate(e.target.value);
                          if (errors.followUpDate) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.followUpDate;
                              return newErrors;
                            });
                          }
                        }}
                        className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                        disabled={submitting}
                      />
                      {errors.followUpDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.followUpDate}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[var(--groups1-text)] mb-2 block">
                        Follow-up Note
                      </Label>
                      <textarea
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        placeholder="Add a note for this follow-up..."
                        className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--groups1-border)]">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Complete Follow-up Call
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

