"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, PhoneCall, ClipboardList, ListChecks, Eye, Pencil, Plus, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { CallLogDetailsModal } from "@/components/call-lists/CallLogDetailsModal";
import { CreateTaskDialog } from "@/components/tasks/TaskDialogs";
import { useStudentCallLogs, useCallLog } from "@/hooks/useCallLogs";
import { useStudent } from "@/hooks/useStudents";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { formatCallDuration, getStatusLabel, getStatusColor } from "@/lib/call-list-utils";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import type { CallLogStatus } from "@/types/call-lists.types";

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.studentId as string | undefined;
  const { data: student, isLoading, error: swrError, mutate: mutateStudent } = useStudent(studentId);
  const error = swrError ? (swrError instanceof Error ? swrError.message : "Failed to load student profile") : null;
  usePageTitle(student ? `${student.name} - Student Profile` : "Student Profile");

  useEffect(() => {
    if (student) {
      setLocalNotes(student.notes ?? "");
      setOriginalNotes(student.notes ?? "");
    }
  }, [student?.id]);

  const primaryPhone = useMemo(() => {
    if (!student?.phones?.length) return undefined;
    return student.phones.find((phone) => phone.isPrimary) ?? student.phones[0];
  }, [student]);

  const formattedCreatedAt = student ? new Date(student.createdAt).toLocaleDateString() : "-";
  const statusChips = student?.statuses ?? [];
  const enrollments = student?.enrollments ?? [];
  const totalCalls = student?._count?.calls ?? 0;
  const totalFollowups = student?._count?.followups ?? 0;
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    discordId: string;
    tags: string[];
    phones: { id?: string; phone: string; isPrimary: boolean }[];
    newTag: string;
    newPhone: string;
  }>({ name: "", email: "", discordId: "", tags: [], phones: [], newTag: "", newPhone: "" });

  const [activeTab, setActiveTab] = useState<"overview" | "callHistory" | "notes" | "tasks">("overview");
  const [callLogPage, setCallLogPage] = useState(1);
  const CALL_LOG_PAGE_SIZE = 20;
  const [localNotes, setLocalNotes] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCallHistoryModalOpen, setIsCallHistoryModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ groupId: "", dueAt: "", notes: "" });
  const [followUpSaving, setFollowUpSaving] = useState(false);

  const workspaceId = useWorkspaceStore((s) => s.current?.id ?? null);
  const { members = [] } = useWorkspaceMembers(workspaceId);
  const { data: currentMember } = useCurrentMember(workspaceId);

  const { data: callLogsData, isLoading: callLogsLoading } = useStudentCallLogs(
    studentId || undefined,
    { page: callLogPage, size: CALL_LOG_PAGE_SIZE }
  );
  const { data: selectedLog } = useCallLog(isDetailsModalOpen ? selectedLogId : null);

  const callLogs = callLogsData?.logs || [];
  const callLogPagination = callLogsData?.pagination;

  const enterEditMode = () => {
    if (!student || isEditMode) return;
    const phones = student.phones.map((p, i) => ({ id: p.id, phone: p.phone, isPrimary: p.isPrimary || (!student.phones.some(ph => ph.isPrimary) && i === 0) }));
    setEditForm({
      name: student.name,
      email: student.email ?? "",
      discordId: student.discordId ?? "",
      tags: [...student.tags],
      phones,
      newTag: "",
      newPhone: "",
    });
    setIsEditMode(true);
  };

  const saveEdits = async () => {
    if (!studentId || !editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const phones = editForm.phones.filter((p) => p.phone.trim());
    if (phones.length > 0 && !phones.some((p) => p.isPrimary)) {
      phones[0].isPrimary = true;
    }
    setIsSaving(true);
    try {
      await apiClient.updateStudent(studentId, {
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        discordId: editForm.discordId.trim() || null,
        tags: editForm.tags,
        phones,
      });
      await mutateStudent();
      setIsEditMode(false);
      toast.success("Student updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

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
          {isEditMode ? (
            <>
              <Button
                variant="ghost"
                className="gap-2 border border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                onClick={() => setIsEditMode(false)}
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                className="gap-2 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                onClick={() => void saveEdits()}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                className="gap-2 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                onClick={() => setIsCallHistoryModalOpen(true)}
              >
                <PhoneCall className="h-4 w-4" />
                Log Call
              </Button>
              <Button
                className="gap-2 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                disabled={!student || enrollments.length === 0}
                title={!student || enrollments.length === 0 ? "Student must be enrolled in a group" : undefined}
                onClick={() => {
                  setFollowUpForm({ groupId: enrollments[0]?.group?.id ?? "", dueAt: "", notes: "" });
                  setIsFollowUpModalOpen(true);
                }}
              >
                <ClipboardList className="h-4 w-4" />
                Add Follow-up
              </Button>
              <Button
                className="gap-2 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                disabled={!student}
                onClick={enterEditMode}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </>
          )}
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
              onClick={() => void mutateStudent()}
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
                    {isEditMode ? (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-[var(--groups1-text-secondary)]">Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              className="w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-2.5 py-1.5 text-sm text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-[var(--groups1-text-secondary)]">Email</label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                              className="w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-2.5 py-1.5 text-sm text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-[var(--groups1-text-secondary)]">Discord ID</label>
                            <input
                              type="text"
                              value={editForm.discordId}
                              onChange={(e) => setEditForm((f) => ({ ...f, discordId: e.target.value }))}
                              className="w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-2.5 py-1.5 text-sm text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs uppercase text-[var(--groups1-text-secondary)]">Primary Phone</label>
                            <input
                              type="tel"
                              value={editForm.phones.find((p) => p.isPrimary)?.phone ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditForm((f) => {
                                  const phones = [...f.phones];
                                  const primaryIdx = phones.findIndex((p) => p.isPrimary);
                                  if (primaryIdx >= 0) {
                                    phones[primaryIdx] = { ...phones[primaryIdx], phone: val };
                                  } else if (phones.length > 0) {
                                    phones[0] = { ...phones[0], phone: val, isPrimary: true };
                                  } else {
                                    phones.push({ phone: val, isPrimary: true });
                                  }
                                  return { ...f, phones };
                                });
                              }}
                              placeholder="Primary phone number"
                              className="w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-2.5 py-1.5 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs uppercase text-[var(--groups1-text-secondary)]">Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {editForm.tags.map((tag, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-[var(--groups1-secondary)] px-2 py-0.5 text-xs text-[var(--groups1-text)]">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => setEditForm((f) => ({ ...f, tags: f.tags.filter((_, i) => i !== idx) }))}
                                  className="ml-0.5 text-[var(--groups1-text-secondary)] hover:text-red-500"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editForm.newTag}
                              onChange={(e) => setEditForm((f) => ({ ...f, newTag: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && editForm.newTag.trim()) {
                                  e.preventDefault();
                                  const tag = editForm.newTag.trim();
                                  if (!editForm.tags.includes(tag)) {
                                    setEditForm((f) => ({ ...f, tags: [...f.tags, tag], newTag: "" }));
                                  }
                                }
                              }}
                              placeholder="Add tag and press Enter..."
                              className="flex-1 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-2.5 py-1.5 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                            />
                          </div>
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
                            <p className="text-sm text-[var(--groups1-text-secondary)]">No statuses recorded</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Name</p>
                            <p className="text-sm text-[var(--groups1-text)]">{student.name}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Email</p>
                            {student.email
                              ? <a href={`mailto:${student.email}`} className="text-sm text-[var(--groups1-primary)] hover:underline">{student.email}</a>
                              : <p className="text-sm text-[var(--groups1-text)]">-</p>
                            }
                          </div>
                          <div>
                            <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Discord ID</p>
                            <p className="text-sm text-[var(--groups1-text)]">{student.discordId ?? "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-[var(--groups1-text-secondary)]">Primary Phone</p>
                            {primaryPhone?.phone
                              ? <a href={`tel:${primaryPhone.phone}`} className="text-sm text-[var(--groups1-primary)] hover:underline">{primaryPhone.phone.replace(/\s+/g, "")}</a>
                              : <p className="text-sm text-[var(--groups1-text)]">-</p>
                            }
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
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card variant="groups1">
                  <CardHeader variant="groups1">
                    <CardTitle>Phone Numbers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6">
                    {isEditMode ? (
                      <>
                        {editForm.phones.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-2">
                            <input
                              type="tel"
                              value={p.phone}
                              onChange={(e) => setEditForm((f) => {
                                const phones = [...f.phones];
                                phones[i] = { ...phones[i], phone: e.target.value };
                                return { ...f, phones };
                              })}
                              className="flex-1 min-w-0 rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-2.5 py-1.5 text-sm text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                            />
                            <button
                              type="button"
                              onClick={() => setEditForm((f) => {
                                const phones = [...f.phones];
                                const wasPrimary = phones[i].isPrimary;
                                phones.splice(i, 1);
                                if (wasPrimary && phones.length > 0) phones[0].isPrimary = true;
                                return { ...f, phones };
                              })}
                              className="p-1 text-[var(--groups1-text-secondary)] hover:text-red-500 shrink-0"
                              title="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditForm((f) => ({
                                ...f,
                                phones: f.phones.map((ph, idx) => ({ ...ph, isPrimary: idx === i })),
                              }))}
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold border transition-colors",
                                p.isPrimary
                                  ? "bg-blue-100 text-blue-700 border-blue-300"
                                  : "bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border-[var(--groups1-border)] hover:border-blue-300 hover:text-blue-600"
                              )}
                            >
                              {p.isPrimary ? "Primary" : "Set Primary"}
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="tel"
                            value={editForm.newPhone}
                            onChange={(e) => setEditForm((f) => ({ ...f, newPhone: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editForm.newPhone.trim()) {
                                e.preventDefault();
                                setEditForm((f) => ({
                                  ...f,
                                  phones: [...f.phones, { phone: f.newPhone.trim(), isPrimary: f.phones.length === 0 }],
                                  newPhone: "",
                                }));
                              }
                            }}
                            placeholder="Add phone number..."
                            className="flex-1 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-2.5 py-1.5 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!editForm.newPhone.trim()) return;
                              setEditForm((f) => ({
                                ...f,
                                phones: [...f.phones, { phone: f.newPhone.trim(), isPrimary: f.phones.length === 0 }],
                                newPhone: "",
                              }));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-3 py-1.5 text-sm text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {student.phones.length > 0 ? (
                          student.phones.map((phone) => (
                            <div
                              key={phone.id}
                              className="flex items-center justify-between gap-4 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3"
                            >
                              <a href={`tel:${phone.phone}`} className="text-sm text-[var(--groups1-primary)] hover:underline">{phone.phone.replace(/\s+/g, "")}</a>
                              {phone.isPrimary && (
                                <StatusBadge variant="info" size="sm">
                                  Primary
                                </StatusBadge>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--groups1-text-secondary)]">No phone numbers</p>
                        )}
                      </>
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

                {callLogPagination && callLogPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--groups1-border)]">
                    <p className="text-xs text-[var(--groups1-text-secondary)]">
                      {callLogPagination.total} total · page {callLogPagination.page} of {callLogPagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={callLogPage <= 1}
                        onClick={() => setCallLogPage((p) => p - 1)}
                        className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={callLogPage >= callLogPagination.totalPages}
                        onClick={() => setCallLogPage((p) => p + 1)}
                        className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
                      >
                        Next
                      </Button>
                    </div>
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
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="Add notes about this student..."
                    className="w-full min-h-[200px] rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      disabled={localNotes === originalNotes}
                      onClick={() => setLocalNotes(originalNotes)}
                      className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={notesSaving || localNotes === originalNotes}
                      onClick={async () => {
                        if (!studentId) return;
                        setNotesSaving(true);
                        try {
                          await apiClient.updateStudentNotes(studentId, localNotes);
                          setOriginalNotes(localNotes);
                          toast.success("Notes saved");
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to save notes");
                        } finally {
                          setNotesSaving(false);
                        }
                      }}
                      className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                    >
                      {notesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Notes"}
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
                <Button onClick={() => setIsTaskModalOpen(true)}>Add Task</Button>
              </CardContent>
            </Card>
          )}

        </>
      )}

      {/* Call History Modal */}
      <Dialog open={isCallHistoryModalOpen} onOpenChange={setIsCallHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col bg-[var(--groups1-surface)] border-[var(--groups1-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--groups1-text)]">Call History — {student?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            {callLogsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
              </div>
            ) : callLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-[var(--groups1-text-secondary)]">
                <PhoneCall className="h-8 w-8" />
                <p>No call history yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--groups1-border)] text-xs uppercase text-[var(--groups1-text-secondary)]">
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Called By</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Duration</th>
                    <th className="px-3 py-2 text-left font-medium">What Was Talked</th>
                    <th className="px-3 py-2 text-left font-medium">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {callLogs.map((log) => {
                    const statusColor = getStatusColor(log.status);
                    const statusVariant = statusColor === "green" ? "success" : statusColor === "red" ? "error" : statusColor === "yellow" ? "warning" : "info";
                    const answers = Array.isArray(log.answers) ? log.answers : [];
                    const talkPoints: string[] = [];
                    if (log.callerNote) talkPoints.push(log.callerNote);
                    if (log.notes) talkPoints.push(log.notes);
                    answers.forEach((a: any) => {
                      if (a.answer !== undefined && a.answer !== null && a.answer !== "") {
                        talkPoints.push(`${a.question || "Q"}: ${String(a.answer)}`);
                      }
                    });

                    return (
                      <tr
                        key={log.id}
                        className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)] transition-colors align-top"
                      >
                        <td className="px-3 py-3 whitespace-nowrap text-[var(--groups1-text-secondary)]">
                          {new Date(log.callDate).toLocaleDateString()}<br />
                          <span className="text-[11px]">{new Date(log.callDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </td>
                        <td className="px-3 py-3 text-[var(--groups1-text)]">
                          {log.assignee?.user?.name ?? <span className="text-[var(--groups1-text-secondary)]">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge variant={statusVariant} size="sm">
                            {getStatusLabel(log.status)}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-[var(--groups1-text-secondary)]">
                          {formatCallDuration(log.callDuration)}
                        </td>
                        <td className="px-3 py-3 text-[var(--groups1-text)] max-w-[280px]">
                          {talkPoints.length > 0 ? (
                            <ul className="space-y-1">
                              {talkPoints.map((pt, i) => (
                                <li key={i} className="text-xs leading-snug">{pt}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[var(--groups1-text-secondary)]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {log.followUpRequired && log.followUpDate ? (
                            <div className="text-xs text-[var(--groups1-text-secondary)]">
                              {new Date(log.followUpDate).toLocaleDateString()}
                              {new Date(log.followUpDate) < new Date() && (
                                <span className="ml-1 text-red-500">(Overdue)</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--groups1-text-secondary)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {callLogPagination && callLogPagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--groups1-border)] pt-3 mt-2">
              <p className="text-xs text-[var(--groups1-text-secondary)]">
                {callLogPagination.total} total · page {callLogPagination.page} of {callLogPagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={callLogPage <= 1} onClick={() => setCallLogPage((p) => p - 1)} className="border-[var(--groups1-border)] text-[var(--groups1-text)]">Prev</Button>
                <Button variant="outline" size="sm" disabled={callLogPage >= callLogPagination.totalPages} onClick={() => setCallLogPage((p) => p + 1)} className="border-[var(--groups1-border)] text-[var(--groups1-text)]">Next</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Add Follow-up Modal */}
      <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
        <DialogContent className="max-w-md bg-[var(--groups1-surface)] border-[var(--groups1-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--groups1-text)]">Add Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {enrollments.length > 1 && (
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase text-[var(--groups1-text-secondary)]">Group</label>
                <select
                  value={followUpForm.groupId}
                  onChange={(e) => setFollowUpForm((f) => ({ ...f, groupId: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-3 py-2 text-sm text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                >
                  {enrollments.map((e) => (
                    <option key={e.id} value={e.group?.id ?? ""}>
                      {e.group?.name ?? "Unknown group"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-[var(--groups1-text-secondary)]">Due Date</label>
              <input
                type="datetime-local"
                value={followUpForm.dueAt}
                onChange={(e) => setFollowUpForm((f) => ({ ...f, dueAt: e.target.value }))}
                className="w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-3 py-2 text-sm text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-[var(--groups1-text-secondary)]">Notes</label>
              <textarea
                value={followUpForm.notes}
                onChange={(e) => setFollowUpForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={3}
                className="w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-3 py-2 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setIsFollowUpModalOpen(false)}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
              >
                Cancel
              </Button>
              <Button
                disabled={followUpSaving || !followUpForm.groupId || !followUpForm.dueAt}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                onClick={async () => {
                  if (!studentId || !followUpForm.groupId || !followUpForm.dueAt) return;
                  setFollowUpSaving(true);
                  try {
                    await apiClient.createFollowup({
                      studentId,
                      groupId: followUpForm.groupId,
                      dueAt: new Date(followUpForm.dueAt).toISOString(),
                      notes: followUpForm.notes || undefined,
                    });
                    toast.success("Follow-up created");
                    setIsFollowUpModalOpen(false);
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to create follow-up");
                  } finally {
                    setFollowUpSaving(false);
                  }
                }}
              >
                {followUpSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <CreateTaskDialog
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        members={members}
        currentMemberId={currentMember?.id ?? ""}
        onSuccess={() => setIsTaskModalOpen(false)}
        initialLinkedEntity={studentId ? { type: "student", id: studentId } : undefined}
      />
    </div>
  );
}

