"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { StudentSelector } from "./StudentSelector";
import { BatchSelector } from "./BatchSelector";
import { MessagesBuilder } from "./MessagesBuilder";
import { QuestionsBuilder } from "./QuestionsBuilder";
import { extractQuestions } from "@/lib/call-list-utils";
import type { CallList, CreateCallListPayload, UpdateCallListPayload, CallListSource, Question } from "@/types/call-lists.types";

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
  const [form, setForm] = useState({
    name: "",
    description: "",
    groupId: defaultGroupId || "",
    batchId: "",
    source: (defaultSource || "MANUAL") as CallListSource,
    studentIds: [] as string[],
    groupIds: [] as string[],
    messages: [] as string[],
    questions: [] as Question[],
  });
  const { data: groups, isLoading: groupsLoading } = useGroups();

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
          groupIds: [],
          messages: callList.messages || [],
          questions: questions,
        });
        setShowStudentSelector(false);
      } else {
        setForm({
          name: "",
          description: "",
          groupId: defaultGroupId || "",
          batchId: "",
          source: (defaultSource || "MANUAL") as CallListSource,
          studentIds: [],
          groupIds: [],
          messages: [],
          questions: [],
        });
        setShowStudentSelector(false);
      }
    }
  }, [open, callList, defaultGroupId, defaultSource]);

  const validateForm = (): boolean => {
    if (form.name.trim().length < 2) {
      toast.error("Call list name must be at least 2 characters");
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

    // Either groupId OR studentIds must be provided (only for create mode)
    if (!isEditMode) {
      const hasGroup = !!form.groupId;
      const hasStudents = form.studentIds && form.studentIds.length > 0;
      
      if (!hasGroup && !hasStudents) {
        toast.error("Either select a group or add students to the call list");
        return false;
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
        };
        await apiClient.updateCallList(callList.id, payload);
        toast.success("Call list updated successfully");
      } else {
        const payload: CreateCallListPayload = {
          name: form.name.trim(),
          source: form.source,
          description: form.description.trim() || undefined,
          groupId: form.groupId || undefined,
          batchId: form.batchId || undefined,
          studentIds: form.studentIds.length > 0 ? form.studentIds : undefined,
          groupIds: form.groupIds.length > 0 ? form.groupIds : undefined,
          messages: form.messages.filter(msg => msg.trim()),
          questions: form.questions.length > 0 ? form.questions : undefined,
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

          <div>
            <Label
              htmlFor="call-list-group"
              className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
            >
              Group <span className="text-gray-400 text-xs">(Optional - leave empty for workspace-level)</span>
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
            >
              <option value="">No Group (Workspace-level)</option>
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
                    onChange={(e) => setShowStudentSelector(e.target.checked)}
                    disabled={saving}
                    className="rounded border-[var(--groups1-border)]"
                  />
                  <span className="text-sm text-[var(--groups1-text)]">
                    Add students now
                  </span>
                </label>
              </div>

              {showStudentSelector && (
                <div>
                  <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-2">
                    Select Students
                  </Label>
                  <StudentSelector
                    selectedStudentIds={form.studentIds}
                    onSelectionChange={(studentIds) => setForm({ ...form, studentIds })}
                    groupId={form.groupId || undefined}
                    disabled={saving}
                  />
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
      </DialogContent>
    </Dialog>
  );
}

