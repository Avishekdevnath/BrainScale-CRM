"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CallsTable } from "@/components/calls/CallsTable";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCallLists } from "@/hooks/useCallLists";
import { useCallLogStats } from "@/hooks/useCallLogs";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { useGroups } from "@/hooks/useGroups";
import { useFeature } from "@/hooks/usePlatformFeatures";
import { useWorkspaceStore } from "@/store/workspace";
import { mutate } from "swr";
import { Phone, Search, Plus, X, RefreshCw, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { id: "all",       label: "All",       status: null },
  { id: "completed", label: "Completed", status: "completed" },
  { id: "missed",    label: "Missed",    status: "missed" },
  { id: "no_answer", label: "No Answer", status: "no_answer" },
  { id: "busy",      label: "Busy",      status: "busy" },
  { id: "voicemail", label: "Voicemail", status: "voicemail" },
];

function CallsPageContent() {
  usePageTitle("All Calls");

  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = useWorkspaceStore((s) => s.current?.id ?? null);
  const groupsFeature = useFeature("groups");
  const { data: callListsData } = useCallLists({ page: 1, size: 200, status: "ACTIVE" });
  const { members } = useWorkspaceMembers(workspaceId);
  const { data: groups } = useGroups();

  const [activeStatus, setActiveStatus] = useState<string | null>(searchParams.get("status"));
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [callListId, setCallListId] = useState<string | null>(searchParams.get("callListId"));
  const [memberId, setMemberId] = useState<string | null>(searchParams.get("memberId"));
  const [groupId, setGroupId] = useState<string | null>(searchParams.get("groupId"));
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [callNumberFrom, setCallNumberFrom] = useState<string>(searchParams.get("callNumberFrom") || "");
  const [callNumberTo, setCallNumberTo] = useState<string>(searchParams.get("callNumberTo") || "");
  const [sortBy, setSortBy] = useState<"callDate" | "callNumber">(
    searchParams.get("sortBy") === "callNumber" ? "callNumber" : "callDate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    searchParams.get("sortOrder") === "asc" ? "asc" : "desc"
  );
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeStatus) params.set("status", activeStatus);
    if (searchQuery) params.set("q", searchQuery);
    if (callListId) params.set("callListId", callListId);
    if (memberId) params.set("memberId", memberId);
    if (groupId) params.set("groupId", groupId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (callNumberFrom) params.set("callNumberFrom", callNumberFrom);
    if (callNumberTo) params.set("callNumberTo", callNumberTo);
    if (sortBy !== "callDate") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    const newUrl = params.toString() ? `/app/calls?${params.toString()}` : "/app/calls";
    router.replace(newUrl, { scroll: false });
  }, [activeStatus, searchQuery, callListId, memberId, groupId, dateFrom, dateTo, callNumberFrom, callNumberTo, sortBy, sortOrder, router]);

  const { data: stats } = useCallLogStats({
    callListId: callListId ?? undefined,
    assignedTo: memberId ?? undefined,
    q: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    groupId: groupsFeature.enabled ? (groupId ?? undefined) : undefined,
    callNumberFrom: callNumberFrom ? Number(callNumberFrom) : undefined,
    callNumberTo: callNumberTo ? Number(callNumberTo) : undefined,
  });

  const callListLabel = useMemo(() => {
    const cl = callListsData?.callLists?.find((cl) => cl.id === callListId);
    if (!cl) return callListId;
    return cl.listNumber != null ? `#${cl.listNumber}` : cl.name;
  }, [callListId, callListsData]);
  const memberName = useMemo(() => {
    const m = members.find((m) => m.id === memberId);
    return m ? (m.user.name?.trim() || m.user.email) : memberId;
  }, [memberId, members]);

  const groupName = useMemo(
    () => (groups ?? []).find((g) => g.id === groupId)?.name ?? groupId,
    [groupId, groups]
  );

  const isNonDefaultSort = sortBy !== "callDate" || sortOrder !== "desc";

  const activeFilterCount = [
    !!callListId,
    !!memberId,
    !!(groupsFeature.enabled && groupId),
    !!(dateFrom || dateTo),
    !!(callNumberFrom || callNumberTo),
    isNonDefaultSort,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setCallListId(null);
    setMemberId(null);
    setGroupId(null);
    setDateFrom("");
    setDateTo("");
    setCallNumberFrom("");
    setCallNumberTo("");
    setSortBy("callDate");
    setSortOrder("desc");
  };

  const SORT_LABELS: Record<string, string> = {
    "callDate:desc": "Date ↓",
    "callDate:asc":  "Date ↑",
    "callNumber:desc": "Call# ↓",
    "callNumber:asc":  "Call# ↑",
  };

  const handleRefresh = async () => {
    await mutate((key) => typeof key === "string" && (key.includes("call-logs") || key.includes("call-log-stats")));
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

      {/* Tab bar with inline counts */}
      <div className="flex items-center gap-1 p-1 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl w-fit">
        {STATUS_TABS.map((tab) => {
          const active = activeStatus === tab.status;
          const count = stats
            ? tab.status === null
              ? stats.total
              : (stats as any)[tab.status]
            : null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStatus(tab.status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                active
                  ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] shadow-sm"
                  : "text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              )}
            >
              {tab.label}
              {count != null && (
                <span className={cn(
                  "text-[11px] font-bold tabular-nums",
                  active
                    ? "text-[var(--groups1-btn-primary-text)] opacity-80"
                    : "text-[var(--groups1-text-secondary)]"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search bar + filter button */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl">
        <Search className="w-4 h-4 text-[var(--groups1-text-secondary)] flex-shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="flex-shrink-0 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]">
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="w-px h-5 bg-[var(--groups1-border)] flex-shrink-0" />

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setFilterPopoverOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border transition-colors",
              activeFilterCount > 0
                ? "border-[var(--groups1-primary)]/40 bg-[var(--groups1-primary)]/8 text-[var(--groups1-primary)] hover:bg-[var(--groups1-primary)]/15"
                : "border-dashed border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            )}
          >
            <Plus className="w-3 h-3" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] text-[10px] font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterPopoverOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFilterPopoverOpen(false)} />
              <div className="absolute top-full right-0 mt-1.5 z-50 w-72 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl shadow-lg overflow-y-auto max-h-[80vh] py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] px-3 py-1.5">Filters</div>
                <div className="px-2 pb-1">
                  <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Call List</div>
                  <select
                    value={callListId ?? ""}
                    onChange={(e) => { setCallListId(e.target.value || null); setFilterPopoverOpen(false); }}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                  >
                    <option value="">All call lists</option>
                    {(callListsData?.callLists ?? []).map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.listNumber != null ? `#${cl.listNumber} – ${cl.name}` : cl.name}
                      </option>
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
                {groupsFeature.enabled && (
                  <div className="px-2 pb-1">
                    <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Group</div>
                    <select
                      value={groupId ?? ""}
                      onChange={(e) => { setGroupId(e.target.value || null); setFilterPopoverOpen(false); }}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                    >
                      <option value="">All groups</option>
                      {(groups ?? []).map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="px-2 pb-1">
                  <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Date from</div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                  />
                </div>
                <div className="px-2 pb-2">
                  <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Date to</div>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
                  />
                </div>
                <div className="border-t border-[var(--groups1-border)] mx-2 mb-1" />
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] px-3 py-1">Call # range</div>
                <div className="px-2 pb-1 flex gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">From #</div>
                    <input
                      type="number"
                      min={1}
                      value={callNumberFrom}
                      onChange={(e) => setCallNumberFrom(e.target.value)}
                      placeholder="1"
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">To #</div>
                    <input
                      type="number"
                      min={1}
                      value={callNumberTo}
                      onChange={(e) => setCallNumberTo(e.target.value)}
                      placeholder="—"
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none font-mono"
                    />
                  </div>
                </div>
                <div className="border-t border-[var(--groups1-border)] mx-2 mb-1" />
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] px-3 py-1">Sort</div>
                <div className="px-2 pb-2 grid grid-cols-2 gap-1">
                  {(["callDate:desc", "callDate:asc", "callNumber:desc", "callNumber:asc"] as const).map((key) => {
                    const active = `${sortBy}:${sortOrder}` === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          const [by, order] = key.split(':') as ['callDate' | 'callNumber', 'asc' | 'desc'];
                          setSortBy(by);
                          setSortOrder(order);
                          setFilterPopoverOpen(false);
                        }}
                        className={cn(
                          "px-2 py-1.5 text-xs rounded-lg border text-left transition-colors",
                          active
                            ? "border-[var(--groups1-primary)] bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)] font-semibold"
                            : "border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
                        )}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    );
                  })}
                </div>
                {activeFilterCount > 0 && (
                  <div className="border-t border-[var(--groups1-border)] mt-1 pt-1 px-2">
                    <button
                      onClick={() => { clearAllFilters(); setFilterPopoverOpen(false); }}
                      className="w-full text-left text-xs text-red-500 hover:text-red-600 px-1 py-1.5 rounded"
                    >
                      Clear all filters &amp; sort
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active filter chips row */}
      {(activeFilterCount > 0 || searchQuery) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)]">
              <span className="text-[var(--groups1-text-secondary)]">Search:</span> {searchQuery}
              <button onClick={() => setSearchQuery("")} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {callListId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)] border border-[var(--groups1-primary)]/25">
              <span className="opacity-70">List:</span> <span className="font-mono">{callListLabel}</span>
              <button onClick={() => setCallListId(null)} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {memberId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)]">
              <span className="text-[var(--groups1-text-secondary)]">Caller:</span> {memberName}
              <button onClick={() => setMemberId(null)} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {groupsFeature.enabled && groupId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)]">
              <span className="text-[var(--groups1-text-secondary)]">Group:</span> {groupName}
              <button onClick={() => setGroupId(null)} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {(dateFrom || dateTo) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)]">
              <span className="text-[var(--groups1-text-secondary)]">Date:</span>
              <span className="font-mono">{dateFrom || "…"} → {dateTo || "…"}</span>
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {(callNumberFrom || callNumberTo) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)]">
              <span className="text-[var(--groups1-text-secondary)]">Call#:</span>
              <span className="font-mono">#{callNumberFrom || "1"} – #{callNumberTo || "…"}</span>
              <button onClick={() => { setCallNumberFrom(""); setCallNumberTo(""); }} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {isNonDefaultSort && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)]">
              <ArrowUpDown className="w-3 h-3 text-[var(--groups1-text-secondary)]" />
              <span>{SORT_LABELS[`${sortBy}:${sortOrder}`]}</span>
              <button onClick={() => { setSortBy("callDate"); setSortOrder("desc"); }} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeFilterCount > 1 && (
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-red-500 hover:text-red-600 hover:underline px-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <CallsTable
        callListId={callListId}
        searchQuery={searchQuery}
        status={activeStatus}
        assignedTo={memberId}
        dateFrom={dateFrom || null}
        dateTo={dateTo || null}
        groupId={groupsFeature.enabled ? groupId : null}
        callNumberFrom={callNumberFrom ? Number(callNumberFrom) : null}
        callNumberTo={callNumberTo ? Number(callNumberTo) : null}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onRefresh={handleRefresh}
      />
    </div>
  );
}

export default function CallsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--groups1-text-secondary)]">Loading…</div>}>
      <CallsPageContent />
    </Suspense>
  );
}
