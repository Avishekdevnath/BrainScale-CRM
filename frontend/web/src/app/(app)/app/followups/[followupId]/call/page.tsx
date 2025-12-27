"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFollowupCallContext } from "@/hooks/useFollowupCallContext";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Loader2, ArrowLeft, Phone, User, Calendar, Clock } from "lucide-react";
import { PreviousCallLogDisplay } from "@/components/followups/PreviousCallLogDisplay";
import { QuestionAnswerForm } from "@/components/followups/QuestionAnswerForm";
import type { Answer, CallLogStatus } from "@/types/call-lists.types";
import Link from "next/link";

const STATUS_OPTIONS: Array<{ value: CallLogStatus; label: string }> = [
  { value: "completed", label: "Complete" },
  { value: "missed", label: "Missed" },
  { value: "busy", label: "Number Busy" },
  { value: "no_answer", label: "Number Off" },
  { value: "voicemail", label: "Voicemail" },
  { value: "other", label: "Abroad Number" },
];

export default function FollowupCallPage() {
  const params = useParams();
  const router = useRouter();
  const followupId = params?.followupId as string;

  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const [callerNote, setCallerNote] = useState("");
  const [status, setStatus] = useState<CallLogStatus>("completed");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [callDuration, setCallDuration] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: context, isLoading, error } = useFollowupCallContext(followupId);

  usePageTitle(context ? `Follow-up Call - ${context.followup.student.name}` : "Follow-up Call");

  const followup = context?.followup;
  const callList = context?.callList;
  const previousCallLog = context?.previousCallLog;
  // Get questions from callList, or use empty array if callList is null
  const questions = callList?.questions || [];
  // Get messages from callList, or use empty array if callList is null
  const messages = callList?.messages || [];
  const previousAnswers = previousCallLog?.answers || [];
  
  // Debug: Log questions to help diagnose
  useEffect(() => {
    if (context) {
      console.log('[FollowupCallPage] Context loaded:', {
        hasCallList: !!callList,
        callListId: callList?.id,
        callListName: callList?.name,
        questionsCount: questions.length,
        questions: questions,
      });
    }
  }, [context, callList, questions]);

  // Reset form when context loads
  useEffect(() => {
    if (context) {
      setAnswers({});
      setNotes("");
      setCallerNote("");
      setStatus("completed");
      setFollowUpRequired(false);
      setFollowUpDate("");
      setFollowUpNote("");
      setCallDuration("");
      setErrors({});
    }
  }, [context]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Clear error for this question
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required questions
    questions.forEach((question) => {
      if (question.required) {
        const answer = answers[question.id];
        if (answer === undefined || answer === null || answer === "") {
          newErrors[question.id] = `"${question.question}" is required`;
        }
      }
    });

    // Validate call duration if provided
    if (callDuration) {
      const duration = parseInt(callDuration, 10);
      if (isNaN(duration) || duration < 0) {
        newErrors.callDuration = "Call duration must be a positive number";
      }
    }

    // Validate follow-up date if required
    if (followUpRequired && !followUpDate) {
      newErrors.followUpDate = "Follow-up date is required when follow-up is needed";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors before submitting");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!context || !validateForm()) return;

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
      if (answersArray.length === 0) {
        toast.error("Please provide at least one answer");
        setSubmitting(false);
        return;
      }

      await apiClient.createFollowupCallLog({
        followupId: context.followup.id,
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
      router.push("/app/followups");
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

  const primaryPhone = context?.followup?.student.phones?.find((p) => p.isPrimary) || context?.followup?.student.phones?.[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  if (error || !context || !context.followup) {
    let errorMessage = "Failed to load follow-up call context";
    
    if (error) {
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 403) {
          errorMessage = "Access denied to this follow-up";
        } else if (status === 404) {
          errorMessage = "Follow-up not found";
        } else if (status === 500) {
          errorMessage = "An unexpected error occurred. Please try again or contact support.";
        }
      }
    }

    return (
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/app/followups")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Follow-ups
          </Button>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Follow-up Call</h1>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {errorMessage}
            </p>
            <Button
              onClick={() => router.push("/app/followups")}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              Back to Follow-ups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/app/followups")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Follow-ups
        </Button>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Follow-up Call</h1>
      </div>

      {/* Student Information */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>{" "}
              <Link
                href={`/app/students/${context.followup.student.id}`}
                className="font-medium text-[var(--groups1-primary)] hover:underline"
              >
                {context.followup.student.name}
              </Link>
            </div>
            {context.followup.student.email && (
              <div>
                <span className="text-gray-500">Email:</span>{" "}
                <span className="font-medium text-[var(--groups1-text)]">{context.followup.student.email}</span>
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
            {context.followup.group && (
              <div>
                <span className="text-gray-500">Group:</span>{" "}
                <Link
                  href={`/app/groups/${context.followup.group.id}`}
                  className="font-medium text-[var(--groups1-primary)] hover:underline"
                >
                  {context.followup.group.name}
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
        </CardContent>
      </Card>

      {/* Previous Follow-up Note */}
      <Card variant="groups1" className={context.followup.notes ? "border-[var(--groups1-primary)] border-2" : ""}>
        <CardHeader variant="groups1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className={`w-4 h-4 ${context.followup.notes ? "text-[var(--groups1-primary)]" : "text-[var(--groups1-text-secondary)]"}`} />
            <span className={context.followup.notes ? "text-[var(--groups1-primary)] font-semibold" : "text-[var(--groups1-text-secondary)]"}>
              Follow-up Note
            </span>
            {context.followup.notes && (
              <span className="text-xs text-[var(--groups1-text-secondary)] font-normal">
                (from previous follow-up)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {context.followup.notes ? (
            <div className="bg-[var(--groups1-secondary)] p-3 rounded-lg border border-[var(--groups1-primary)] border-opacity-20">
              <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap font-medium">
                {context.followup.notes}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--groups1-text-secondary)] italic">
              No follow-up note from previous follow-up
            </p>
          )}
        </CardContent>
      </Card>

      {/* Previous Call Log */}
      {previousCallLog && (
        <PreviousCallLogDisplay
          previousCallLog={previousCallLog}
          questions={questions}
        />
      )}

      {/* Messages to Convey */}
      {messages.length > 0 && (
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4" />
              Messages to Convey
            </CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            <ul className="list-disc list-inside space-y-1 text-sm text-[var(--groups1-text)]">
              {messages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Questions Form */}
      {questions.length > 0 && (
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            <QuestionAnswerForm
              questions={questions}
              previousAnswers={previousAnswers}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              errors={errors}
              disabled={submitting}
            />
          </CardContent>
        </Card>
      )}

      {/* Call Details Form */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call Details
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div>
            <Label htmlFor="status" className="text-sm font-medium text-[var(--groups1-text)]">
              Status *
            </Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as CallLogStatus)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
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
            <Label htmlFor="callDuration" className="text-sm font-medium text-[var(--groups1-text)]">
              Call Duration (seconds)
            </Label>
            <Input
              id="callDuration"
              type="number"
              min="0"
              value={callDuration}
              onChange={(e) => {
                setCallDuration(e.target.value);
                if (errors.callDuration) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.callDuration;
                    return next;
                  });
                }
              }}
              placeholder="Enter duration in seconds..."
              className="mt-1 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
              disabled={submitting}
            />
            {errors.callDuration && (
              <p className="text-sm text-red-500 mt-1">{errors.callDuration}</p>
            )}
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-[var(--groups1-text)]">
              Notes
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about the call..."
              className="mt-1 w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="callerNote" className="text-sm font-medium text-[var(--groups1-text)]">
              Caller Notes
            </Label>
            <textarea
              id="callerNote"
              value={callerNote}
              onChange={(e) => setCallerNote(e.target.value)}
              placeholder="Add your personal notes about the call..."
              className="mt-1 w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
              disabled={submitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Options */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Follow-up Options
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="followUpRequired"
              checked={followUpRequired}
              onChange={(e) => {
                setFollowUpRequired(e.target.checked);
                if (!e.target.checked) {
                  setFollowUpDate("");
                  if (errors.followUpDate) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.followUpDate;
                      return next;
                    });
                  }
                }
              }}
              disabled={submitting}
              className="rounded border-[var(--groups1-border)]"
            />
            <Label htmlFor="followUpRequired" className="text-sm font-medium text-[var(--groups1-text)] cursor-pointer">
              Requires another follow-up
            </Label>
          </div>

          {followUpRequired && (
            <>
              <div>
                <Label htmlFor="followUpDate" className="text-sm font-medium text-[var(--groups1-text)]">
                  Follow-up Date *
                </Label>
                <Input
                  id="followUpDate"
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => {
                    setFollowUpDate(e.target.value);
                    if (errors.followUpDate) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.followUpDate;
                        return next;
                      });
                    }
                  }}
                  className="mt-1 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                  disabled={submitting}
                />
                {errors.followUpDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.followUpDate}</p>
                )}
              </div>
              <div>
                <Label htmlFor="followUpNote" className="text-sm font-medium text-[var(--groups1-text)]">
                  Follow-up Note
                </Label>
                <textarea
                  id="followUpNote"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Add a note for this follow-up..."
                  className="mt-1 w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
                  disabled={submitting}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/app/followups")}
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
  );
}

