"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, X, Plus, UserPlus } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { StudentSelector } from "./StudentSelector";
import { BatchSelector } from "./BatchSelector";
import { MessagesBuilder } from "./MessagesBuilder";
import { QuestionsBuilder } from "./QuestionsBuilder";
import { extractQuestions } from "@/lib/call-list-utils";
import type { CallList, CreateCallListPayload, UpdateCallListPayload, CallListSource, Question, StudentData } from "@/types/call-lists.types";

export interface CallListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callList?: CallList;
  defaultGroupId?: string;
  defaultSource?: CallListSource;
  onSuccess?: () => void;
}

export function CallListFormDialog({
  open,
  onOpenChange,
  callList,
  defaultGroupId,
  defaultSource,
  onSuccess,
}: CallListFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [studentInputMode, setStudentInputMode] = useState<'select' | 'single' | 'bulk'>('select');
  const [singleStudentData, setSingleStudentData] = useState({ name: "", email: "", phone: "" });
  const [bulkStudentText, setBulkStudentText] = useState("");
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    groupId: defaultGroupId || "",
    batchId: "",
    source: (defaultSource || "MANUAL") as CallListSource,
    studentIds: [] as string[],
    studentsData: [] as StudentData[],
    groupIds: [] as string[],
    messages: [] as string[],
    questions: [] as Question[],
    status: undefined as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | undefined,
  });
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const isAdmin = useIsAdmin();

  const isEditMode = !!callList;

  useEffect(() => {
    if (open) {
      if (callList) {
        const questions = extractQuestions(callList);
        setForm({
          name: callList.name || "",
          description: callList.description || "",
          groupId: callList.groupId || "",
          batchId: callList.meta?.batchId || "",
          source: callList.source || "MANUAL",
          studentIds: [],
          studentsData: [],
          groupIds: [],
          messages: callList.messages || [],
          questions: questions,
          status: callList.status || 'ACTIVE',
        });
        setShowStudentSelector(false);
        setStudentInputMode('select');
      } else {
        setForm({
          name: "",
          description: "",
          groupId: defaultGroupId || "",
          batchId: "",
          source: (defaultSource || "MANUAL") as CallListSource,
          studentIds: [],
          studentsData: [],
          groupIds: [],
          messages: [],
          questions: [],
          status: undefined,
        });
        setShowStudentSelector(false);
        setStudentInputMode('select');
        setSingleStudentData({ name: "", email: "", phone: "" });
        setBulkStudentText("");
      }
    }
  }, [open, callList, defaultGroupId, defaultSource]);

  const validateForm = (): boolean => {
    if (form.name.trim().length < 2) {
      toast.error("Call list name must be at least 2 characters");
      return false;
    }

    // Group is required (only for create mode)
    if (!isEditMode && !form.groupId) {
      toast.error("Please select a group");
      return false;
    }

    // Validate batch-group relationship (if both selected)
    if (form.groupId && form.batchId && groups) {
      const selectedGroup = groups.find(g => g.id === form.groupId);
      if (selectedGroup && selectedGroup.batchId !== form.batchId) {
        toast.error("Selected group does not belong to the specified batch");
        return false;
      }
    }

    // Validate studentsData
    if (form.studentsData && form.studentsData.length > 0) {
      for (const student of form.studentsData) {
        if (!student.name || student.name.trim().length === 0) {
          toast.error("All students must have a name");
          return false;
        }
      }
    }

    // Validate questions
    const questionIds = new Set<string>();
    for (const question of form.questions) {
      if (questionIds.has(question.id)) {
        toast.error(`Duplicate question ID found: ${question.id}. Please refresh and try again.`);
        return false;
      }
      questionIds.add(question.id);

      if (!question.question.trim()) {
        toast.error("All questions must have question text");
        return false;
      }

      if (question.type === "multiple_choice") {
        if (!question.options || question.options.length < 2) {
          toast.error(`Question "${question.question || 'Untitled'}" must have at least 2 options`);
          return false;
        }
        // Check for empty options
        const hasEmptyOption = question.options.some(opt => !opt.trim());
        if (hasEmptyOption) {
          toast.error(`Question "${question.question || 'Untitled'}" has empty options`);
          return false;
        }
      }
    }

    return true;
  };

  const handleAddSingleStudent = () => {
    if (!singleStudentData.name.trim()) {
      toast.error("Student name is required");
      return;
    }

    const newStudent: StudentData = {
      name: singleStudentData.name.trim(),
      email: singleStudentData.email.trim() || undefined,
      phone: singleStudentData.phone.trim() || undefined,
    };

    setForm({
      ...form,
      studentsData: [...form.studentsData, newStudent],
      studentIds: [], // Clear studentIds when using studentsData
    });

    // Reset form
    setSingleStudentData({ name: "", email: "", phone: "" });
  };

  const handleRemoveStudent = (index: number) => {
    setForm({
      ...form,
      studentsData: form.studentsData.filter((_, i) => i !== index),
    });
  };

  const parseBulkStudentText = (text: string): StudentData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const students: StudentData[] = [];
    
    // Try to detect if first line is headers
    const firstLine = lines[0];
    const isCSVWithHeaders = firstLine.toLowerCase().includes('name') && 
                             (firstLine.toLowerCase().includes('email') || firstLine.toLowerCase().includes('phone'));
    
    if (isCSVWithHeaders) {
      // Parse as CSV with headers
      const headerLine = lines[0];
      const delimiter = headerLine.includes('\t') ? '\t' : ',';
      const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());
      
      // Find column indices
      const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('group') && !h.includes('course'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const phoneIdx = headers.findIndex(h => h.includes('phone') && !h.includes('secondary'));
      const secondaryPhoneIdx = headers.findIndex(h => h.includes('secondary') && h.includes('phone'));
      const discordIdx = headers.findIndex(h => h.includes('discord'));
      const tagsIdx = headers.findIndex(h => h.includes('tag'));

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(p => p.trim());
        if (parts.length === 0 || !parts[nameIdx]) continue;

        const student: StudentData = {
          name: parts[nameIdx] || '',
          email: emailIdx >= 0 && parts[emailIdx] ? parts[emailIdx] : undefined,
          phone: phoneIdx >= 0 && parts[phoneIdx] ? parts[phoneIdx] : undefined,
          secondaryPhone: secondaryPhoneIdx >= 0 && parts[secondaryPhoneIdx] ? parts[secondaryPhoneIdx] : undefined,
          discordId: discordIdx >= 0 && parts[discordIdx] ? parts[discordIdx] : undefined,
          tags: tagsIdx >= 0 && parts[tagsIdx] 
            ? parts[tagsIdx].split(',').map(t => t.trim()).filter(Boolean)
            : undefined,
        };

        if (student.name) {
          students.push(student);
        }
      }
    } else {
      // Simple parsing (no headers, assume position-based)
      for (const line of lines) {
        const delimiter = line.includes('\t') ? '\t' : ',';
        const parts = line.split(delimiter).map(p => p.trim());
        
        if (parts.length === 0 || !parts[0]) continue;

        const student: StudentData = {
          name: parts[0],
          email: parts[1] || undefined,
          phone: parts[2] || undefined,
          secondaryPhone: parts[3] || undefined,
          discordId: parts[4] || undefined,
          tags: parts[5] ? parts[5].split(',').map(t => t.trim()).filter(Boolean) : undefined,
        };

        students.push(student);
      }
    }

    return students;
  };

  const handleParseBulkStudents = () => {
    if (!bulkStudentText.trim()) {
      toast.error("Please enter student data");
      return;
    }

    const parsed = parseBulkStudentText(bulkStudentText);
    
    if (parsed.length === 0) {
      toast.error("No valid student data found. Format: Name, Email, Phone (one per line)");
      return;
    }

    // Validate all have names
    const invalid = parsed.filter(s => !s.name || s.name.trim().length === 0);
    if (invalid.length > 0) {
      toast.error(`${invalid.length} student(s) are missing names`);
      return;
    }

    setForm({
      ...form,
      studentsData: [...form.studentsData, ...parsed],
      studentIds: [], // Clear studentIds when using studentsData
    });

    // Clear bulk text
    setBulkStudentText("");
    toast.success(`${parsed.length} student(s) added`);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && callList) {
        const payload: UpdateCallListPayload = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          messages: form.messages.filter(msg => msg.trim()),
          questions: form.questions.length > 0 ? form.questions : undefined,
          status: form.status || undefined,
        };
        await apiClient.updateCallList(callList.id, payload);
        toast.success("Call list updated successfully");
      } else {
        const payload: CreateCallListPayload = {
          name: form.name.trim(),
          source: form.source,
          description: form.description.trim() || undefined,
          groupId: form.groupId,
          batchId: form.batchId || undefined,
          studentIds: form.studentIds.length > 0 && form.studentsData.length === 0 ? form.studentIds : undefined,
          studentsData: form.studentsData.length > 0 ? form.studentsData : undefined,
          groupIds: form.groupIds.length > 0 ? form.groupIds : undefined,
          messages: form.messages.filter(msg => msg.trim()),
          questions: form.questions.length > 0 ? form.questions : undefined,
          matchBy: form.studentsData.length > 0 ? 'email_or_phone' : undefined,
          skipDuplicates: form.studentsData.length > 0 ? true : undefined,
        };
        await apiClient.createCallList(payload);
        toast.success("Call list created successfully");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Call list save error:", error);
      const errorMessage =
        error?.message || error?.error?.message || "Failed to save call list";
      
      if (error?.status === 403) {
        toast.error("Access denied");
      } else if (error?.status === 404) {
        toast.error("Group not found");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-3/4 md:w-[70vw] max-w-none md:max-w-[70vw] max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Call List" : "Create Call List"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label
              htmlFor="call-list-name"
              className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
            >
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="call-list-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter call list name"
              className="bg-[var(--groups1-background)] border-[var(--groups1-border)]"
              disabled={saving}
            />
          </div>

          <div>
            <Label
              htmlFor="call-list-description"
              className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
            >
              Description <span className="text-gray-400 text-xs font-normal">(Optional)</span>
            </Label>
            <textarea
              id="call-list-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter call list description..."
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
              disabled={saving}
            />
          </div>

          <MessagesBuilder
            messages={form.messages}
            onChange={(messages) => setForm({ ...form, messages })}
            disabled={saving}
          />

          <QuestionsBuilder
            questions={form.questions}
            onChange={(questions) => setForm({ ...form, questions })}
            disabled={saving}
          />

          {isEditMode && isAdmin && (
            <div>
              <Label
                htmlFor="call-list-status"
                className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
              >
                Status <span className="text-gray-400 text-xs font-normal">(Admin only)</span>
              </Label>
              <select
                id="call-list-status"
                value={form.status || 'ACTIVE'}
                onChange={(e) => {
                  const newStatus = e.target.value as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
                  const currentStatus = callList?.status || 'ACTIVE';
                  
                  // If status is changing, show confirmation dialog
                  if (newStatus !== currentStatus) {
                    setPendingStatusChange(newStatus);
                    setIsStatusChangeDialogOpen(true);
                  } else {
                    setForm({ ...form, status: newStatus });
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
                disabled={saving}
                aria-label="Select status"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          )}

          <div>
            <Label
              htmlFor="call-list-group"
              className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
            >
              Group <span className="text-red-500">*</span>
            </Label>
            <select
              id="call-list-group"
              value={form.groupId || ""}
              onChange={(e) => {
                const newGroupId = e.target.value || "";
                // Clear batch if group changes and batch doesn't match new group
                let newBatchId = form.batchId;
                if (newGroupId && groups) {
                  const selectedGroup = groups.find(g => g.id === newGroupId);
                  if (selectedGroup && selectedGroup.batchId !== form.batchId) {
                    newBatchId = "";
                  }
                }
                setForm({ ...form, groupId: newGroupId, batchId: newBatchId });
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
              disabled={saving || groupsLoading || isEditMode}
              aria-label="Select group"
              required
            >
              <option value="">Select a group</option>
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label
              htmlFor="call-list-batch"
              className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
            >
              Batch <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <BatchSelector
              value={form.batchId || undefined}
              onChange={(batchId) => setForm({ ...form, batchId: batchId || "" })}
              groupId={form.groupId || undefined}
              disabled={saving || isEditMode}
            />
            {form.groupId && form.batchId && (
              <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                If both group and batch are selected, the group must belong to the selected batch.
              </p>
            )}
          </div>

          {!isEditMode && (
            <>
              <div>
                <Label
                  htmlFor="call-list-source"
                  className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
                >
                  Source <span className="text-red-500">*</span>
                </Label>
                <select
                  id="call-list-source"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as CallListSource })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
                  disabled={saving}
                  aria-label="Select source"
                >
                  <option value="MANUAL">Manual</option>
                  <option value="FILTER">Filter</option>
                  <option value="IMPORT">Import</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStudentSelector}
                    onChange={(e) => {
                      setShowStudentSelector(e.target.checked);
                      if (!e.target.checked) {
                        setStudentInputMode('select');
                      }
                    }}
                    disabled={saving}
                    className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-focus-ring)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-[var(--groups1-text)]">
                    Add students now
                  </span>
                </label>
              </div>

              {showStudentSelector && (
                <div className="space-y-4">
                  {/* Mode selector tabs */}
                  <div className="flex gap-2 border-b border-[var(--groups1-border)]">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentInputMode('select');
                        setForm({ ...form, studentsData: [] });
                        setSingleStudentData({ name: "", email: "", phone: "" });
                        setBulkStudentText("");
                      }}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        studentInputMode === 'select'
                          ? 'border-[var(--groups1-primary)] text-[var(--groups1-primary)]'
                          : 'border-transparent text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]'
                      }`}
                      disabled={saving}
                    >
                      Select Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentInputMode('single');
                        setForm({ ...form, studentIds: [] });
                        setBulkStudentText("");
                      }}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        studentInputMode === 'single'
                          ? 'border-[var(--groups1-primary)] text-[var(--groups1-primary)]'
                          : 'border-transparent text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]'
                      }`}
                      disabled={saving}
                    >
                      Add Single
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentInputMode('bulk');
                        setForm({ ...form, studentIds: [] });
                        setSingleStudentData({ name: "", email: "", phone: "" });
                      }}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        studentInputMode === 'bulk'
                          ? 'border-[var(--groups1-primary)] text-[var(--groups1-primary)]'
                          : 'border-transparent text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]'
                      }`}
                      disabled={saving}
                    >
                      Bulk Paste
                    </button>
                  </div>

                  {/* Select Existing Mode */}
                  {studentInputMode === 'select' && (
                    <div>
                      <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-2">
                        Select Students
                      </Label>
                      <StudentSelector
                        selectedStudentIds={form.studentIds}
                        onSelectionChange={(studentIds) => {
                          setForm({ ...form, studentIds, studentsData: [] });
                          setSingleStudentData({ name: "", email: "", phone: "" });
                          setBulkStudentText("");
                        }}
                        groupId={form.groupId || undefined}
                        disabled={saving}
                      />
                    </div>
                  )}

                  {/* Single Student Entry Mode */}
                  {studentInputMode === 'single' && (
                    <div className="space-y-4">
                      <Label className="block text-left text-sm font-medium text-[var(--groups1-text)]">
                        Add Single Student
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="student-name" className="block text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">
                            Name *
                          </Label>
                          <Input
                            id="student-name"
                            value={singleStudentData.name}
                            onChange={(e) => setSingleStudentData({ ...singleStudentData, name: e.target.value })}
                            placeholder="Student name"
                            disabled={saving}
                            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="student-email" className="block text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">
                            Email
                          </Label>
                          <Input
                            id="student-email"
                            type="email"
                            value={singleStudentData.email}
                            onChange={(e) => setSingleStudentData({ ...singleStudentData, email: e.target.value })}
                            placeholder="email@example.com"
                            disabled={saving}
                            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="student-phone" className="block text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">
                            Phone
                          </Label>
                          <Input
                            id="student-phone"
                            value={singleStudentData.phone}
                            onChange={(e) => setSingleStudentData({ ...singleStudentData, phone: e.target.value })}
                            placeholder="+1234567890"
                            disabled={saving}
                            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddSingleStudent}
                        disabled={saving || !singleStudentData.name.trim()}
                        className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Student
                      </Button>

                      {/* List of added students */}
                      {form.studentsData.length > 0 && (
                        <div className="mt-4">
                          <Label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                            Added Students ({form.studentsData.length})
                          </Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {form.studentsData.map((student, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-[var(--groups1-text)]">{student.name}</div>
                                  <div className="text-xs text-[var(--groups1-text-secondary)]">
                                    {student.email && <span>{student.email}</span>}
                                    {student.email && student.phone && <span> • </span>}
                                    {student.phone && <span>{student.phone}</span>}
                                    {!student.email && !student.phone && <span className="text-[var(--groups1-text-secondary)]">No contact info</span>}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleRemoveStudent(index)}
                                  disabled={saving}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bulk Paste Mode */}
                  {studentInputMode === 'bulk' && (
                    <div className="space-y-4">
                      <Label className="block text-left text-sm font-medium text-[var(--groups1-text)]">
                        Bulk Paste Students
                      </Label>
                      <p className="text-xs text-[var(--groups1-text-secondary)]">
                        Paste student data (one per line). Format: Name, Email, Phone (comma or tab separated)
                      </p>
                      <textarea
                        value={bulkStudentText}
                        onChange={(e) => setBulkStudentText(e.target.value)}
                        placeholder="John Doe, john@example.com, +1234567890&#10;Jane Smith, jane@example.com, +0987654321&#10;..."
                        rows={8}
                        disabled={saving}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y font-mono"
                      />
                      <Button
                        type="button"
                        onClick={handleParseBulkStudents}
                        disabled={saving || !bulkStudentText.trim()}
                        className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Parse & Add Students
                      </Button>

                      {/* List of added students */}
                      {form.studentsData.length > 0 && (
                        <div className="mt-4">
                          <Label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                            Added Students ({form.studentsData.length})
                          </Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {form.studentsData.map((student, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-[var(--groups1-text)]">{student.name}</div>
                                  <div className="text-xs text-[var(--groups1-text-secondary)]">
                                    {student.email && <span>{student.email}</span>}
                                    {student.email && student.phone && <span> • </span>}
                                    {student.phone && <span>{student.phone}</span>}
                                    {!student.email && !student.phone && <span className="text-[var(--groups1-text-secondary)]">No contact info</span>}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleRemoveStudent(index)}
                                  disabled={saving}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? "Update" : "Create"
              )}
            </Button>
          </div>
        </div>

        {/* Status Change Confirmation Dialog */}
        <Dialog open={isStatusChangeDialogOpen} onOpenChange={setIsStatusChangeDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {pendingStatusChange === 'COMPLETED' 
                  ? 'Mark as Complete' 
                  : pendingStatusChange === 'ARCHIVED'
                  ? 'Archive Call List'
                  : 'Reopen Call List'}
              </DialogTitle>
              <DialogClose onClose={() => setIsStatusChangeDialogOpen(false)} />
            </DialogHeader>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              {pendingStatusChange === 'COMPLETED' 
                ? `Are you sure you want to mark "${callList?.name}" as complete? This action can be undone.`
                : pendingStatusChange === 'ARCHIVED'
                ? `Are you sure you want to archive "${callList?.name}"? Archived call lists are hidden from active views but can be restored.`
                : `Are you sure you want to reopen "${callList?.name}"? It will be moved back to active call lists.`}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsStatusChangeDialogOpen(false);
                  setPendingStatusChange(null);
                  // Reset to original status
                  if (callList) {
                    setForm({ ...form, status: (callList.status || 'ACTIVE') as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' });
                  }
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (pendingStatusChange) {
                    setForm({ ...form, status: pendingStatusChange });
                    setIsStatusChangeDialogOpen(false);
                    setPendingStatusChange(null);
                  }
                }}
                disabled={saving}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                {pendingStatusChange === 'COMPLETED' 
                  ? 'Mark as Complete' 
                  : pendingStatusChange === 'ARCHIVED'
                  ? 'Archive'
                  : 'Reopen'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

