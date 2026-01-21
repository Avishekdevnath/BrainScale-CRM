"use client";

import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useMyCalls, useMyCallsStats } from "@/hooks/useMyCalls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KPICard } from "@/components/ui/kpi-card";
import { FollowUpModal } from "@/components/calls/FollowUpModal";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Phone, User, CheckCircle2, Calendar } from "lucide-react";
import { mutate } from "swr";
import type { CallListItem, CreateCallLogRequest, CallLogStatus, CallListItemState } from "@/types/call-lists.types";
import { cn } from "@/lib/utils";

export default function CallsManagerPage() {
  usePageTitle("Calls Manager");
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [state, setState] = useState<CallListItemState | null>("QUEUED"); // Default to pending
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [callerNotes, setCallerNotes] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<CallListItem | null>(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const [followUpData, setFollowUpData] = useState<Record<string, {
    followUpRequired: boolean;
    followUpDate?: string;
    followUpNote?: string;
  }>>({});

  const { data: stats } = useMyCallsStats();
  
  // Build API params based on current filter
  const apiParams = useMemo(() => {
    const params: any = {
      page,
      size: pageSize,
    };
    
    if (showFollowUps) {
      // When showing follow-ups, don't filter by state, only by followUpRequired
      params.followUpRequired = true;
    } else {
      // When state is set, filter by that state (default to QUEUED)
      params.state = state || "QUEUED";
    }
    
    return params;
  }, [page, pageSize, state, showFollowUps]);
  
  const { data, isLoading, error, mutate: mutateCalls } = useMyCalls(apiParams);

  const items = data?.items || [];

  const handleCallerNoteChange = (itemId: string, note: string) => {
    setCallerNotes((prev) => ({ ...prev, [itemId]: note }));
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
      const callerNote = callerNotes[item.id]?.trim() || "";
      const followUp = followUpData[item.id];

      // Create a minimal call log
      // Note: Backend allows empty answers array if there are no required questions
      const payload: CreateCallLogRequest = {
        callListItemId: item.id,
        status: "completed" as CallLogStatus,
        answers: [], // Empty array - backend will validate if there are required questions
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
      setFollowUpData((prev) => {
        const newData = { ...prev };
        delete newData[item.id];
        return newData;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 shadow-sm">
              <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Calls Manager
              </h1>
              <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
                Manage your assigned calls - add notes and mark as done
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            label="Pending"
            value={stats.pending}
            onClick={() => {
              setShowFollowUps(false);
              setState("QUEUED");
              setPage(1);
            }}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              state === "QUEUED" && !showFollowUps 
                ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" 
                : "border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700"
            )}
          />
          <KPICard
            label="Completed"
            value={stats.completed}
            onClick={() => {
              setShowFollowUps(false);
              setState("DONE");
              setPage(1);
            }}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              state === "DONE" && !showFollowUps 
                ? "ring-2 ring-green-500 border-green-500 bg-green-50/50 dark:bg-green-950/20" 
                : "border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700"
            )}
          />
          <KPICard
            label="Follow-ups"
            value={stats.followUps || 0}
            onClick={() => {
              if (showFollowUps) {
                setShowFollowUps(false);
                setState("QUEUED");
              } else {
                setShowFollowUps(true);
                setState(null);
              }
              setPage(1);
            }}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              showFollowUps 
                ? "ring-2 ring-orange-500 border-orange-500 bg-orange-50/50 dark:bg-orange-950/20" 
                : "border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700"
            )}
          />
        </div>
      )}

      {/* Calls Table */}
      <Card variant="groups1" className="shadow-lg border-2 border-blue-200/50 dark:border-blue-800/50">
        <CardHeader variant="groups1" className="border-b-2 border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardTitle className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {showFollowUps 
              ? `Follow-ups Required (${items.length})` 
              : state === "DONE" 
                ? `Completed Calls (${items.length})` 
                : state === "QUEUED" 
                  ? `Pending Calls (${items.length})` 
                  : `My Calls (${items.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Loading your calls...</p>
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
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-700 mb-4">
                <Phone className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-base font-semibold text-blue-700 dark:text-blue-300 mb-2">
                No pending calls
              </p>
              <p className="text-sm text-[var(--groups1-text-secondary)]">
                All your assigned calls have been completed
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-r from-blue-50/30 to-purple-50/30 dark:from-blue-950/10 dark:to-purple-950/10">
                    <th className="text-left py-4 px-4 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Caller Note
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Follow-up
                    </th>
                    <th className="text-right py-4 px-4 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--groups1-border)]">
                  {items.map((item) => {
                    const student = item.student;
                    const primaryPhone = student?.phones?.find((p) => p.isPrimary) || student?.phones?.[0];
                    const callerNote = callerNotes[item.id] || "";
                    const followUp = followUpData[item.id];
                    const hasExistingFollowUp = item.callLog?.followUpRequired || false;
                    const hasPendingFollowUp = followUp?.followUpRequired || false;
                    const isSubmitting = submittingItemId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-blue-100/50 dark:border-blue-900/30 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20 transition-all duration-200"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200/50 dark:border-blue-700/50">
                              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm font-semibold text-[var(--groups1-text)]">
                              {student?.name || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {primaryPhone ? (
                            <a
                              href={`tel:${primaryPhone.phone}`}
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                            >
                              {primaryPhone.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">N/A</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Input
                            type="text"
                            placeholder="Add caller note..."
                            value={callerNote}
                            onChange={(e) => handleCallerNoteChange(item.id, e.target.value)}
                            disabled={isSubmitting}
                            className={cn(
                              "w-full max-w-xs bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700",
                              "text-[var(--groups1-text)] placeholder:text-gray-400",
                              "focus-visible:border-blue-500 dark:focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200 dark:focus-visible:ring-blue-800",
                              "transition-all"
                            )}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {/* Show existing follow-up from call log */}
                            {hasExistingFollowUp && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700">
                                <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                {item.callLog?.followUpDate && (
                                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                    {new Date(item.callLog.followUpDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Show pending follow-up from UI state (not yet saved) */}
                            {!hasExistingFollowUp && hasPendingFollowUp && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700">
                                <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                {followUp?.followUpDate && (
                                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                    {new Date(followUp.followUpDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFollowUpClick(item)}
                              disabled={isSubmitting}
                              className={cn(
                                "border-2 transition-all",
                                (hasExistingFollowUp || hasPendingFollowUp)
                                  ? "bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 shadow-sm"
                                  : "bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-400 dark:hover:border-blue-600"
                              )}
                            >
                              <Calendar className="w-4 h-4 mr-1.5" />
                              Follow-up
                            </Button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDone(item)}
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all font-semibold"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                Done
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}

