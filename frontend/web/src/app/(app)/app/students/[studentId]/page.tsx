"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, PhoneCall, ClipboardList, NotebookPen, ListChecks } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { StudentDetail } from "@/types/students.types";
import { StatusBadge } from "@/components/ui/status-badge";
import { CallLogDetailsModal } from "@/components/call-lists/CallLogDetailsModal";
import { useStudentCallLogs, useCallLog } from "@/hooks/useCallLogs";
import { formatCallDuration, getStatusLabel, getStatusColor } from "@/lib/call-list-utils";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Eye } from "lucide-react";
import type { CallLogStatus } from "@/types/call-lists.types";

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.studentId as string | undefined;
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePageTitle(student ? `${student.name} - Student Profile` : "Student Profile");

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const detail = await apiClient.getStudent(studentId);
        if (active) {
          setStudent(detail);
          setError(null);
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : "Failed to load student profile";
          setError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [studentId]);

  const primaryPhone = useMemo(() => {
    if (!student?.phones?.length) return undefined;
    return student.phones.find((phone) => phone.isPrimary) ?? student.phones[0];
  }, [student]);

  const formattedCreatedAt = student ? new Date(student.createdAt).toLocaleDateString() : "-";
  const statusChips = student?.statuses ?? [];
  const enrollments = student?.enrollments ?? [];
  const totalCalls = student?._count?.calls ?? 0;
  const totalFollowups = student?._count?.followups ?? 0;
  const [activeTab, setActiveTab] = useState<"overview" | "callHistory" | "notes" | "tasks">("overview");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { data: callLogsData, isLoading: callLogsLoading } = useStudentCallLogs(
    studentId || undefined,
    { size: 50 }
  );
  const { data: selectedLog } = useCallLog(selectedLogId);

  const callLogs = callLogsData?.logs || [];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "callHistory", label: "Call History" },
    { key: "notes", label: "Notes" },
    { key: "tasks", label: "Tasks" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 inline-flex items-center gap-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">
            {student?.name ?? "Student Profile"}
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            View student details, enrollments, and contact history
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]">
            <PhoneCall className="h-4 w-4" />
            Log Call
          </Button>
          <Button className="gap-2 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]">
            <ClipboardList className="h-4 w-4" />
            Add Follow-up
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[var(--groups1-border)] pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                : "bg-transparent text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card variant="groups1">
          <CardContent className="py-12 text-center text-[var(--groups1-text-secondary)]">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
            Loading student profile...
          </CardContent>
        </Card>
      ) : error ? (
        <Card variant="groups1">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              className="mt-4"
              onClick={() => {
                setIsLoading(true);
                setError(null);
                setStudent(null);
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !student ? (
        <Card variant="groups1">
          <CardContent className="py-12 text-center text-[var(--groups1-text-secondary)]">
            Student not found.
          </CardContent>
        </Card>
      ) : (
        <>
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card variant="groups1" className="p-4">
                  <p className="text-xs font-medium uppercase text-[var(--groups1-text-secondary)]">Enrollments</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--groups1-text)]">{enrollments.length}</p>
                  <p className="text-xs text-[var(--groups1-text-secondary)]">Active placements</p>
                </Card>
                <Card variant="groups1" className="p-4">
                  <p className="text-xs font-medium uppercase text-[var(--groups1-text-secondary)]">Calls Logged</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--groups1-text)]">{totalCalls}</p>
                  <p className="text-xs text-[var(--groups1-text-secondary)]">
                    {totalCalls ? "Recent engagements" : "No calls yet"}
                  </p>
                </Card>
                <Card variant="groups1" className="p-4">
                  <p className="text-xs font-medium uppercase text-[var(--groups1-text-secondary)]">Follow-ups</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--groups1-text)]">{totalFollowups}</p>
                  <p className="text-xs text-[var(--groups1-text-secondary)]">
                    {totalFollowups ? "Tracked reminders" : "No follow-ups yet"}
                  </p>
                </Card>
                <Card variant="groups1" className="p-4">
                  <p className="text-xs font-medium uppercase text-[var(--groups1-text-secondary)]">Created</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--groups1-text)]">{formattedCreatedAt}</p>
                  <p className="text-xs text-[var(--groups1-text-secondary)]">Profile creation date</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card variant="groups1" className="lg:col-span-2">
                  <CardHeader variant="groups1">
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Name</p>
                        <p className="text-sm text-[var(--groups1-text)]">{student.name}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Email</p>
                        <p className="text-sm text-[var(--groups1-text)]">{student.email ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Discord ID</p>
                        <p className="text-sm text-[var(--groups1-text)]">{student.discordId ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Primary Phone</p>
                        <p className="text-sm text-[var(--groups1-text)]">{primaryPhone?.phone ?? "-"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Tags</p>
                      {student.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {student.tags.map((tag, idx) => (
                            <span
                              key={`${tag}-${idx}`}
                              className="rounded-full bg-[var(--groups1-secondary)] px-2 py-0.5 text-xs text-[var(--groups1-text)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--groups1-text)]">No tags</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Created</p>
                      <p className="text-sm text-[var(--groups1-text)]">{formattedCreatedAt}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Group Statuses</p>
                      {statusChips.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {statusChips.map((status) => (
                            <StatusBadge key={status.id} variant="info" size="sm">
                              {status.group?.name ?? "Group"} • {status.status}
                            </StatusBadge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--groups1-text)]">No statuses recorded</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="groups1">
                  <CardHeader variant="groups1">
                    <CardTitle>Phone Numbers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6">
                    {student.phones.length > 0 ? (
                      student.phones.map((phone) => (
                        <div
                          key={phone.id}
                          className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3 text-sm"
                        >
                          <p className="text-[var(--groups1-text)]">{phone.phone}</p>
                          {phone.isPrimary && (
                            <StatusBadge variant="info" size="sm" className="mt-2">
                              Primary
                            </StatusBadge>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--groups1-text-secondary)]">No phone numbers</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card variant="groups1">
                <CardHeader variant="groups1">
                  <CardTitle>Enrollments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-6">
                  {enrollments.length ? (
                    enrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex flex-col gap-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[var(--groups1-text)]">
                            {enrollment.group?.name ?? "Unknown group"}
                          </p>
                          <p className="text-xs text-[var(--groups1-text-secondary)]">
                            Course: {enrollment.course?.name ?? "—"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 text-sm text-[var(--groups1-text-secondary)] md:text-right">
                          <div className="flex flex-wrap gap-2 self-start md:self-end">
                            <StatusBadge
                              variant={enrollment.isActive === false ? "warning" : "success"}
                              size="sm"
                            >
                              {enrollment.isActive === false ? "Inactive" : "Active"}
                            </StatusBadge>
                            {enrollment.status && (
                              <StatusBadge variant="info" size="sm">
                                {enrollment.status}
                              </StatusBadge>
                            )}
                          </div>
                          {enrollment.group?.id && (
                            <div className="flex flex-col gap-2 text-xs text-[var(--groups1-text-secondary)]">
                              <Link
                                href={`/app/groups/${enrollment.group.id}/students`}
                                className="text-[var(--groups1-primary)] hover:underline"
                              >
                                View group
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--groups1-text-secondary)]">No enrollments recorded.</p>
                  )}
                </CardContent>
              </Card>

            </>
          )}

          {activeTab === "callHistory" && (
            <Card variant="groups1">
              <CardHeader variant="groups1">
                <CardTitle>Call History</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                {callLogsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
                  </div>
                ) : callLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--groups1-border)] bg-[var(--groups1-muted)] py-10 text-center text-sm text-[var(--groups1-text-secondary)]">
                    <PhoneCall className="h-8 w-8" />
                    <p>No call logs found for this student.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {callLogs.map((log) => {
                      const statusColor = getStatusColor(log.status);
                      const statusVariant = statusColor === "green" ? "success" : statusColor === "red" ? "error" : statusColor === "yellow" ? "warning" : "info";
                      const isOverdue = log.followUpDate && new Date(log.followUpDate) < new Date();
                      const answers = Array.isArray(log.answers) ? log.answers : [];
                      const answersPreview = answers.slice(0, 2);
                      const hasMoreAnswers = answers.length > 2;
                      
                      return (
                        <div
                          key={log.id}
                          className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 text-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge variant={statusVariant} size="sm">
                                  {getStatusLabel(log.status)}
                                </StatusBadge>
                                {log.followUpRequired && (
                                  <StatusBadge variant="warning" size="sm">
                                    Follow-up
                                    {log.followUpDate && isOverdue && (
                                      <span className="ml-1 text-red-500">(Overdue)</span>
                                    )}
                                  </StatusBadge>
                                )}
                                {log.callList?.group && (
                                  <Link
                                    href={`/app/groups/${log.callList.group.id}/students`}
                                    className="text-xs text-[var(--groups1-primary)] hover:underline"
                                  >
                                    {log.callList.group.name}
                                  </Link>
                                )}
                                {log.callList?.group?.batch && (
                                  <Link
                                    href={`/app/batches/${log.callList.group.batch.id}`}
                                    className="text-xs text-[var(--groups1-primary)] hover:underline"
                                  >
                                    {log.callList.group.batch.name}
                                  </Link>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-[var(--groups1-text-secondary)]">
                                <span>{new Date(log.callDate).toLocaleString()}</span>
                                <span>Duration: {formatCallDuration(log.callDuration)}</span>
                                {log.assignee && (
                                  <span>Caller: {log.assignee.user.name}</span>
                                )}
                              </div>

                              {log.callList && (
                                <div className="text-xs text-[var(--groups1-text-secondary)]">
                                  <Link
                                    href={`/app/call-lists/${log.callList.id}`}
                                    className="text-[var(--groups1-primary)] hover:underline"
                                  >
                                    {log.callList.name}
                                  </Link>
                                </div>
                              )}

                              {log.followUpDate && (
                                <div className="text-xs text-[var(--groups1-text-secondary)]">
                                  Follow-up scheduled: {new Date(log.followUpDate).toLocaleDateString()}
                                  {isOverdue && (
                                    <span className="ml-1 text-red-500 font-medium">(Overdue)</span>
                                  )}
                                </div>
                              )}

                              {answersPreview.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-medium text-[var(--groups1-text-secondary)]">Answers:</p>
                                  {answersPreview.map((answer: any, idx: number) => (
                                    <div key={idx} className="text-xs text-[var(--groups1-text)]">
                                      <span className="font-medium">{answer.question || 'Q'}:</span>{" "}
                                      <span>{String(answer.answer)}</span>
                                    </div>
                                  ))}
                                  {hasMoreAnswers && (
                                    <p className="text-xs text-[var(--groups1-primary)]">+{answers.length - 2} more answers</p>
                                  )}
                                </div>
                              )}

                              {log.notes && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">Notes:</p>
                                  <p className="text-sm text-[var(--groups1-text)] line-clamp-2">
                                    {log.notes}
                                  </p>
                                </div>
                              )}

                              {log.callerNote && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">Caller Note:</p>
                                  <p className="text-sm text-[var(--groups1-text)] line-clamp-2">
                                    {log.callerNote}
                                  </p>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLogId(log.id);
                                setIsDetailsModalOpen(true);
                              }}
                              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] shrink-0"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "notes" && (
            <Card variant="groups1">
              <CardHeader variant="groups1">
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-4">
                  <textarea
                    value={student?.notes || ""}
                    onChange={(e) => {
                      if (student) {
                        setStudent({ ...student, notes: e.target.value });
                      }
                    }}
                    placeholder="Add notes about this student..."
                    className="w-full min-h-[200px] rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (student) {
                          setStudent({ ...student, notes: student.notes || "" });
                        }
                      }}
                      className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!studentId || !student) return;
                        try {
                          await apiClient.updateStudentNotes(studentId, student.notes || "");
                          // Optionally show success message
                        } catch (err) {
                          console.error("Failed to save notes:", err);
                          // Optionally show error message
                        }
                      }}
                      className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "tasks" && (
            <Card variant="groups1">
              <CardHeader variant="groups1">
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--groups1-border)] bg-[var(--groups1-muted)] py-10 text-center text-sm text-[var(--groups1-text-secondary)]">
                <ListChecks className="h-8 w-8" />
                <p>No tasks scheduled. Stay on track by adding a follow-up checklist.</p>
                <Button>Add Task</Button>
              </CardContent>
            </Card>
          )}

        </>
      )}

      {/* Call Log Details Modal */}
      <CallLogDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={(open) => {
          setIsDetailsModalOpen(open);
          if (!open) {
            setSelectedLogId(null);
          }
        }}
        callLog={selectedLog ?? null}
      />
    </div>
  );
}

