"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Phone, Calendar, ChevronDown, ChevronUp, X } from "lucide-react";
import { validateCallLog, formatCallDuration } from "@/lib/call-list-utils";
import { cn } from "@/lib/utils";
import { useCallStatusOptions } from "@/hooks/useCallLists";
import type { CallListItem, Question, Answer, CallLogStatus, CreateCallLogRequest, CustomColumnDef } from "@/types/call-lists.types";

const FALLBACK_STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "busy", label: "Busy" },
  { value: "no_answer", label: "No Answer" },
  { value: "voicemail", label: "Voicemail" },
  { value: "other", label: "Other" },
];

export interface CallExecutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callListItem: CallListItem | null;
  previousCallLog?: CallListItem['callLog'] | null;
  onSuccess?: () => void;
}

export function CallExecutionModal({
  open,
  onOpenChange,
  callListItem,
  previousCallLog,
  onSuccess,
}: CallExecutionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const [callerNote, setCallerNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showCallerNote, setShowCallerNote] = useState(false);
  const [status, setStatus] = useState<CallLogStatus>("completed");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [callDuration, setCallDuration] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: statusOptions } = useCallStatusOptions();
  const statusList = statusOptions && statusOptions.length > 0 ? statusOptions : FALLBACK_STATUSES;

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const student = callListItem?.student;
  const callList = callListItem?.callList;
  const questions = callList?.questions || [];
  const columns = (callList?.columns ?? []) as CustomColumnDef[];
  const messages = callList?.messages || [];

  // Load draft on modal open: prefer newer of localStorage vs server
  useEffect(() => {
    if (!open || !callListItem) return;

    const itemId = callListItem.id;
    const draftKey = `call-draft-${itemId}`;

    const applyDraft = (draft: any) => {
      setAnswers(draft.answers || {});
      setNotes(draft.notes || "");
      setCallerNote(draft.callerNote || "");
      setShowNotes(!!draft.notes);
      setShowCallerNote(!!draft.callerNote);
      setStatus(draft.status || "completed");
      setFollowUpRequired(draft.followUpRequired || false);
      setFollowUpDate(draft.followUpDate || "");
      setFollowUpNote(draft.followUpNote || "");
      setCallDuration(draft.callDuration || "");
      setErrors({});
    };

    const initDefault = () => {
      setAnswers({});
      setCustomFieldValues({});
      setNotes("");
      setCallerNote("");
      setShowNotes(false);
      setShowCallerNote(false);
      setStatus("completed");
      setFollowUpRequired(false);
      if (previousCallLog?.followUpDate) {
        const date = new Date(previousCallLog.followUpDate);
        setFollowUpDate(date.toISOString().split("T")[0]);
      } else {
        setFollowUpDate("");
      }
      setFollowUpNote("");
      setCallDuration("");
      setErrors({});
    };

    let cancelled = false;

    const localRaw =
      typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
    let localDraft: any = null;
    if (localRaw) {
      try {
        localDraft = JSON.parse(localRaw);
      } catch (e) {
        console.error("Failed to parse local draft:", e);
      }
    }

    // Apply local immediately so UI doesn't flash
    if (localDraft) {
      applyDraft(localDraft);
    } else {
      initDefault();
    }

    // Then fetch server draft and reconcile
    apiClient
      .getCallDraft(itemId)
      .then((server) => {
        if (cancelled || !server || !server.payload) return;
        const localTime = localDraft?.savedAt ? Date.parse(localDraft.savedAt) : 0;
        const serverTime = server.updatedAt ? Date.parse(server.updatedAt) : 0;
        if (serverTime > localTime) {
          applyDraft(server.payload);
          // Sync server → local
          if (typeof window !== "undefined") {
            localStorage.setItem(
              draftKey,
              JSON.stringify({ ...server.payload, savedAt: server.updatedAt })
            );
          }
        }
      })
      .catch(() => {
        // Network failure: keep local draft, no toast
      });

    return () => {
      cancelled = true;
    };
  }, [open, callListItem, previousCallLog]);

  // Auto-save draft to localStorage (debounced 800ms)
  useEffect(() => {
    if (!callListItem) return;

    const draftKey = `call-draft-${callListItem.id}`;
    const draft = {
      answers,
      notes,
      callerNote,
      status,
      followUpRequired,
      followUpDate,
      followUpNote,
      callDuration,
      savedAt: new Date().toISOString(),
    };

    // Clear existing timeout
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    setIsSavingDraft(true);
    draftSaveTimeoutRef.current = setTimeout(() => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch (e) {
          console.error("Failed to save draft:", e);
        }
      }
      // Background sync to server (fire-and-forget)
      apiClient
        .upsertCallDraft(callListItem.id, draft)
        .catch((e) => {
          console.warn("Server draft sync failed:", e?.message || e);
        })
        .finally(() => {
          setIsSavingDraft(false);
        });
    }, 800);

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [callListItem, answers, notes, callerNote, status, followUpRequired, followUpDate, followUpNote, callDuration]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Clear error for this question
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate all required questions are answered
    for (const question of questions) {
      if (question.required) {
        const answer = answers[question.id];
        if (answer === undefined || answer === null || answer === "") {
          newErrors[question.id] = `"${question.question}" is required`;
        }
      }

      // Validate answer type matches question type
      const answer = answers[question.id];
      if (answer !== undefined && answer !== null && answer !== "") {
        if (question.type === "yes_no" && typeof answer !== "boolean") {
          newErrors[question.id] = `"${question.question}" must be Yes or No`;
        } else if (question.type === "multiple_choice" && typeof answer !== "string") {
          newErrors[question.id] = `"${question.question}" must be a valid option`;
        } else if (question.type === "number" && typeof answer !== "number" && !/^\d+(\.\d+)?$/.test(String(answer))) {
          newErrors[question.id] = `"${question.question}" must be a number`;
        } else if (question.type === "date" && typeof answer !== "string") {
          newErrors[question.id] = `"${question.question}" must be a valid date`;
        } else if (question.type === "multiple_choice" && !question.options?.includes(answer)) {
          newErrors[question.id] = `"${question.question}" must be one of the provided options`;
        }
      }
    }

    // Validate follow-up date if required
    if (followUpRequired && !followUpDate) {
      newErrors.followUpDate = "Follow-up date is required when follow-up is enabled";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors before submitting");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!callListItem) return;

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Prepare answers array
      const answersArray: Answer[] = questions
        .filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "")
        .map((q) => {
          let answerValue: string | number | boolean = answers[q.id];
          
          // Convert answer based on question type
          if (q.type === "number" && typeof answerValue === "string") {
            answerValue = parseFloat(answerValue);
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

      const payload: CreateCallLogRequest = {
        callListItemId: callListItem.id,
        status,
        answers: answersArray,
        notes: notes.trim() || undefined,
        callerNote: callerNote.trim() || undefined,
        followUpDate: followUpRequired && followUpDate ? new Date(followUpDate).toISOString() : undefined,
        followUpRequired: followUpRequired || undefined,
        followUpNote: followUpRequired && followUpNote.trim() ? followUpNote.trim() : undefined,
        callDuration: callDuration ? parseInt(callDuration, 10) : undefined,
      };

      await apiClient.createCallLog(payload);

      // Save custom field values if any were filled
      const nonEmptyCustomFields = Object.fromEntries(
        Object.entries(customFieldValues).filter(([, v]) => v !== "" && v != null)
      );
      if (Object.keys(nonEmptyCustomFields).length > 0 && callListItem.callListId) {
        await apiClient.updateCallListItemCustom(callListItem.callListId, callListItem.id, nonEmptyCustomFields).catch(() => {});
      }

      // Clear draft on success (local + server)
      if (callListItem && typeof window !== "undefined") {
        localStorage.removeItem(`call-draft-${callListItem.id}`);
      }
      if (callListItem) {
        apiClient.deleteCallDraft(callListItem.id).catch(() => {});
      }
      toast.success("Call log created successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Call log creation error:", error);
      const errorMessage = error?.message || error?.error?.message || "Failed to create call log";
      
      if (error?.status === 400) {
        toast.error(errorMessage);
      } else if (error?.status === 403) {
        toast.error("Access denied. This item may not be assigned to you.");
      } else if (error?.status === 404) {
        toast.error("Call list item not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const primaryPhone = student?.phones?.find((p) => p.isPrimary) || student?.phones?.[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!submitting) onOpenChange(newOpen);
      }}
      mobileSheet
    >
      <DialogContent className={cn(
        "w-full max-w-full md:max-w-4xl",
        "rounded-t-2xl rounded-b-none md:rounded-lg",
        "h-[92dvh] md:max-h-[90vh] md:h-auto",
        "flex flex-col p-0 md:p-6 mx-0 md:mx-4",
        "overflow-hidden"
      )}>
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--groups1-border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-0 pb-3 border-b border-[var(--groups1-border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
            <h2 className="text-base md:text-xl font-semibold text-[var(--groups1-text)]">
              {student?.name || "Call Execution"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isSavingDraft && (
              <span className="text-xs text-[var(--groups1-text-secondary)] flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
              onClick={() => !submitting && onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0 py-4 space-y-6 min-h-0">
          {!callListItem || !student || !callList ? (
            <div className="py-8 text-center text-gray-500">No call item selected</div>
          ) : (
            <>
              {/* Student Information + Tap-to-Call */}
              <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3">Student Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-[var(--groups1-text-secondary)]">Name:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{student.name}</span>
                  </div>
                  {student.email && (
                    <div>
                      <span className="text-[var(--groups1-text-secondary)]">Email:</span>{" "}
                      <span className="font-medium text-[var(--groups1-text)]">{student.email}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-[var(--groups1-text-secondary)]">Call List:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{callList.name}</span>
                  </div>
                </div>

                {/* Prominent tap-to-call */}
                {primaryPhone && (
                  <a
                    href={`tel:${primaryPhone.phone}`}
                    className={cn(
                      "flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold text-base",
                      "bg-green-500 hover:bg-green-600 text-white transition-colors",
                      "active:scale-[0.98]"
                    )}
                  >
                    <Phone className="w-5 h-5" />
                    {primaryPhone.phone}
                  </a>
                )}
              </div>

              {/* Previous Call Reference */}
              {previousCallLog && (
                <div className="p-4 border-2 border-teal-200 rounded-lg bg-teal-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-teal-900">Previous Call Reference</h3>
                    <span className="text-xs text-teal-700 bg-teal-100 px-2 py-1 rounded">Read-Only</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-teal-700 font-medium">Previous Call Date:</span>{" "}
                        <span className="text-teal-900">{new Date(previousCallLog.callDate).toLocaleString()}</span>
                      </div>
                      {previousCallLog.followUpDate && (
                        <div>
                          <span className="text-teal-700 font-medium">Scheduled Follow-up:</span>{" "}
                          <span className={cn(
                            "font-medium",
                            new Date(previousCallLog.followUpDate) < new Date() ? "text-orange-600" : "text-teal-900"
                          )}>
                            {new Date(previousCallLog.followUpDate).toLocaleDateString()}
                            {new Date(previousCallLog.followUpDate) < new Date() && (
                              <span className="ml-1 text-orange-600">(Overdue)</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    {previousCallLog.notes && previousCallLog.notes.includes("--- Follow-up Note ---") && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className="font-semibold text-orange-900 mb-1">Follow-up Note:</div>
                        <div className="text-orange-800 whitespace-pre-wrap">
                          {previousCallLog.notes.split("--- Follow-up Note ---")[1]?.trim() || previousCallLog.notes}
                        </div>
                      </div>
                    )}
                    {previousCallLog.answers && previousCallLog.answers.length > 0 && (
                      <div>
                        <div className="font-semibold text-teal-900 mb-2">Previous Answers:</div>
                        <div className="space-y-2 pl-4 border-l-2 border-teal-300">
                          {previousCallLog.answers.map((answer, idx) => (
                            <div key={idx} className="text-teal-800">
                              <div className="font-medium text-teal-900">{answer.question}</div>
                              <div className="text-teal-700">
                                {typeof answer.answer === "boolean" ? (answer.answer ? "Yes" : "No") : String(answer.answer)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {previousCallLog.notes && !previousCallLog.notes.includes("--- Follow-up Note ---") && (
                      <div>
                        <div className="font-semibold text-teal-900 mb-1">Previous Notes:</div>
                        <div className="text-teal-800 whitespace-pre-wrap pl-4 border-l-2 border-teal-300">
                          {previousCallLog.notes}
                        </div>
                      </div>
                    )}
                    {previousCallLog.callerNote && (
                      <div>
                        <div className="font-semibold text-teal-900 mb-1">Previous Caller Note:</div>
                        <div className="text-teal-800 whitespace-pre-wrap pl-4 border-l-2 border-teal-300">
                          {previousCallLog.callerNote}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Messages to Convey */}
              {messages.length > 0 && (
                <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                  <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-2">Messages to Convey</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-[var(--groups1-text)]">
                    {messages.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions */}
              {questions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Questions to Ask</h3>
                  {questions.sort((a, b) => a.order - b.order).map((question) => (
                    <div key={question.id} className="space-y-2">
                      <Label className="text-sm font-medium text-[var(--groups1-text)]">
                        {question.question}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {question.type === "text" && (
                        <Input
                          value={answers[question.id] || ""}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          placeholder="Enter your answer..."
                          className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                          disabled={submitting}
                        />
                      )}
                      {question.type === "yes_no" && (
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              checked={answers[question.id] === true}
                              onChange={() => handleAnswerChange(question.id, true)}
                              disabled={submitting}
                              className="rounded border-[var(--groups1-border)]"
                            />
                            <span className="text-sm text-[var(--groups1-text)]">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              checked={answers[question.id] === false}
                              onChange={() => handleAnswerChange(question.id, false)}
                              disabled={submitting}
                              className="rounded border-[var(--groups1-border)]"
                            />
                            <span className="text-sm text-[var(--groups1-text)]">No</span>
                          </label>
                        </div>
                      )}
                      {question.type === "multiple_choice" && (
                        <select
                          value={answers[question.id] || ""}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                          disabled={submitting}
                        >
                          <option value="">Select an option...</option>
                          {question.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      )}
                      {question.type === "number" && (
                        <Input
                          type="number"
                          value={answers[question.id] || ""}
                          onChange={(e) => handleAnswerChange(question.id, parseFloat(e.target.value) || "")}
                          placeholder="Enter a number..."
                          className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                          disabled={submitting}
                        />
                      )}
                      {question.type === "date" && (
                        <Input
                          type="date"
                          value={answers[question.id] || ""}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                          disabled={submitting}
                        />
                      )}
                      {errors[question.id] && (
                        <p className="text-sm text-red-500">{errors[question.id]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Fields */}
              {columns.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Custom Fields</h3>
                  {columns.map((col) => (
                    <div key={col.key} className="space-y-2">
                      <Label className="text-sm font-medium text-[var(--groups1-text)]">{col.label}</Label>
                      {col.type === "text" && (
                        <Input
                          value={customFieldValues[col.key] || ""}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          placeholder={`Enter ${col.label.toLowerCase()}...`}
                          className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                          disabled={submitting}
                        />
                      )}
                      {col.type === "number" && (
                        <Input
                          type="number"
                          value={customFieldValues[col.key] || ""}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          placeholder="0"
                          className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                          disabled={submitting}
                        />
                      )}
                      {col.type === "date" && (
                        <Input
                          type="date"
                          value={customFieldValues[col.key] || ""}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                          disabled={submitting}
                        />
                      )}
                      {col.type === "select" && (
                        <select
                          value={customFieldValues[col.key] || ""}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                          disabled={submitting}
                        >
                          <option value="">Select...</option>
                          {col.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Additional Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-[var(--groups1-text)]">Additional Notes (Optional)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotes(!showNotes)}
                    className="h-7 px-2 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                    disabled={submitting}
                  >
                    {showNotes ? <><ChevronUp className="w-3 h-3 mr-1" />Hide</> : <><ChevronDown className="w-3 h-3 mr-1" />Show</>}
                  </Button>
                </div>
                {showNotes && (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What the student is saying — additional information besides answering questions..."
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
                    disabled={submitting}
                  />
                )}
              </div>

              {/* Caller Note */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-[var(--groups1-text)]">Caller Note (Optional)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCallerNote(!showCallerNote)}
                    className="h-7 px-2 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                    disabled={submitting}
                  >
                    {showCallerNote ? <><ChevronUp className="w-3 h-3 mr-1" />Hide</> : <><ChevronDown className="w-3 h-3 mr-1" />Show</>}
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
                    {statusList.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
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
                        if (errors.followUpDate) {
                          setErrors((prev) => { const n = { ...prev }; delete n.followUpDate; return n; });
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
                            setErrors((prev) => { const n = { ...prev }; delete n.followUpDate; return n; });
                          }
                        }}
                        min={new Date().toISOString().split("T")[0]}
                        className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                        disabled={submitting}
                      />
                      {errors.followUpDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.followUpDate}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[var(--groups1-text)] mb-2 block">Follow-up Note</Label>
                      <textarea
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        placeholder="Add a note for the follow-up call..."
                        className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
                        disabled={submitting}
                      />
                      <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                        This note will be visible when making the follow-up call
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sticky action bar */}
        <div className="flex-shrink-0 flex justify-end gap-3 px-4 md:px-0 py-4 border-t border-[var(--groups1-border)] bg-[var(--groups1-surface)]">
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
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              "Submit Call"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

