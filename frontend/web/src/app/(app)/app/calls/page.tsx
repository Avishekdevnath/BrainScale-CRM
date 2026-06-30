"use client";

import { useState, useMemo } from "react";
import { CallsTable } from "@/components/calls/CallsTable";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCallLists } from "@/hooks/useCallLists";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { useWorkspaceStore } from "@/store/workspace";
import { mutate } from "swr";
import { Phone, Search, Plus, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { id: "all",       label: "All",       status: null },
  { id: "completed", label: "Completed", status: "completed" },
  { id: "missed",    label: "Missed",    status: "missed" },
  { id: "no_answer", label: "No Answer", status: "no_answer" },
  { id: "busy",      label: "Busy",      status: "busy" },
  { id: "voicemail", label: "Voicemail", status: "voicemail" },
];

export default function CallsPage() {
  usePageTitle("All Calls");

  const workspaceId = useWorkspaceStore((s) => s.current?.id ?? null);
  const { data: callListsData } = useCallLists({ page: 1, size: 200, status: "ACTIVE" });
  const { members } = useWorkspaceMembers(workspaceId);

  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [callListId, setCallListId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const callListName = useMemo(
    () => callListsData?.callLists?.find((cl) => cl.id === callListId)?.name ?? callListId,
    [callListId, callListsData]
  );
  const memberName = useMemo(() => {
    const m = members.find((m) => m.id === memberId);
    return m ? (m.user.name?.trim() || m.user.email) : memberId;
  }, [memberId, members]);

  const handleRefresh = async () => {
    await mutate((key) => typeof key === "string" && key.includes("call-logs"));
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
            <h1 className="text-xl font-bold text-[var(--groups1-text)]">All Calls</h1>
            <p className="text-xs text-[var(--groups1-text-secondary)]">All attempted and completed calls across the workspace.</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-sm border border-[var(--groups1-border)] rounded-lg px-3 py-1.5 bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl w-fit">
        {STATUS_TABS.map((tab) => {
          const active = activeStatus === tab.status;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStatus(tab.status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] shadow-sm"
                  : "text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Inline filter bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl">
        <Search className="w-4 h-4 text-[var(--groups1-text-secondary)] flex-shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]"
        />

        {callListId && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)] border border-[var(--groups1-primary)]/20 flex-shrink-0 max-w-[200px]">
            <span className="truncate">List: {callListName}</span>
            <button onClick={() => setCallListId(null)} className="hover:text-red-500 ml-0.5 flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {memberId && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)] flex-shrink-0 max-w-[180px]">
            <span className="truncate">Caller: {memberName}</span>
            <button onClick={() => setMemberId(null)} className="hover:text-red-500 ml-0.5 flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        <div className="w-px h-5 bg-[var(--groups1-border)] flex-shrink-0" />

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setFilterPopoverOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] border border-dashed border-[var(--groups1-border)] rounded-lg px-2.5 py-1.5 hover:bg-[var(--groups1-secondary)]"
          >
            <Plus className="w-3 h-3" />
            Add filter
          </button>
          {filterPopoverOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFilterPopoverOpen(false)} />
              <div className="absolute top-full right-0 mt-1.5 z-50 w-72 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl shadow-lg overflow-hidden py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] px-3 py-1.5">Filter by</div>
                <div className="px-2 pb-1">
                  <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Call List</div>
                  <select
                    value={callListId ?? ""}
                    onChange={(e) => { setCallListId(e.target.value || null); setFilterPopoverOpen(false); }}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                  >
                    <option value="">All call lists</option>
                    {(callListsData?.callLists ?? []).map((cl) => (
                      <option key={cl.id} value={cl.id}>{cl.name}</option>
                    ))}
                  </select>
                </div>
                <div className="px-2 pb-1">
                  <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Caller</div>
                  <select
                    value={memberId ?? ""}
                    onChange={(e) => { setMemberId(e.target.value || null); setFilterPopoverOpen(false); }}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                  >
                    <option value="">All callers</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.user.name?.trim() || m.user.email}</option>
                    ))}
                  </select>
                </div>
                {(callListId || memberId) && (
                  <div className="border-t border-[var(--groups1-border)] mt-1 pt-1 px-2">
                    <button
                      onClick={() => { setCallListId(null); setMemberId(null); setFilterPopoverOpen(false); }}
                      className="w-full text-left text-xs text-red-500 hover:text-red-600 px-1 py-1.5"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="flex-shrink-0 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <CallsTable
        callListId={callListId}
        searchQuery={searchQuery}
        status={activeStatus}
        assignedTo={memberId}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
