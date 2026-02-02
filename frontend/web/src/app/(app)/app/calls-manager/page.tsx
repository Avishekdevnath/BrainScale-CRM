"use client";

import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useMyCalls, useMyCallsStats } from "@/hooks/useMyCalls";
import { useGroups } from "@/hooks/useGroups";
import { useBatches } from "@/hooks/useBatches";
import { useCallLists } from "@/hooks/useCallLists";
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FollowUpModal } from "@/components/calls/FollowUpModal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Phone, User, CheckCircle2, Calendar, Trash2, CheckCheck, Search } from "lucide-react";
import { mutate } from "swr";
import type { CallListItem, CreateCallLogRequest, CallLogStatus, CallListItemState, Question, Answer } from "@/types/call-lists.types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatAnswer, validateCallLog } from "@/lib/call-list-utils";

export default function CallsManagerPage() {
  usePageTitle("Calls Manager");
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [state, setState] = useState<CallListItemState | null>("QUEUED"); // Default to pending
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [groupId, setGroupId] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("");
  const [callListId, setCallListId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [callerNotes, setCallerNotes] = useState<Record<string, string>>({});
  const [callerNoteEditor, setCallerNoteEditor] = useState<{
    open: boolean;
    itemId: string | null;
    draft: string;
  }>({ open: false, itemId: null, draft: "" });
  const [selectedItem, setSelectedItem] = useState<CallListItem | null>(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const [callStatuses, setCallStatuses] = useState<Record<string, CallLogStatus>>({});
  const [followUpData, setFollowUpData] = useState<Record<string, {
    followUpRequired: boolean;
    followUpDate?: string;
    followUpNote?: string;
  }>>({});
  const [itemAnswers, setItemAnswers] = useState<Record<string, Record<string, any>>>({});
  const [textAnswerEditor, setTextAnswerEditor] = useState<{
    open: boolean;
    itemId: string | null;
    questionId: string | null;
    questionLabel: string;
    draft: string;
  }>({ open: false, itemId: null, questionId: null, questionLabel: "", draft: "" });
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean;
    type: "done" | "unassign" | null;
    working: boolean;
  }>({ open: false, type: null, working: false });

  const { data: stats } = useMyCallsStats();
  const { data: groupsData } = useGroups();
  const { data: batchesData } = useBatches({ page: 1, size: 200, isActive: true });
  const { data: callListsData } = useCallLists({
    page: 1,
    size: 200,
    status: "ACTIVE",
    groupId: groupId || undefined,
    batchId: batchId || undefined,
  });

  const counts = useMemo(() => {
    return {
      pending: stats?.pending ?? 0,
      completed: stats?.completed ?? 0,
      followUps: stats?.followUps ?? 0,
    };
  }, [stats]);
  
  // Build API params based on current filter
  const apiParams = useMemo(() => {
    const params: any = {
      page,
      size: pageSize,
      q: debouncedSearchQuery || undefined,
      groupId: groupId || undefined,
      batchId: batchId || undefined,
      callListId: callListId || undefined,
    };
    
    if (showFollowUps) {
      // When showing follow-ups, don't filter by state, only by followUpRequired
      params.followUpRequired = true;
    } else {
      // When state is set, filter by that state (default to QUEUED)
      params.state = state || "QUEUED";
    }
    
    return params;
  }, [page, pageSize, state, showFollowUps, debouncedSearchQuery, groupId, batchId, callListId]);

  const { data, isLoading, error, mutate: mutateCalls } = useMyCalls(apiParams);

  const items = data?.items || [];
  const pageItemIds = useMemo(() => items.map((item) => item.id), [items]);

  const tableQuestions = useMemo(() => {
    const callListIds = new Set(items.map((i) => i.callListId).filter(Boolean));
    if (callListIds.size !== 1) return [];

    const firstWithCallList = items.find((i) => i.callList && i.callListId);
    const rawQuestions = (firstWithCallList?.callList?.questions || []) as Question[];
    return [...rawQuestions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [items]);

  const showQuestionColumns = tableQuestions.length > 0;

  const setAnswerValue = (itemId: string, questionId: string, value: any) => {
    setItemAnswers((prev) => {
      const nextForItem = { ...(prev[itemId] || {}) };
      if (value === undefined || value === null || value === "") {
        delete nextForItem[questionId];
      } else {
        nextForItem[questionId] = value;
      }
      return { ...prev, [itemId]: nextForItem };
    });
  };

  const getAnswerValue = (item: CallListItem, questionId: string) => {
    const local = itemAnswers[item.id]?.[questionId];
    if (local !== undefined) return local;
    const existing = item.callLog?.answers?.find((a) => a.questionId === questionId)?.answer;
    return existing ?? "";
  };

  const buildAnswersForItem = (item: CallListItem, questions: Question[]): Answer[] => {
    const answersByQuestionId = itemAnswers[item.id] || {};

    return questions
      .map((q) => {
        const raw = answersByQuestionId[q.id];
        if (raw === undefined || raw === null || raw === "") return null;

        let answerValue: string | number | boolean = raw;
        if (q.type === "number" && typeof answerValue === "string") {
          answerValue = parseFloat(answerValue);
        }

        return {
          questionId: q.id,
          question: q.question,
          answer: answerValue,
          answerType: q.type,
        };
      })
      .filter(Boolean) as Answer[];
  };

  useEffect(() => {
    setSelectedItemIds(new Set());
  }, [page, state, showFollowUps, debouncedSearchQuery, groupId, batchId, callListId]);

  const isAllSelectedOnPage = useMemo(() => {
    if (pageItemIds.length === 0) return false;
    return pageItemIds.every((id) => selectedItemIds.has(id));
  }, [pageItemIds, selectedItemIds]);

  const selectedItems = useMemo(() => {
    if (selectedItemIds.size === 0) return [];
    return items.filter((item) => selectedItemIds.has(item.id));
  }, [items, selectedItemIds]);

  const hasSelection = selectedItemIds.size > 0;
  const selectedCount = selectedItemIds.size;

  const hasMissingNotesInSelection = useMemo(() => {
    if (!hasSelection) return false;
    return selectedItems.some((item) => (callerNotes[item.id] ?? "").trim().length === 0);
  }, [callerNotes, hasSelection, selectedItems]);

  const viewLabel = showFollowUps
    ? "Follow-ups"
    : state === "DONE"
      ? "Completed"
      : "Pending";

  const handleCallerNoteChange = (itemId: string, note: string) => {
    setCallerNotes((prev) => ({ ...prev, [itemId]: note }));
  };

  const openCallerNoteEditor = (itemId: string, seed?: string) => {
    const current = callerNotes[itemId] ?? "";
    setCallerNoteEditor({
      open: true,
      itemId,
      draft: seed ? `${current}${seed}` : current,
    });
  };

  const handleCallStatusChange = (itemId: string, status: CallLogStatus) => {
    setCallStatuses((prev) => ({ ...prev, [itemId]: status }));
  };

  const handleFollowUpClick = (item: CallListItem) => {
    setSelectedItem(item);
    setIsFollowUpModalOpen(true);
  };

  const handleFollowUpSave = (itemId: string, data: {
    followUpRequired: boolean;
    followUpDate?: string;
    followUpNote?: string;
  }) => {
    setFollowUpData((prev) => ({ ...prev, [itemId]: data }));
  };

  const handleDone = async (item: CallListItem) => {
    if (!item.callListId) {
      toast.error("Call list ID is missing");
      return;
    }

    const callerNote = callerNotes[item.id]?.trim() || "";
    if (!callerNote) {
      toast.error("Caller note is required before marking as done");
      return;
    }

    setSubmittingItemId(item.id);
    try {
      const followUp = followUpData[item.id];
      const selectedStatus = callStatuses[item.id] ?? "completed";
      const questions = ([...(item.callList?.questions || [])] as Question[]).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      const answers = buildAnswersForItem(item, questions);
      const validation = validateCallLog(answers, questions);
      if (!validation.valid) {
        toast.error(validation.errors[0] || "Please answer all required questions");
        return;
      }

      // Create a minimal call log
      // Note: Backend allows empty answers array if there are no required questions
      const payload: CreateCallLogRequest = {
        callListItemId: item.id,
        status: selectedStatus,
        answers,
        callerNote: callerNote || undefined,
        followUpRequired: followUp?.followUpRequired || false,
        followUpDate: followUp?.followUpRequired && followUp?.followUpDate 
          ? new Date(followUp.followUpDate).toISOString() 
          : undefined,
        followUpNote: followUp?.followUpRequired && followUp?.followUpNote 
          ? followUp.followUpNote 
          : undefined,
      };

      await apiClient.createCallLog(payload);
      toast.success("Call completed successfully");
      
      // Clear local state for this item
      setCallerNotes((prev) => {
        const newNotes = { ...prev };
        delete newNotes[item.id];
        return newNotes;
      });
      setCallStatuses((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setFollowUpData((prev) => {
        const newData = { ...prev };
        delete newData[item.id];
        return newData;
      });
      setItemAnswers((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      // Refresh data - force refresh to update follow-ups list
      await mutateCalls();
      await mutate("my-calls-stats");
      await mutate((key) => typeof key === "string" && key.startsWith("my-calls"));
      
      // If we're viewing follow-ups, the list should update automatically
      // The API will return items with followUpRequired: true from their call logs
    } catch (error: any) {
      console.error("Failed to complete call:", error);
      toast.error(error?.message || "Failed to complete call");
    } finally {
      setSubmittingItemId(null);
    }
  };

  const handleCallerNoteEditorSave = () => {
    if (!callerNoteEditor.itemId) return;
    handleCallerNoteChange(callerNoteEditor.itemId, callerNoteEditor.draft);
    setCallerNoteEditor({ open: false, itemId: null, draft: "" });
  };

  const handleCallerNoteEditorCancel = () => {
    setCallerNoteEditor({ open: false, itemId: null, draft: "" });
  };

  const handleTextAnswerEditorSave = () => {
    if (!textAnswerEditor.itemId || !textAnswerEditor.questionId) return;
    setAnswerValue(textAnswerEditor.itemId, textAnswerEditor.questionId, textAnswerEditor.draft);
    setTextAnswerEditor({ open: false, itemId: null, questionId: null, questionLabel: "", draft: "" });
  };

  const handleTextAnswerEditorCancel = () => {
    setTextAnswerEditor({ open: false, itemId: null, questionId: null, questionLabel: "", draft: "" });
  };

  const handleToggleSelectAllOnPage = () => {
    if (pageItemIds.length === 0) return;
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      const allSelected = pageItemIds.every((id) => next.has(id));
      if (allSelected) {
        pageItemIds.forEach((id) => next.delete(id));
      } else {
        pageItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelectOne = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const renderQuestionInput = (item: CallListItem, q: Question, isSubmitting: boolean) => {
    const isReadOnly = !!item.callLog;
    const value = getAnswerValue(item, q.id);

    const baseClass = cn(
      "w-full px-2.5 py-2 text-[13px] rounded-lg border border-[var(--groups1-border)]",
      "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
      "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
      isSubmitting && "opacity-50 cursor-not-allowed"
    );

    if (isReadOnly) {
      const existingAnswer = item.callLog?.answers?.find((a) => a.questionId === q.id);
      return (
        <div className="text-[13px] text-[var(--groups1-text)]">
          {existingAnswer ? formatAnswer(existingAnswer) : <span className="text-[var(--groups1-text-secondary)]">—</span>}
        </div>
      );
    }

    if (q.type === "multiple_choice") {
      return (
        <select
          value={String(value || "")}
          onChange={(e) => setAnswerValue(item.id, q.id, e.target.value)}
          disabled={isSubmitting}
          className={baseClass}
        >
          <option value="">—</option>
          {(q.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (q.type === "yes_no") {
      return (
        <select
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) => {
            const v = e.target.value;
            setAnswerValue(item.id, q.id, v === "" ? undefined : v === "true");
          }}
          disabled={isSubmitting}
          className={baseClass}
        >
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (q.type === "number") {
      return (
        <Input
          value={value === "" ? "" : String(value)}
          onChange={(e) => setAnswerValue(item.id, q.id, e.target.value)}
          disabled={isSubmitting}
          className={baseClass}
          inputMode="decimal"
        />
      );
    }

    if (q.type === "date") {
      return (
        <Input
          type="date"
          value={String(value || "")}
          onChange={(e) => setAnswerValue(item.id, q.id, e.target.value)}
          disabled={isSubmitting}
          className={baseClass}
        />
      );
    }

    // text
    return (
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() =>
          setTextAnswerEditor({
            open: true,
            itemId: item.id,
            questionId: q.id,
            questionLabel: q.question,
            draft: String(value || ""),
          })
        }
        className={cn(
          "w-full text-left rounded-lg border border-[var(--groups1-border)]",
          "bg-[var(--groups1-surface)] px-2.5 py-2 text-[13px]",
          "hover:bg-[var(--groups1-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        title={q.question}
      >
        <span className={cn("block truncate", value ? "text-[var(--groups1-text)]" : "text-[var(--groups1-text-secondary)]")}>
          {value ? String(value) : "Write..."}
        </span>
      </button>
    );
  };

  const openBulkDialog = (type: "done" | "unassign") => {
    if (!hasSelection) return;
    if (type === "done" && hasMissingNotesInSelection) {
      toast.error("Add caller notes for all selected rows before bulk Done");
      return;
    }
    setBulkActionDialog({ open: true, type, working: false });
  };

  const closeBulkDialog = () => setBulkActionDialog({ open: false, type: null, working: false });

  const runBulkUnassign = async () => {
    if (!hasSelection) return;
    setBulkActionDialog((prev) => ({ ...prev, working: true }));
    try {
      const itemsByList = selectedItems.reduce<Record<string, string[]>>((acc, item) => {
        if (!item.callListId) return acc;
        acc[item.callListId] = acc[item.callListId] ?? [];
        acc[item.callListId].push(item.id);
        return acc;
      }, {});

      const listIds = Object.keys(itemsByList);
      if (listIds.length === 0) {
        toast.error("No call list IDs found for selected items");
        return;
      }

      const results = await Promise.all(
        listIds.map((listId) => apiClient.unassignCallListItems(listId, { itemIds: itemsByList[listId] }))
      );
      const totalUnassigned = results.reduce((sum, r) => sum + (r.unassignedCount ?? 0), 0);
      toast.success(`Unassigned ${totalUnassigned} call(s)`);

      setSelectedItemIds(new Set());
      await mutateCalls();
      await mutate("my-calls-stats");
      await mutate((key) => typeof key === "string" && key.startsWith("my-calls"));
      closeBulkDialog();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to unassign calls");
    } finally {
      setBulkActionDialog((prev) => ({ ...prev, working: false }));
    }
  };

  const runBulkDone = async () => {
    if (!hasSelection) return;
    if (hasMissingNotesInSelection) {
      toast.error("Add caller notes for all selected rows before bulk Done");
      return;
    }

    setBulkActionDialog((prev) => ({ ...prev, working: true }));
    try {
      const concurrency = 5;
      let completed = 0;
      let failed = 0;
      const errorMessages: string[] = [];
      const selectedItemsCopy = [...selectedItems];

      const worker = async () => {
        while (selectedItemsCopy.length > 0) {
          const item = selectedItemsCopy.shift();
          if (!item) return;
          const callerNote = (callerNotes[item.id] ?? "").trim();
          if (!callerNote) continue;

          const followUp = followUpData[item.id];
          const selectedStatus = callStatuses[item.id] ?? "completed";
          const questions = ([...(item.callList?.questions || [])] as Question[]).sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          const answers = buildAnswersForItem(item, questions);
          const validation = validateCallLog(answers, questions);
          if (!validation.valid) {
            failed += 1;
            if (errorMessages.length < 5) {
              errorMessages.push(validation.errors[0] || `Missing required answers for ${item.student?.name || "a call"}`);
            }
            continue;
          }

          const payload: CreateCallLogRequest = {
            callListItemId: item.id,
            status: selectedStatus,
            answers,
            callerNote,
            followUpRequired: followUp?.followUpRequired || false,
            followUpDate:
              followUp?.followUpRequired && followUp?.followUpDate ? new Date(followUp.followUpDate).toISOString() : undefined,
            followUpNote:
              followUp?.followUpRequired && followUp?.followUpNote ? followUp.followUpNote : undefined,
          };

          await apiClient.createCallLog(payload);
          completed += 1;
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, selectedItems.length) }, () => worker()));
      if (completed > 0) toast.success(`Marked ${completed} call(s) as done`);
      if (failed > 0) {
        toast.error(`${failed} call(s) skipped (missing required answers)`);
        if (errorMessages.length > 0) {
          console.error("Bulk done skipped due to validation:", errorMessages);
        }
      }

      setSelectedItemIds(new Set());
      await mutateCalls();
      await mutate("my-calls-stats");
      await mutate((key) => typeof key === "string" && key.startsWith("my-calls"));
      closeBulkDialog();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to bulk mark done");
    } finally {
      setBulkActionDialog((prev) => ({ ...prev, working: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]">
              <Phone className="w-6 h-6 text-[var(--groups1-text)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Calls Manager</h1>
              <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">Manage assigned calls and mark them done.</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs + Filter Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
          variant={state === "QUEUED" && !showFollowUps ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowFollowUps(false);
            setState("QUEUED");
            setPage(1);
          }}
          className={cn(
            "justify-start",
            state === "QUEUED" && !showFollowUps
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              : "border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Pending
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold text-current dark:bg-white/10">
            {counts.pending}
          </span>
        </Button>
          <Button
          variant={state === "DONE" && !showFollowUps ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowFollowUps(false);
            setState("DONE");
            setPage(1);
          }}
          className={cn(
            "justify-start",
            state === "DONE" && !showFollowUps
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              : "border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Completed
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold text-current dark:bg-white/10">
            {counts.completed}
          </span>
        </Button>
          <Button
          variant={showFollowUps ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowFollowUps((prev) => !prev);
            setState(null);
            setPage(1);
          }}
          className={cn(
            "justify-start",
            showFollowUps
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              : "border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Follow-ups
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold text-current dark:bg-white/10">
            {counts.followUps}
          </span>
        </Button>
        </div>
        <div className="flex items-center justify-end">
          <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters((prev) => !prev)} />
        </div>
      </div>

      <CollapsibleFilters open={showFilters} contentClassName="py-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Search
            </label>
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--groups1-text-secondary)]" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by student name, email, or phone"
                className={cn("pl-9", "bg-[var(--groups1-surface)]")}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Group
            </label>
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setCallListId("");
                setPage(1);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-sm rounded-md border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              )}
            >
              <option value="">All groups</option>
              {(groupsData ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Batch
            </label>
            <select
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value);
                setCallListId("");
                setPage(1);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-sm rounded-md border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              )}
            >
              <option value="">All batches</option>
              {(batchesData?.batches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Call List
            </label>
            <select
              value={callListId}
              onChange={(e) => {
                setCallListId(e.target.value);
                setPage(1);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-sm rounded-md border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              )}
            >
              <option value="">All call lists</option>
              {(callListsData?.callLists ?? []).map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setGroupId("");
              setBatchId("");
              setCallListId("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        </div>
      </CollapsibleFilters>

      {/* Calls Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--groups1-text)]">
                {viewLabel} ({items.length})
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--groups1-text-secondary)]">
                {showFollowUps
                  ? "Calls that need a follow-up."
                  : state === "DONE"
                    ? "Your recently completed calls."
                    : "Calls waiting for you to contact."}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent variant="groups1" className="p-0">
          {hasSelection ? (
            <div className="sticky top-0 z-10 border-b border-[var(--groups1-border)] bg-[var(--groups1-background)] px-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-[var(--groups1-text)]">{selectedCount} selected</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedItemIds(new Set())}>
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openBulkDialog("unassign")}
                    className="border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Unassign
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openBulkDialog("done")}
                    disabled={hasMissingNotesInSelection}
                    title={hasMissingNotesInSelection ? "Add caller notes for all selected rows" : undefined}
                    className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Bulk Done
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--groups1-text-secondary)] mb-3" />
              <p className="text-sm text-[var(--groups1-text-secondary)]">Loading calls...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                Failed to load calls
              </p>
              <p className="text-xs text-[var(--groups1-text-secondary)]">
                {error instanceof Error ? error.message : "Please try again later"}
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--groups1-secondary)] border border-[var(--groups1-border)] mb-4">
                <Phone className="w-8 h-8 text-[var(--groups1-text)]" />
              </div>
              <p className="text-base font-semibold text-[var(--groups1-text)] mb-2">No calls found</p>
              <p className="text-sm text-[var(--groups1-text-secondary)]">
                {showFollowUps
                  ? "No follow-ups are due right now."
                  : state === "DONE"
                    ? "No completed calls in this view."
                    : "All assigned calls are completed."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile view (cards) */}
              <div className="md:hidden p-4 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--groups1-text)]">
                    <input
                      type="checkbox"
                      aria-label="Select all calls on this page"
                      className="h-4 w-4 cursor-pointer accent-[var(--groups1-primary)]"
                      checked={isAllSelectedOnPage}
                      onChange={handleToggleSelectAllOnPage}
                    />
                    Select all on page
                  </label>
                  <span className="text-xs text-[var(--groups1-text-secondary)]">{items.length} calls</span>
                </div>
                {items.map((item) => {
                  const student = item.student;
                  const primaryPhone = student?.phones?.find((p) => p.isPrimary) || student?.phones?.[0];
                  const callerNote = callerNotes[item.id] || "";
                  const callerNoteTrimmed = callerNote.trim();
                  const followUp = followUpData[item.id];
                  const hasExistingFollowUp = item.callLog?.followUpRequired || false;
                  const hasPendingFollowUp = followUp?.followUpRequired || false;
                  const isSubmitting = submittingItemId === item.id;
                  const isDoneDisabled = isSubmitting || callerNoteTrimmed.length === 0;
                  const followUpDate = item.callLog?.followUpDate ?? followUp?.followUpDate ?? null;
                  const callListName = item.callList?.name ?? null;
                  const groupName = item.callList?.group?.name ?? null;
                  const existingCallStatus = item.callLog?.status as CallLogStatus | undefined;
                  const selectedCallStatus = callStatuses[item.id] ?? "completed";
                  const displayedStatus = existingCallStatus ?? selectedCallStatus;
                  const isSelected = selectedItemIds.has(item.id);
                  const questions = ([...(item.callList?.questions || [])] as Question[]).sort(
                    (a, b) => (a.order ?? 0) - (b.order ?? 0)
                  );

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${student?.name ?? "call"}`}
                            className="mt-1 h-4 w-4 cursor-pointer accent-[var(--groups1-primary)]"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(item.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <Link
                                  href={student?.id ? `/app/students/${student.id}` : "#"}
                                  className={cn(
                                    "block text-base font-semibold text-[var(--groups1-text)] truncate",
                                    student?.id ? "hover:underline hover:text-[var(--groups1-primary)]" : "pointer-events-none"
                                  )}
                                >
                                  {student?.name || "Unknown"}
                                </Link>
                                <div className="mt-0.5 text-xs text-[var(--groups1-text-secondary)] truncate">
                                  {callListName ? callListName : "Call list"}
                                  {groupName ? ` • ${groupName}` : ""}
                                </div>
                              </div>
                              {primaryPhone ? (
                                <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                                  <a href={`tel:${primaryPhone.phone}`}>Call</a>
                                </Button>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm">
                              {primaryPhone ? (
                                <a href={`tel:${primaryPhone.phone}`} className="text-[var(--groups1-primary)] hover:underline">
                                  {primaryPhone.phone}
                                </a>
                              ) : (
                                <span className="text-[var(--groups1-text-secondary)]">No phone</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                            Call Status
                          </label>
                          {item.callLog ? (
                            <StatusBadge variant={displayedStatus === "completed" ? "success" : "info"} size="sm">
                              {displayedStatus.replaceAll("_", " ")}
                            </StatusBadge>
                          ) : (
                            <select
                              value={selectedCallStatus}
                              onChange={(e) => handleCallStatusChange(item.id, e.target.value as CallLogStatus)}
                              disabled={isSubmitting}
                              className={cn(
                                "w-full px-3 py-2 text-[13px] rounded-lg border border-[var(--groups1-border)]",
                                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                              )}
                            >
                              <option value="completed">Completed</option>
                              <option value="no_answer">No answer</option>
                              <option value="missed">Missed</option>
                              <option value="busy">Busy</option>
                              <option value="voicemail">Voicemail</option>
                              <option value="other">Other</option>
                            </select>
                          )}
                        </div>

                        {questions.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {questions.map((q) => {
                              const short = (q.shortLabel?.trim() || q.question || "").trim();
                              return (
                                <div key={q.id} className="space-y-1">
                                  <label
                                    title={q.question}
                                    className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]"
                                  >
                                    {short || "Question"}
                                    {q.required ? <span className="text-red-500 ml-1">*</span> : null}
                                  </label>
                                  {renderQuestionInput(item, q, isSubmitting)}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                            Caller Note <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={2}
                            value={callerNote}
                            onChange={(e) => handleCallerNoteChange(item.id, e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Add caller note..."
                            className={cn(
                              "w-full resize-none rounded-lg border border-[var(--groups1-border)]",
                              "bg-[var(--groups1-surface)] p-3 text-[13px] text-[var(--groups1-text)]",
                              "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isSubmitting}
                              onClick={() => openCallerNoteEditor(item.id)}
                            >
                              Edit in modal
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[var(--groups1-background)] border-t border-[var(--groups1-border)] px-4 py-3 flex gap-2">
                        <Button
                          variant="outline"
                          className={cn("flex-1", (hasExistingFollowUp || hasPendingFollowUp) && "border-[var(--groups1-primary)]")}
                          onClick={() => handleFollowUpClick(item)}
                          disabled={isSubmitting}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Follow-up
                          {(hasExistingFollowUp || hasPendingFollowUp) && followUpDate ? (
                            <span className="ml-2 text-xs text-[var(--groups1-text-secondary)]">
                              {new Date(followUpDate).toLocaleDateString()}
                            </span>
                          ) : null}
                        </Button>
                        <Button
                          className="flex-1 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                          onClick={() => handleDone(item)}
                          disabled={isDoneDisabled}
                          title={callerNoteTrimmed.length === 0 ? "Add caller note to enable Done" : undefined}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark Done
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--groups1-card-border-inner)]">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase w-[44px]">
                      <input
                        type="checkbox"
                        aria-label="Select all calls on this page"
                        className="h-4 w-4 cursor-pointer accent-[var(--groups1-primary)]"
                        checked={isAllSelectedOnPage}
                        onChange={handleToggleSelectAllOnPage}
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Student
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Phone
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Caller Note
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Call Status
                    </th>
                    {showQuestionColumns &&
                      tableQuestions.map((q) => {
                        const heading = (q.shortLabel?.trim() || q.question || "").trim();
                        return (
                          <th
                            key={q.id}
                            title={q.question}
                            className="px-4 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase whitespace-nowrap"
                          >
                            {heading || "Question"}
                          </th>
                        );
                      })}
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Follow-up
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--groups1-border)]">
                  {items.map((item) => {
                    const student = item.student;
                    const primaryPhone = student?.phones?.find((p) => p.isPrimary) || student?.phones?.[0];
                    const callerNote = callerNotes[item.id] || "";
                    const callerNoteTrimmed = callerNote.trim();
                    const followUp = followUpData[item.id];
                    const hasExistingFollowUp = item.callLog?.followUpRequired || false;
                    const hasPendingFollowUp = followUp?.followUpRequired || false;
                    const isSubmitting = submittingItemId === item.id;
                    const isDoneDisabled = isSubmitting || callerNoteTrimmed.length === 0;
                    const followUpDate = item.callLog?.followUpDate ?? followUp?.followUpDate ?? null;
                    const callListName = item.callList?.name ?? null;
                    const groupName = item.callList?.group?.name ?? null;
                    const existingCallStatus = item.callLog?.status as CallLogStatus | undefined;
                    const selectedCallStatus = callStatuses[item.id] ?? "completed";
                    const displayedStatus = existingCallStatus ?? selectedCallStatus;
                    const isSelected = selectedItemIds.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[var(--groups1-secondary)] transition-colors"
                      >
                        <td className="py-2 px-4 align-top">
                          <input
                            type="checkbox"
                            aria-label={`Select ${student?.name ?? "call"}`}
                            className="h-4 w-4 cursor-pointer accent-[var(--groups1-primary)]"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(item.id)}
                          />
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-md bg-[var(--groups1-muted)] border border-[var(--groups1-border)]">
                              <User className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={student?.id ? `/app/students/${student.id}` : "#"}
                                  className={cn(
                                    "block text-sm font-semibold text-[var(--groups1-text)] truncate",
                                    student?.id ? "hover:underline hover:text-[var(--groups1-primary)]" : "pointer-events-none"
                                  )}
                                >
                                  {student?.name || "Unknown"}
                                </Link>
                              <div className="mt-0.5 text-xs text-[var(--groups1-text-secondary)] truncate">
                                {callListName ? callListName : "Call list"}
                                {groupName ? ` • ${groupName}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          {primaryPhone ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${primaryPhone.phone}`}
                                className="text-sm font-medium text-[var(--groups1-primary)] hover:underline"
                              >
                                {primaryPhone.phone}
                              </a>
                              <Button asChild variant="outline" size="sm" className="h-6 px-2 text-xs">
                                <a href={`tel:${primaryPhone.phone}`}>Call</a>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">N/A</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => openCallerNoteEditor(item.id)}
                            onKeyDown={(event) => {
                              if (event.metaKey || event.ctrlKey || event.altKey) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openCallerNoteEditor(item.id);
                                return;
                              }
                              if (event.key.length === 1) {
                                event.preventDefault();
                                openCallerNoteEditor(item.id, event.key);
                              }
                            }}
                            className={cn(
                              "w-full max-w-xs text-left rounded-md border border-[var(--groups1-border)]",
                              "bg-[var(--groups1-surface)] px-2.5 py-1 text-[13px]",
                              "hover:bg-[var(--groups1-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                            aria-label="Edit caller note"
                          >
                            <span className={cn("block truncate", callerNoteTrimmed ? "text-[var(--groups1-text)]" : "text-[var(--groups1-text-secondary)]")}>
                              {callerNoteTrimmed ? callerNoteTrimmed : "Add caller note..."}
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-4">
                          {item.callLog ? (
                            <StatusBadge variant={displayedStatus === "completed" ? "success" : "info"} size="sm">
                              {displayedStatus.replaceAll("_", " ")}
                            </StatusBadge>
                          ) : (
                            <select
                              value={selectedCallStatus}
                              onChange={(e) => handleCallStatusChange(item.id, e.target.value as CallLogStatus)}
                              disabled={isSubmitting}
                              className={cn(
                                "w-full max-w-[180px] px-2 py-1 text-[13px] rounded-md border border-[var(--groups1-border)]",
                                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                              )}
                            >
                              <option value="completed">Completed</option>
                              <option value="no_answer">No answer</option>
                              <option value="missed">Missed</option>
                              <option value="busy">Busy</option>
                              <option value="voicemail">Voicemail</option>
                              <option value="other">Other</option>
                            </select>
                          )}
                        </td>
                        {showQuestionColumns &&
                          tableQuestions.map((q) => {
                            const isReadOnly = !!item.callLog;
                            const value = getAnswerValue(item, q.id);

                            const cellBaseClass = cn(
                              "w-full max-w-[180px] px-2 py-1 text-[13px] rounded-md border border-[var(--groups1-border)]",
                              "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                              "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                              isSubmitting && "opacity-50 cursor-not-allowed"
                            );

                            return (
                              <td key={q.id} className="py-2 px-4 align-top">
                                {isReadOnly ? (
                                  <div
                                    title={q.question}
                                    className="max-w-[220px] text-[13px] text-[var(--groups1-text)] truncate"
                                  >
                                    {(() => {
                                      const existingAnswer = item.callLog?.answers?.find((a) => a.questionId === q.id);
                                      if (!existingAnswer) return <span className="text-[var(--groups1-text-secondary)]">—</span>;
                                      return formatAnswer(existingAnswer);
                                    })()}
                                  </div>
                                ) : q.type === "multiple_choice" ? (
                                  <select
                                    value={String(value || "")}
                                    onChange={(e) => setAnswerValue(item.id, q.id, e.target.value)}
                                    disabled={isSubmitting}
                                    className={cn(cellBaseClass, "max-w-[220px]")}
                                  >
                                    <option value="">—</option>
                                    {(q.options || []).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : q.type === "yes_no" ? (
                                  <select
                                    value={value === true ? "true" : value === false ? "false" : ""}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setAnswerValue(item.id, q.id, v === "" ? undefined : v === "true");
                                    }}
                                    disabled={isSubmitting}
                                    className={cn(cellBaseClass, "max-w-[140px]")}
                                  >
                                    <option value="">—</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                ) : q.type === "number" ? (
                                  <Input
                                    value={value === "" ? "" : String(value)}
                                    onChange={(e) => setAnswerValue(item.id, q.id, e.target.value)}
                                    disabled={isSubmitting}
                                    className={cn(cellBaseClass, "max-w-[140px]")}
                                    inputMode="decimal"
                                  />
                                ) : q.type === "date" ? (
                                  <Input
                                    type="date"
                                    value={String(value || "")}
                                    onChange={(e) => setAnswerValue(item.id, q.id, e.target.value)}
                                    disabled={isSubmitting}
                                    className={cn(cellBaseClass, "max-w-[160px]")}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() =>
                                      setTextAnswerEditor({
                                        open: true,
                                        itemId: item.id,
                                        questionId: q.id,
                                        questionLabel: q.question,
                                        draft: String(value || ""),
                                      })
                                    }
                                    className={cn(
                                      "w-full max-w-[220px] text-left rounded-md border border-[var(--groups1-border)]",
                                      "bg-[var(--groups1-surface)] px-2.5 py-1 text-[13px]",
                                      "hover:bg-[var(--groups1-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                                      "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                    title={q.question}
                                  >
                                    <span className={cn("block truncate", value ? "text-[var(--groups1-text)]" : "text-[var(--groups1-text-secondary)]")}>
                                      {value ? String(value) : "Write..."}
                                    </span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            {(hasExistingFollowUp || hasPendingFollowUp) && (
                              <StatusBadge variant="warning" size="sm">
                                Follow-up{followUpDate ? ` • ${new Date(followUpDate).toLocaleDateString()}` : ""}
                              </StatusBadge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFollowUpClick(item)}
                              disabled={isSubmitting}
                              className={cn(
                                (hasExistingFollowUp || hasPendingFollowUp) && "border-[var(--groups1-primary)]"
                              )}
                            >
                              <Calendar className="w-4 h-4 mr-1.5" />
                              Follow-up
                            </Button>
                          </div>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleDone(item)}
                              disabled={isDoneDisabled}
                              className="h-6 px-2.5 text-xs font-semibold"
                              title={callerNoteTrimmed.length === 0 ? "Add caller note to enable Done" : undefined}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                  Done
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Follow-up Modal */}
      {selectedItem && (
        <FollowUpModal
          open={isFollowUpModalOpen}
          onOpenChange={setIsFollowUpModalOpen}
          callListItem={selectedItem}
          onSave={(data) => {
            handleFollowUpSave(selectedItem.id, data);
            setIsFollowUpModalOpen(false);
          }}
        />
      )}

      <Dialog open={callerNoteEditor.open} onOpenChange={(open) => (!open ? handleCallerNoteEditorCancel() : undefined)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Caller Note</DialogTitle>
            <DialogClose onClose={handleCallerNoteEditorCancel} />
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Write a short note about the call outcome. This is required to mark the call as done.
            </p>
            <textarea
              value={callerNoteEditor.draft}
              onChange={(e) => setCallerNoteEditor((prev) => ({ ...prev, draft: e.target.value }))}
              className={cn(
                "w-full min-h-[140px] resize-y rounded-md border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] p-3 text-sm text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              )}
              placeholder="Type caller note..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCallerNoteEditorCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleCallerNoteEditorSave}
                disabled={callerNoteEditor.draft.trim().length === 0}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                Set note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={textAnswerEditor.open} onOpenChange={(open) => (!open ? handleTextAnswerEditorCancel() : undefined)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Answer</DialogTitle>
            <DialogClose onClose={handleTextAnswerEditorCancel} />
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              {textAnswerEditor.questionLabel}
            </p>
            <textarea
              value={textAnswerEditor.draft}
              onChange={(e) => setTextAnswerEditor((prev) => ({ ...prev, draft: e.target.value }))}
              className={cn(
                "w-full min-h-[140px] resize-y rounded-md border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] p-3 text-sm text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              )}
              placeholder="Type answer..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleTextAnswerEditorCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleTextAnswerEditorSave}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkActionDialog.open} onOpenChange={(open) => (!open ? closeBulkDialog() : undefined)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bulkActionDialog.type === "unassign" ? "Unassign Calls" : bulkActionDialog.type === "done" ? "Bulk Done" : "Bulk Action"}
            </DialogTitle>
            <DialogClose onClose={closeBulkDialog} />
          </DialogHeader>
          <div className="space-y-3">
            {bulkActionDialog.type === "unassign" ? (
              <p className="text-sm text-[var(--groups1-text-secondary)]">
                Unassign {selectedCount} selected call(s)? They will disappear from your Calls Manager list.
              </p>
            ) : bulkActionDialog.type === "done" ? (
              <p className="text-sm text-[var(--groups1-text-secondary)]">
                Mark {selectedCount} selected call(s) as done? This will create call logs using each row's caller note and selected status.
              </p>
            ) : null}

            {bulkActionDialog.type === "done" && hasMissingNotesInSelection ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                Caller note is required for all selected rows.
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeBulkDialog} disabled={bulkActionDialog.working}>
                Cancel
              </Button>
              {bulkActionDialog.type === "unassign" ? (
                <Button
                  variant="destructive"
                  onClick={() => void runBulkUnassign()}
                  disabled={bulkActionDialog.working}
                >
                  {bulkActionDialog.working ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Unassign
                </Button>
              ) : bulkActionDialog.type === "done" ? (
                <Button
                  onClick={() => void runBulkDone()}
                  disabled={bulkActionDialog.working || hasMissingNotesInSelection}
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                >
                  {bulkActionDialog.working ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Mark Done
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

