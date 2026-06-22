"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useMyCalls, useMyCallsStats } from "@/hooks/useMyCalls";
import { useGroups } from "@/hooks/useGroups";
import { useBatches } from "@/hooks/useBatches";
import { useCallLists } from "@/hooks/useCallLists";
import { useDebounce } from "@/hooks/useDebounce";
import { useWorkspaceStore } from "@/store/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FollowUpModal } from "@/components/calls/FollowUpModal";
import { CallHistoryModal } from "@/components/call-lists/CallHistoryModal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Phone, User, CheckCircle2, Calendar, Trash2, CheckCheck, Search, ChevronLeft, ChevronRight, History, RefreshCw, Plus, X, Bookmark, ChevronDown, Check, Pencil, MessageSquare } from "lucide-react";
import { mutate } from "swr";
import { useCallStatusOptions } from "@/hooks/useCallLists";
import type { CallListItem, CreateCallLogRequest, CallLogStatus, CallListItemState, Question, Answer, CallListStatusOption, CustomColumnDef } from "@/types/call-lists.types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatAnswer, validateCallLog } from "@/lib/call-list-utils";
import { QuestionsBuilder } from "@/components/call-lists/QuestionsBuilder";

// --- Draft persistence (localStorage) ---
const DRAFT_PREFIX = "calls-manager:drafts:";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type DraftFollowUp = {
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNote?: string;
};

type DraftEntry = {
  status?: CallLogStatus;
  answers?: Record<string, any>;
  followUp?: DraftFollowUp;
  updatedAt: number;
};

type DraftMap = Record<string, DraftEntry>;

const draftKey = (workspaceId: string) => `${DRAFT_PREFIX}${workspaceId}`;

function loadDrafts(workspaceId: string): DraftMap {
  try {
    const raw = localStorage.getItem(draftKey(workspaceId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DraftMap;
    const now = Date.now();
    const fresh: DraftMap = {};
    for (const [id, entry] of Object.entries(parsed || {})) {
      if (entry?.updatedAt && now - entry.updatedAt < DRAFT_TTL_MS) {
        fresh[id] = entry;
      }
    }
    return fresh;
  } catch {
    return {};
  }
}

function persistDrafts(workspaceId: string, drafts: DraftMap) {
  try {
    if (!Object.keys(drafts).length) {
      localStorage.removeItem(draftKey(workspaceId));
      return;
    }
    localStorage.setItem(draftKey(workspaceId), JSON.stringify(drafts));
  } catch {
    // quota / serialization — ignore
  }
}

function dropDraftIds(workspaceId: string, ids: string[]) {
  if (!ids.length) return;
  try {
    const raw = localStorage.getItem(draftKey(workspaceId));
    if (!raw) return;
    const parsed = JSON.parse(raw) as DraftMap;
    let mutated = false;
    for (const id of ids) {
      if (parsed[id]) {
        delete parsed[id];
        mutated = true;
      }
    }
    if (mutated) persistDrafts(workspaceId, parsed);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// StatusSelect — badge-style dropdown with inline "add status" input
// ---------------------------------------------------------------------------
function StatusSelect({
  value,
  onChange,
  options,
  callListId,
  onOptionAdded,
  disabled,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  options: CallListStatusOption[];
  callListId?: string;
  onOptionAdded?: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label || !callListId) return;
    setSaving(true);
    try {
      await apiClient.addCallListStatusOption(callListId, { label });
      onOptionAdded?.();
      setNewLabel("");
      toast.success(`Status "${label}" added`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add status");
    } finally {
      setSaving(false);
    }
  };

  const hex = (color: string, alpha: string) => color + alpha;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-full text-[11.5px] font-semibold px-2.5 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
        style={{
          background: selected ? hex(selected.color, "22") : "var(--groups1-secondary)",
          color: selected ? selected.color : "var(--groups1-text-secondary)",
          border: `1px solid ${selected ? hex(selected.color, "44") : "var(--groups1-border)"}`,
        }}
      >
        <span
          className="w-[5px] h-[5px] rounded-full flex-shrink-0"
          style={{ background: selected?.color ?? "var(--groups1-text-secondary)" }}
        />
        {selected?.label ?? "Set status"}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-50 w-44 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl shadow-lg overflow-hidden py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] text-left"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.value === value && <Check className="w-3.5 h-3.5 text-[var(--groups1-primary)] flex-shrink-0" />}
              </button>
            ))}
            {callListId && (
              <div className="border-t border-[var(--groups1-border)] mt-1 pt-1 px-2 pb-1.5">
                <div className="flex items-center gap-1">
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); e.stopPropagation(); }}
                    placeholder="Add status…"
                    className="flex-1 min-w-0 text-[12px] bg-transparent outline-none text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {saving
                    ? <Loader2 className="w-3 h-3 animate-spin text-[var(--groups1-text-secondary)]" />
                    : newLabel.trim() && (
                      <button type="button" onClick={() => void handleAdd()} className="text-[var(--groups1-primary)]">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CallsManagerPage() {
  usePageTitle("Calls Manager");

  const [mounted, setMounted] = useState(false);
  const [needsDefaultCallList, setNeedsDefaultCallList] = useState(false);
  useEffect(() => {
    setMounted(true);
    const savedSize = localStorage.getItem("calls-manager:pageSize");
    if (savedSize) setPageSize(Number(savedSize));
    // Restore saved view (single slot)
    try {
      const savedView = localStorage.getItem("calls-manager:saved-view");
      if (savedView) {
        const v = JSON.parse(savedView);
        if (v.groupId)         setGroupId(v.groupId);
        if (v.batchId)         setBatchId(v.batchId);
        if (v.callListId)      setCallListId(v.callListId);
        if (v.state !== undefined) setState(v.state);
        if (v.showFollowUps)   setShowFollowUps(v.showFollowUps);
      } else {
        // No saved view — will auto-select most recent call list once data loads
        setNeedsDefaultCallList(true);
      }
    } catch {
      setNeedsDefaultCallList(true);
    }
  }, []);

  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const [draftsHydrated, setDraftsHydrated] = useState(false);
  // Tracks ids that have ever been hydrated/edited, so we know which ones to
  // remove from storage when their state empties out (rather than blindly
  // overwriting the entire blob).
  const knownDraftIdsRef = useRef<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState<CallListItemState | null>("QUEUED"); // Default to pending
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [groupId, setGroupId] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("");
  const [callListId, setCallListId] = useState<string>("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftGroupId, setDraftGroupId] = useState<string>("");
  const [draftBatchId, setDraftBatchId] = useState<string>("");
  const [draftCallListId, setDraftCallListId] = useState<string>("");
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
  const [historyItem, setHistoryItem] = useState<CallListItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [columnsEditMode, setColumnsEditMode] = useState(false);
  const [columnModal, setColumnModal] = useState<{ label: string; shortLabel: string; type: string; selectOptions: string[] } | null>(null);
  const [savingColumn, setSavingColumn] = useState(false);
  const [questionsModalOpen, setQuestionsModalOpen] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);
  const [savingQuestions, setSavingQuestions] = useState(false);

  const { data: stats } = useMyCallsStats();
  const { data: groupsData } = useGroups();
  const { data: batchesData } = useBatches({ page: 1, size: 200, isActive: true });
  const { data: callListsData, mutate: mutateCallLists } = useCallLists({
    page: 1,
    size: 200,
    status: "ACTIVE",
    groupId: groupId || undefined,
    batchId: batchId || undefined,
  });
  const { data: workspaceStatusOptions = [] } = useCallStatusOptions();

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
    } else if (state === "QUEUED") {
      // Pending tab: show both QUEUED and CALLING items so the count matches the stats badge
      params.states = "QUEUED,CALLING";
    } else {
      // Other state filters (e.g. DONE)
      params.state = state;
    }
    
    return params;
  }, [page, pageSize, state, showFollowUps, debouncedSearchQuery, groupId, batchId, callListId]);

  const { data, isLoading, error, mutate: mutateCalls } = useMyCalls(apiParams);

  const items = data?.items || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? items.length;
  const totalPages = pagination?.totalPages ?? 1;
  const fromItem = items.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const toItem = Math.min(page * pageSize, totalItems);
  const pageItemIds = useMemo(() => items.map((item) => item.id), [items]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (page > 3) pages.push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    if (pages[pages.length - 1] !== totalPages) pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const tableQuestions = useMemo(() => {
    const callListIds = new Set(items.map((i) => i.callListId).filter(Boolean));
    if (callListIds.size !== 1) return [];

    const firstWithCallList = items.find((i) => i.callList && i.callListId);
    const rawQuestions = (firstWithCallList?.callList?.questions || []) as Question[];
    return [...rawQuestions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [items]);

  const showQuestionColumns = tableQuestions.length > 0;

  const tableColumns = useMemo((): CustomColumnDef[] => {
    if (!callListId) return [];
    const cl = callListsData?.callLists?.find((c) => c.id === callListId);
    return (cl?.columns ?? items[0]?.callList?.columns ?? []) as CustomColumnDef[];
  }, [callListId, callListsData, items]);

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
    setFilterPopoverOpen(false);
  }, [page, state, showFollowUps, debouncedSearchQuery, groupId, batchId, callListId]);

  // Auto-select most recent call list if no saved view
  useEffect(() => {
    if (!needsDefaultCallList) return;
    if (!callListsData?.callLists?.length) return;
    if (callListId) return;
    setCallListId(callListsData.callLists[0].id);
    setNeedsDefaultCallList(false);
  }, [needsDefaultCallList, callListsData, callListId]);

  // Hydrate drafts from localStorage when workspace becomes available
  useEffect(() => {
    if (!workspaceId) return;
    setDraftsHydrated(false);
    const drafts = loadDrafts(workspaceId);

    const answers: Record<string, Record<string, any>> = {};
    const statuses: Record<string, CallLogStatus> = {};
    const followUps: Record<string, DraftFollowUp> = {};

    for (const [itemId, entry] of Object.entries(drafts)) {
      knownDraftIdsRef.current.add(itemId);
      if (entry.answers && Object.keys(entry.answers).length > 0) {
        answers[itemId] = entry.answers;
      }
      if (entry.status !== undefined) {
        statuses[itemId] = entry.status;
      }
      if (entry.followUp) {
        followUps[itemId] = entry.followUp;
      }
    }

    setItemAnswers(answers);
    setCallStatuses(statuses);
    setFollowUpData(followUps);
    persistDrafts(workspaceId, drafts); // re-write with stale entries pruned
    setDraftsHydrated(true);
  }, [workspaceId]);

  // Persist drafts whenever any tracked state changes (debounced)
  useEffect(() => {
    if (!workspaceId || !draftsHydrated) return;
    const handle = setTimeout(() => {
      const ids = new Set<string>([
        ...Object.keys(itemAnswers),
        ...Object.keys(callStatuses),
        ...Object.keys(followUpData),
        ...knownDraftIdsRef.current,
      ]);
      const next: DraftMap = {};
      const now = Date.now();
      for (const id of ids) {
        const ans = itemAnswers[id];
        const st = callStatuses[id];
        const fu = followUpData[id];
        const hasAnswers = ans && Object.keys(ans).length > 0;
        const hasStatus = st !== undefined;
        const hasFollowUp = fu !== undefined;
        if (!hasAnswers && !hasStatus && !hasFollowUp) {
          knownDraftIdsRef.current.delete(id);
          continue;
        }
        knownDraftIdsRef.current.add(id);
        next[id] = {
          ...(hasAnswers ? { answers: ans } : {}),
          ...(hasStatus ? { status: st } : {}),
          ...(hasFollowUp ? { followUp: fu } : {}),
          updatedAt: now,
        };
      }
      persistDrafts(workspaceId, next);
    }, 350);
    return () => clearTimeout(handle);
  }, [workspaceId, draftsHydrated, itemAnswers, callStatuses, followUpData]);

  // Warn before leaving the page if drafts exist
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const hasDraft =
        Object.keys(itemAnswers).length > 0 ||
        Object.keys(callStatuses).length > 0 ||
        Object.keys(followUpData).length > 0;
      if (hasDraft) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [itemAnswers, callStatuses, followUpData]);

  const clearDraftForItems = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      ids.forEach((id) => knownDraftIdsRef.current.delete(id));
      if (workspaceId) dropDraftIds(workspaceId, ids);
    },
    [workspaceId]
  );

  const itemHasDraft = useCallback(
    (id: string) => {
      const ans = itemAnswers[id];
      return (
        (ans && Object.keys(ans).length > 0) ||
        callStatuses[id] !== undefined ||
        followUpData[id] !== undefined
      );
    },
    [itemAnswers, callStatuses, followUpData]
  );

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

  const viewLabel = showFollowUps
    ? "Follow-ups"
    : state === "DONE"
      ? "Completed"
      : "Pending";

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

    setSubmittingItemId(item.id);
    try {
      const followUp = followUpData[item.id];
      const itemStatusOptions: CallListStatusOption[] =
        (item.callList?.statusOptions as CallListStatusOption[] | undefined)?.length
          ? (item.callList?.statusOptions as CallListStatusOption[])
          : workspaceStatusOptions.map((o) => ({ value: o.value, label: o.label, color: o.color }));
      const defaultStatus = itemStatusOptions[0]?.value ?? "completed";
      const selectedStatus = callStatuses[item.id] ?? defaultStatus;
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
      clearDraftForItems([item.id]);

      // Refresh data - force refresh to update follow-ups list
      await mutateCalls();
      await mutate(`${workspaceId}:my-calls-stats`);
      await mutate((key) => typeof key === "string" && key.startsWith(`${workspaceId}:my-calls`));
      
      // If we're viewing follow-ups, the list should update automatically
      // The API will return items with followUpRequired: true from their call logs
    } catch (error: any) {
      console.error("Failed to complete call:", error);
      toast.error(error?.message || "Failed to complete call");
    } finally {
      setSubmittingItemId(null);
    }
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

  const handleSaveView = () => {
    try {
      localStorage.setItem("calls-manager:saved-view", JSON.stringify({ groupId, batchId, callListId, state, showFollowUps }));
    } catch { /* ignore */ }
    toast.success("View saved");
  };

  const handleDeleteColumn = async (key: string) => {
    if (!callListId) return;
    try {
      await apiClient.removeCallListColumn(callListId, key);
      await mutateCallLists();
      toast.success("Column removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove column");
    }
  };

  const handleAddColumn = async () => {
    if (!callListId || !columnModal?.label.trim()) return;
    setSavingColumn(true);
    try {
      const options = columnModal.type === "select" && columnModal.selectOptions.length > 0
        ? columnModal.selectOptions.map(s => s.trim()).filter(Boolean)
        : undefined;
      await apiClient.addCallListColumn(callListId, {
        label: columnModal.label.trim(),
        shortLabel: columnModal.shortLabel.trim() || undefined,
        type: columnModal.type,
        options,
      });
      await mutateCallLists();
      setColumnModal(null);
      toast.success("Column added");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add column");
    } finally {
      setSavingColumn(false);
    }
  };

  const handleOpenQuestionsModal = () => {
    const cl = callListsData?.callLists?.find(c => c.id === callListId);
    const existing = (cl?.questions || (cl?.meta as any)?.questions || []) as Question[];
    setDraftQuestions([...existing]);
    setQuestionsModalOpen(true);
  };

  const handleSaveQuestions = async () => {
    if (!callListId) return;
    setSavingQuestions(true);
    try {
      await apiClient.updateCallList(callListId, { questions: draftQuestions });
      await mutateCallLists();
      await mutateCalls();
      setQuestionsModalOpen(false);
      toast.success("Questions saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save questions");
    } finally {
      setSavingQuestions(false);
    }
  };

  const openBulkDialog = (type: "done" | "unassign") => {
    if (!hasSelection) return;
    // Caller notes are now optional for bulk actions
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

      // Drop drafts for the unassigned items (they leave this user's queue).
      const unassignedIds = Object.values(itemsByList).flat();
      if (unassignedIds.length > 0) {
        const removeSet = new Set(unassignedIds);
        const stripById = <T,>(obj: Record<string, T>) => {
          const next: Record<string, T> = {};
          for (const [id, val] of Object.entries(obj)) {
            if (!removeSet.has(id)) next[id] = val;
          }
          return next;
        };
        setItemAnswers((prev) => stripById(prev));
        setCallStatuses((prev) => stripById(prev));
        setFollowUpData((prev) => stripById(prev));
        clearDraftForItems(unassignedIds);
      }

      setSelectedItemIds(new Set());
      await mutateCalls();
      await mutate(`${workspaceId}:my-calls-stats`);
      await mutate((key) => typeof key === "string" && key.startsWith(`${workspaceId}:my-calls`));
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
    // Caller notes are now optional

    setBulkActionDialog((prev) => ({ ...prev, working: true }));
    try {
      const concurrency = 5;
      let completed = 0;
      let failed = 0;
      const errorMessages: string[] = [];
      const selectedItemsCopy = [...selectedItems];
      const completedIds: string[] = [];

      const worker = async () => {
        while (selectedItemsCopy.length > 0) {
          const item = selectedItemsCopy.shift();
          if (!item) return;
          const followUp = followUpData[item.id];
          const itemOpts: CallListStatusOption[] =
            (item.callList?.statusOptions as CallListStatusOption[] | undefined)?.length
              ? (item.callList?.statusOptions as CallListStatusOption[])
              : workspaceStatusOptions.map((o) => ({ value: o.value, label: o.label, color: o.color }));
          const selectedStatus = callStatuses[item.id] ?? (itemOpts[0]?.value ?? "completed");
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
            followUpRequired: followUp?.followUpRequired || false,
            followUpDate:
              followUp?.followUpRequired && followUp?.followUpDate ? new Date(followUp.followUpDate).toISOString() : undefined,
            followUpNote:
              followUp?.followUpRequired && followUp?.followUpNote ? followUp.followUpNote : undefined,
          };

          await apiClient.createCallLog(payload);
          completed += 1;
          completedIds.push(item.id);
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

      // Clear local + persisted drafts only for items that actually succeeded.
      // Keep drafts for failures so the user doesn't lose their work on retry.
      if (completedIds.length > 0) {
        const completedSet = new Set(completedIds);
        const stripById = <T,>(obj: Record<string, T>) => {
          const next: Record<string, T> = {};
          for (const [id, val] of Object.entries(obj)) {
            if (!completedSet.has(id)) next[id] = val;
          }
          return next;
        };
        setItemAnswers((prev) => stripById(prev));
        setCallStatuses((prev) => stripById(prev));
        setFollowUpData((prev) => stripById(prev));
        clearDraftForItems(completedIds);
      }

      setSelectedItemIds(new Set());
      await mutateCalls();
      await mutate(`${workspaceId}:my-calls-stats`);
      await mutate((key) => typeof key === "string" && key.startsWith(`${workspaceId}:my-calls`));
      closeBulkDialog();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to bulk mark done");
    } finally {
      setBulkActionDialog((prev) => ({ ...prev, working: false }));
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]">
            <Phone className="w-5 h-5 text-[var(--groups1-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--groups1-text)]">My Calls</h1>
            <p className="text-xs text-[var(--groups1-text-secondary)]">Manage assigned calls and mark them done.</p>
          </div>
        </div>
        <button
          onClick={() => { void mutateCalls(); void mutate("my-calls-stats"); }}
          className="flex items-center gap-1.5 text-sm border border-[var(--groups1-border)] rounded-lg px-3 py-1.5 bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl w-fit">
        {[
          { id: "pending", label: "Pending", count: counts.pending, active: state === "QUEUED" && !showFollowUps, onClick: () => { setShowFollowUps(false); setState("QUEUED"); setPage(1); } },
          { id: "completed", label: "Completed", count: counts.completed, active: state === "DONE" && !showFollowUps, onClick: () => { setShowFollowUps(false); setState("DONE"); setPage(1); } },
          { id: "followups", label: "Follow-ups", count: counts.followUps, active: showFollowUps, onClick: () => { setShowFollowUps(true); setState(null); setPage(1); } },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={tab.onClick}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab.active
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] shadow-sm"
                : "text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            )}
          >
            {tab.label}
            <span className={cn(
              "text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              tab.active ? "bg-white/20 text-current" : "bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Unified filter bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl">
        <Search className="w-4 h-4 text-[var(--groups1-text-secondary)] flex-shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Search by name, email, or phone..."
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]"
        />

        {/* Active filter chips */}
        {groupId && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)] flex-shrink-0">
            Group: {(groupsData ?? []).find(g => g.id === groupId)?.name ?? groupId}
            <button onClick={() => { setGroupId(""); setPage(1); }} className="hover:text-red-500 ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {batchId && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)] flex-shrink-0">
            Batch: {batchesData?.batches?.find(b => b.id === batchId)?.name ?? batchId}
            <button onClick={() => { setBatchId(""); setPage(1); }} className="hover:text-red-500 ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {callListId && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)] border border-[var(--groups1-primary)]/20 flex-shrink-0 max-w-[200px]">
            <span className="truncate">List: {callListsData?.callLists?.find(cl => cl.id === callListId)?.name ?? callListId}</span>
            <button onClick={() => { setCallListId(""); setPage(1); }} className="hover:text-red-500 ml-0.5 flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--groups1-border)] flex-shrink-0" />

        {/* Add filter popover */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => {
              setDraftGroupId(groupId);
              setDraftBatchId(batchId);
              setDraftCallListId(callListId);
              setFilterPopoverOpen(v => !v);
            }}
            className="flex items-center gap-1 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] border border-dashed border-[var(--groups1-border)] rounded-lg px-2.5 py-1.5 hover:bg-[var(--groups1-secondary)]"
          >
            <Plus className="w-3 h-3" />
            Add filter
          </button>
          {filterPopoverOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFilterPopoverOpen(false)} />
              <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl shadow-lg overflow-hidden py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] px-3 py-1.5">Filter by</div>
                {/* Group */}
                <div className="px-2 pb-1">
                  <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Group</div>
                  <select
                    value={draftGroupId}
                    onChange={(e) => { setDraftGroupId(e.target.value); setDraftCallListId(""); }}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                  >
                    <option value="">All groups</option>
                    {(groupsData ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                {/* Batch */}
                <div className="px-2 pb-1">
                  <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Batch</div>
                  <select
                    value={draftBatchId}
                    onChange={(e) => { setDraftBatchId(e.target.value); setDraftCallListId(""); }}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                  >
                    <option value="">All batches</option>
                    {(batchesData?.batches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                {/* Call List */}
                <div className="px-2 pb-1">
                  <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Call List</div>
                  <select
                    value={draftCallListId}
                    onChange={(e) => setDraftCallListId(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                  >
                    <option value="">All call lists</option>
                    {(callListsData?.callLists ?? []).map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                  </select>
                </div>
                <div className="border-t border-[var(--groups1-border)] mt-1 pt-2 px-2 pb-1 flex items-center gap-2">
                  {(draftGroupId || draftBatchId || draftCallListId) && (
                    <button
                      onClick={() => { setDraftGroupId(""); setDraftBatchId(""); setDraftCallListId(""); }}
                      className="text-xs text-red-500 hover:text-red-600 px-1 py-1.5"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setGroupId(draftGroupId);
                      setBatchId(draftBatchId);
                      setCallListId(draftCallListId);
                      setPage(1);
                      setFilterPopoverOpen(false);
                    }}
                    className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Match count */}
        <span className="ml-auto flex-shrink-0 text-sm text-[var(--groups1-text-secondary)]">
          <span className="font-semibold text-[var(--groups1-text)]">{totalItems}</span> matches
        </span>

        {/* Clear search */}
        {searchQuery && (
          <button onClick={() => { setSearchQuery(""); setPage(1); }} className="flex-shrink-0 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]">
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Save view */}
        <button
          onClick={handleSaveView}
          className="flex-shrink-0 flex items-center gap-1 text-xs border border-[var(--groups1-border)] rounded-lg px-2.5 py-1.5 bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)]"
          title="Save current filters as default view"
        >
          <Bookmark className="w-3 h-3" />
          Save view
        </button>

        {/* Edit Columns — only when a single call list is selected */}
        {callListId && (
          <button
            onClick={() => { setColumnsEditMode(v => !v); setColumnModal(null); }}
            className={cn(
              "flex-shrink-0 flex items-center gap-1 text-xs border rounded-lg px-2.5 py-1.5",
              columnsEditMode
                ? "border-[var(--groups1-primary)] bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)]"
                : "border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)]"
            )}
            title="Edit custom columns for this call list"
          >
            {columnsEditMode
              ? <><Check className="w-3 h-3" />Done</>
              : <><Pencil className="w-3 h-3" />Edit</>}
          </button>
        )}

        {/* Edit Questions — only when a single call list is selected */}
        {callListId && (
          <button
            onClick={handleOpenQuestionsModal}
            className="flex-shrink-0 flex items-center gap-1 text-xs border border-[var(--groups1-border)] rounded-lg px-2.5 py-1.5 bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)]"
            title="Edit questions for this call list"
          >
            <MessageSquare className="w-3 h-3" />
            Questions
          </button>
        )}
      </div>

      {/* Calls Table */}
      <Card variant="groups1">
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
                    disabled={!hasSelection}
                    className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Bulk Done
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {!mounted || isLoading ? (
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
                  <span className="text-xs text-[var(--groups1-text-secondary)]">
                    Showing {fromItem}-{toItem} of {totalItems}
                  </span>
                </div>
                {items.map((item) => {
                  const student = item.student;
                  const primaryPhone = student?.phones?.find((p) => p.isPrimary) || student?.phones?.[0];
                  const followUp = followUpData[item.id];
                  const hasExistingFollowUp = item.callLog?.followUpRequired || false;
                  const hasPendingFollowUp = followUp?.followUpRequired || false;
                  const isSubmitting = submittingItemId === item.id;
                  const isDoneDisabled = isSubmitting;
                  const followUpDate = item.callLog?.followUpDate ?? followUp?.followUpDate ?? null;
                  const callListName = item.callList?.name ?? null;
                  const groupName = item.callList?.group?.name ?? null;
                  const existingCallStatus = item.callLog?.status as CallLogStatus | undefined;
                  const mobileStatusOpts: CallListStatusOption[] =
                    (item.callList?.statusOptions as CallListStatusOption[] | undefined)?.length
                      ? (item.callList?.statusOptions as CallListStatusOption[])
                      : workspaceStatusOptions.map((o) => ({ value: o.value, label: o.label, color: o.color }));
                  const selectedCallStatus = callStatuses[item.id] ?? (mobileStatusOpts[0]?.value ?? "completed");
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
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={student?.id ? `/app/students/${student.id}` : "#"}
                                    className={cn(
                                      "block text-base font-semibold text-[var(--groups1-text)] truncate",
                                      student?.id ? "hover:underline hover:text-[var(--groups1-primary)]" : "pointer-events-none"
                                    )}
                                  >
                                    {student?.name || "Unknown"}
                                  </Link>
                                  {!item.callLog && itemHasDraft(item.id) ? (
                                    <span
                                      title="Unsaved draft — saved locally"
                                      className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                    >
                                      Draft
                                    </span>
                                  ) : null}
                                </div>
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
                            (() => {
                              const opt = mobileStatusOpts.find((o) => o.value === displayedStatus);
                              const color = opt?.color ?? "#6b7280";
                              return (
                                <span style={{
                                  background: color + "22", color,
                                  border: `1px solid ${color}44`,
                                  padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                                  {opt?.label ?? displayedStatus.replace(/_/g, " ")}
                                </span>
                              );
                            })()
                          ) : (
                            <StatusSelect
                              value={callStatuses[item.id]}
                              onChange={(v) => handleCallStatusChange(item.id, v as CallLogStatus)}
                              options={mobileStatusOpts}
                              callListId={item.callListId ?? undefined}
                              onOptionAdded={() => { void mutateCalls(); void mutateCallLists(); }}
                              disabled={isSubmitting}
                            />
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

                      </div>

                      <div className="bg-[var(--groups1-background)] border-t border-[var(--groups1-border)] px-4 py-3 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setHistoryItem(item); setIsHistoryModalOpen(true); }}
                          className="px-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-primary)] hover:bg-[var(--groups1-secondary)]"
                          title="Call history"
                        >
                          <History className="w-4 h-4" />
                        </Button>
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
                  <tr className="border-b border-[var(--groups1-border)] bg-[var(--groups1-background)]">
                    <th className="px-3 py-2 w-[44px]">
                      <input
                        type="checkbox"
                        aria-label="Select all calls on this page"
                        className="h-4 w-4 cursor-pointer accent-[var(--groups1-primary)]"
                        checked={isAllSelectedOnPage}
                        onChange={handleToggleSelectAllOnPage}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">Student</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">Phone</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">Status</th>
                    {tableQuestions.length > 0 ? tableQuestions.map((q) => (
                      <th key={q.id} className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap w-[150px]">
                        {q.shortLabel?.trim() || q.question || "Question"}
                      </th>
                    )) : (
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider w-[150px]">
                        Reason
                      </th>
                    )}
                    {/* Custom columns — before Follow-up */}
                    {tableColumns.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap" title={col.label}>
                        {columnsEditMode ? (
                          <div className="flex items-center gap-1">
                            <span>{col.shortLabel || col.label}</span>
                            <button
                              onClick={() => handleDeleteColumn(col.key)}
                              className="ml-1 text-red-400 hover:text-red-600 rounded"
                              title={`Remove "${col.label}"`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (col.shortLabel || col.label)}
                      </th>
                    ))}
                    {/* Add column button (edit mode only) */}
                    {columnsEditMode && (
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                        <button
                          onClick={() => setColumnModal({ label: "", shortLabel: "", type: "text", selectOptions: [] })}
                          className="flex items-center gap-0.5 text-[var(--groups1-primary)] hover:text-[var(--groups1-primary-hover)] whitespace-nowrap border border-dashed border-[var(--groups1-primary)]/40 rounded px-1.5 py-0.5"
                        >
                          <Plus className="w-3 h-3" />Add
                        </button>
                      </th>
                    )}
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">Follow-up</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--groups1-border)]">
                  {items.map((item) => {
                    const student = item.student;
                    const primaryPhone = student?.phones?.find((p) => p.isPrimary) || student?.phones?.[0];
                    const followUp = followUpData[item.id];
                    const hasExistingFollowUp = item.callLog?.followUpRequired || false;
                    const hasPendingFollowUp = followUp?.followUpRequired || false;
                    const isSubmitting = submittingItemId === item.id;
                    const followUpDate = item.callLog?.followUpDate ?? followUp?.followUpDate ?? null;
                    const callListName = item.callList?.name ?? null;
                    const groupName = item.callList?.group?.name ?? null;
                    const existingCallStatus = item.callLog?.status as CallLogStatus | undefined;
                    const localStatus = callStatuses[item.id];
                    const isSelected = selectedItemIds.has(item.id);

                    // Effective status options: call-list-specific > workspace defaults
                    const effectiveStatusOptions: CallListStatusOption[] =
                      (item.callList?.statusOptions as CallListStatusOption[] | undefined)?.length
                        ? (item.callList?.statusOptions as CallListStatusOption[])
                        : workspaceStatusOptions.map((o) => ({ value: o.value, label: o.label, color: o.color }));


                    return (
                      <tr key={item.id} className="hover:bg-[var(--groups1-secondary)] transition-colors">
                        {/* Checkbox */}
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${student?.name ?? "call"}`}
                            className="h-4 w-4 cursor-pointer accent-[var(--groups1-primary)]"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(item.id)}
                          />
                        </td>

                        {/* Student */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[var(--groups1-secondary)] border border-[var(--groups1-border)] grid place-items-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-[var(--groups1-text-secondary)]" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={student?.id ? `/app/students/${student.id}` : "#"}
                                  className={cn("text-sm font-semibold text-[var(--groups1-text)] truncate max-w-[200px] block", student?.id ? "hover:underline hover:text-[var(--groups1-primary)]" : "pointer-events-none")}
                                >
                                  {student?.name || "Unknown"}
                                </Link>
                                {!item.callLog && itemHasDraft(item.id) && (
                                  <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0">Draft</span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--groups1-text-secondary)] truncate max-w-[220px]">
                                {callListName ?? "Call list"}{groupName ? ` · ${groupName}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-2 px-3">
                          {primaryPhone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-[var(--groups1-text)]">{primaryPhone.phone}</span>
                              <a
                                href={`tel:${primaryPhone.phone}`}
                                className="w-6 h-6 rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] grid place-items-center text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-primary)] hover:border-[var(--groups1-primary)]"
                                title="Call"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">N/A</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3">
                          {existingCallStatus ? (
                            (() => {
                              const opt = effectiveStatusOptions.find((o) => o.value === existingCallStatus);
                              const color = opt?.color ?? "#6b7280";
                              return (
                                <span style={{
                                  background: color + "22", color,
                                  border: `1px solid ${color}44`,
                                  padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                                  {opt?.label ?? existingCallStatus.replace(/_/g, " ")}
                                </span>
                              );
                            })()
                          ) : (
                            <StatusSelect
                              value={localStatus}
                              onChange={(v) => handleCallStatusChange(item.id, v as CallLogStatus)}
                              options={effectiveStatusOptions}
                              callListId={item.callListId ?? undefined}
                              onOptionAdded={() => { void mutateCalls(); void mutateCallLists(); }}
                              disabled={isSubmitting}
                            />
                          )}
                        </td>

                        {/* Q&A columns — one per question */}
                        {tableQuestions.length > 0 ? tableQuestions.map((q) => {
                          const answerFromLog = item.callLog?.answers?.find((a: any) => a.questionId === q.id)?.answer;
                          return (
                            <td key={q.id} className="py-2 px-3 w-[150px] max-w-[150px]">
                              {existingCallStatus ? (
                                <span className="text-sm text-[var(--groups1-text)] truncate block">
                                  {answerFromLog != null ? String(answerFromLog) : "—"}
                                </span>
                              ) : (
                                renderQuestionInput(item, q, isSubmitting)
                              )}
                            </td>
                          );
                        }) : (
                          <td className="py-2 px-3 max-w-[220px]">
                            <span className="text-sm text-[var(--groups1-text-secondary)] italic">—</span>
                          </td>
                        )}

                        {/* Custom column cells — before Follow-up */}
                        {tableColumns.map((col) => (
                          <td key={col.key} className="py-2 px-3 whitespace-nowrap">
                            <span className="text-sm text-[var(--groups1-text)]">
                              {item.custom?.[col.key] != null ? String(item.custom[col.key]) : "—"}
                            </span>
                          </td>
                        ))}
                        {columnsEditMode && <td />}

                        {/* Follow-up */}
                        <td className="py-2 px-3">
                          {(hasExistingFollowUp || hasPendingFollowUp) && followUpDate ? (
                            <button
                              onClick={() => handleFollowUpClick(item)}
                              disabled={isSubmitting}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)] border border-[var(--groups1-primary)]/25 hover:bg-[var(--groups1-primary)]/20 transition-colors"
                            >
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              {new Date(followUpDate).toLocaleDateString()}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFollowUpClick(item)}
                              disabled={isSubmitting}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--groups1-text-secondary)] border border-dashed border-[var(--groups1-border)] hover:border-[var(--groups1-primary)]/50 hover:text-[var(--groups1-primary)] transition-colors disabled:opacity-40"
                            >
                              <Calendar className="w-3 h-3" />
                              Set
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => { setHistoryItem(item); setIsHistoryModalOpen(true); }}
                              className="w-7 h-7 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] grid place-items-center text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-primary)] hover:border-[var(--groups1-primary)]"
                              title="Call history"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleDone(item)}
                              disabled={isSubmitting || !!existingCallStatus}
                              className="h-7 px-3 text-xs font-semibold bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] disabled:opacity-40"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Done</>
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

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-[var(--groups1-border)] bg-[var(--groups1-background)]">
              <div className="text-sm text-[var(--groups1-text-secondary)]">
                Showing {fromItem} to {toItem} of {totalItems} calls
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const next = parseInt(e.target.value, 10);
                    setPageSize(next);
                    localStorage.setItem("calls-manager:pageSize", String(next));
                    setPage(1);
                  }}
                  className={cn(
                    "h-9 px-2 text-sm rounded-md border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                  )}
                  aria-label="Page size"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>

                {totalPages > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {pageNumbers.map((p, i) =>
                        p === "ellipsis" ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-sm text-[var(--groups1-text-secondary)]">...</span>
                        ) : (
                          <Button
                            key={p}
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p)}
                            disabled={isLoading}
                            className={cn(
                              "h-8 w-8 p-0 text-xs",
                              p === page
                                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)] hover:bg-[var(--groups1-primary-hover)]"
                                : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                            )}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || isLoading}
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CallHistoryModal
        open={isHistoryModalOpen}
        onOpenChange={(open) => { setIsHistoryModalOpen(open); if (!open) setHistoryItem(null); }}
        callListItem={historyItem}
      />

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
                  disabled={bulkActionDialog.working}
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

      {/* Add Column Modal */}
      <Dialog open={!!columnModal} onOpenChange={(open) => { if (!open) setColumnModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Column</DialogTitle>
            <DialogClose onClose={() => setColumnModal(null)} />
          </DialogHeader>
          {columnModal && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--groups1-text)]">Full Label <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  value={columnModal.label}
                  onChange={(e) => setColumnModal(m => m ? { ...m, label: e.target.value } : m)}
                  placeholder="e.g. Student Interest Score"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                />
                <p className="text-[11px] text-[var(--groups1-text-secondary)]">Descriptive name shown in modal and tooltips</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--groups1-text)]">Short Label <span className="text-[var(--groups1-text-secondary)] font-normal">(optional)</span></label>
                <input
                  value={columnModal.shortLabel}
                  onChange={(e) => setColumnModal(m => m ? { ...m, shortLabel: e.target.value } : m)}
                  placeholder="e.g. Score"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                />
                <p className="text-[11px] text-[var(--groups1-text-secondary)]">Abbreviation shown in table column header</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--groups1-text)]">Data Type</label>
                <select
                  value={columnModal.type}
                  onChange={(e) => setColumnModal(m => m ? { ...m, type: e.target.value } : m)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select (dropdown)</option>
                </select>
              </div>
              {columnModal.type === "select" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--groups1-text)]">
                      Options <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setColumnModal(m => m ? { ...m, selectOptions: [...m.selectOptions, ""] } : m)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)]"
                    >
                      <Plus className="w-3 h-3" />Add Option
                    </button>
                  </div>
                  {columnModal.selectOptions.length === 0 ? (
                    <p className="text-[12px] text-[var(--groups1-text-secondary)] italic">No options yet — click Add Option</p>
                  ) : (
                    <div className="space-y-2">
                      {columnModal.selectOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            value={opt}
                            onChange={(e) => setColumnModal(m => {
                              if (!m) return m;
                              const next = [...m.selectOptions];
                              next[i] = e.target.value;
                              return { ...m, selectOptions: next };
                            })}
                            placeholder={`Option ${i + 1}…`}
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                          />
                          <button
                            type="button"
                            onClick={() => setColumnModal(m => m ? { ...m, selectOptions: m.selectOptions.filter((_, idx) => idx !== i) } : m)}
                            disabled={columnModal.selectOptions.length <= 1}
                            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {columnModal.selectOptions.length < 2 && columnModal.selectOptions.length > 0 && (
                    <p className="text-[11px] text-red-500">Add at least 2 options</p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setColumnModal(null)} disabled={savingColumn}>Cancel</Button>
                <Button
                  onClick={() => void handleAddColumn()}
                  disabled={savingColumn || !columnModal.label.trim() || (columnModal.type === "select" && columnModal.selectOptions.filter(s => s.trim()).length < 2)}
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                >
                  {savingColumn ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : "Add Column"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Questions Modal */}
      <Dialog open={questionsModalOpen} onOpenChange={(open) => { if (!open) setQuestionsModalOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Edit Questions — {callListsData?.callLists?.find(c => c.id === callListId)?.name ?? "Call List"}
            </DialogTitle>
            <DialogClose onClose={() => setQuestionsModalOpen(false)} />
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pb-2 pr-1">
            <QuestionsBuilder
              questions={draftQuestions}
              onChange={setDraftQuestions}
              disabled={savingQuestions}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--groups1-border)]">
            <Button variant="outline" onClick={() => setQuestionsModalOpen(false)} disabled={savingQuestions}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveQuestions()}
              disabled={savingQuestions}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {savingQuestions ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Questions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
