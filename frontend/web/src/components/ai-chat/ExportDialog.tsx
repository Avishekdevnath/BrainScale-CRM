"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ExportChatHistoryOptions, ExportAIDataOptions } from "@/types/ai-chat.types";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageCount?: number;
  chatId?: string;
}

export function ExportDialog({ open, onOpenChange, messageCount = 0, chatId }: ExportDialogProps) {
  const [exportType, setExportType] = useState<"history" | "data">("history");
  const [isExporting, setIsExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [role, setRole] = useState<"user" | "assistant" | "">("");
  const [dataType, setDataType] = useState<ExportAIDataOptions["dataType"]>("students");

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (exportType === "history") {
        if (!chatId) {
          toast.error("No chat selected");
          return;
        }

        const options: ExportChatHistoryOptions = {};
        if (dateFrom) options.dateFrom = new Date(dateFrom).toISOString();
        if (dateTo) options.dateTo = new Date(dateTo).toISOString();
        if (role) options.role = role;

        await apiClient.exportChatHistory(chatId, options);
        toast.success("Chat history exported successfully");
      } else {
        const options: ExportAIDataOptions = {
          dataType,
        };
        await apiClient.exportAIData(options);
        toast.success("Data exported successfully");
      }

      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const oneWeekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--groups1-text)]">
            Export Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--groups1-text)]">
              Export Type
            </Label>
            <div className="flex gap-2">
              <Button
                variant={exportType === "history" ? "default" : "outline"}
                size="sm"
                onClick={() => setExportType("history")}
                className="flex-1"
              >
                Chat History
              </Button>
              <Button
                variant={exportType === "data" ? "default" : "outline"}
                size="sm"
                onClick={() => setExportType("data")}
                className="flex-1"
              >
                AI Data
              </Button>
            </div>
          </div>

          {exportType === "history" ? (
            <>
              {messageCount > 0 && (
                <p className="text-xs text-[var(--groups1-text-secondary)]">
                  {messageCount} messages will be exported
                </p>
              )}

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--groups1-text)]">
                  Date Range (Optional)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-[var(--groups1-text-secondary)] mb-1 block">
                      From
                    </Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      max={today}
                      className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--groups1-text-secondary)] mb-1 block">
                      To
                    </Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      max={today}
                      min={dateFrom || undefined}
                      className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5"
                    />
                  </div>
                </div>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--groups1-text)]">
                  Filter by Role (Optional)
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant={role === "user" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRole(role === "user" ? "" : "user")}
                    className="flex-1"
                  >
                    User Only
                  </Button>
                  <Button
                    variant={role === "assistant" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRole(role === "assistant" ? "" : "assistant")}
                    className="flex-1"
                  >
                    AI Only
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[var(--groups1-text)]">
                Data Type
              </Label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value as ExportAIDataOptions["dataType"])}
                className="w-full px-3 py-2 bg-[var(--groups1-background)] border border-[var(--groups1-border)] rounded-md text-[var(--groups1-text)] focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              >
                <option value="students">Students</option>
                <option value="callLogs">Call Logs</option>
                <option value="followups">Follow-ups</option>
                <option value="callLists">Call Lists</option>
                <option value="stats">Workspace Statistics</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
              className="border-[var(--groups1-border)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary)] hover:opacity-90"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

