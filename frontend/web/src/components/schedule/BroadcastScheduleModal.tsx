"use client";

import { useState } from "react";
import { X, Mail, Loader2 } from "lucide-react";

interface BroadcastScheduleModalProps {
  isOpen: boolean;
  memberCount: number;
  isLoading?: boolean;
  onBroadcast: (formats: string[]) => Promise<void>;
  onCancel: () => void;
}

export function BroadcastScheduleModal({
  isOpen,
  memberCount,
  isLoading = false,
  onBroadcast,
  onCancel,
}: BroadcastScheduleModalProps) {
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set(["pdf"]));
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleFormat = (format: string) => {
    const newFormats = new Set(selectedFormats);
    if (newFormats.has(format)) {
      newFormats.delete(format);
    } else {
      newFormats.add(format);
    }
    setSelectedFormats(newFormats);
  };

  const handleBroadcast = async () => {
    if (selectedFormats.size === 0) {
      setError("Please select at least one format");
      return;
    }

    try {
      setError(null);
      await onBroadcast(Array.from(selectedFormats));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to broadcast schedule");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Mail size={20} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Broadcast Schedule</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Recipients info */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
            <p className="text-sm text-blue-900">
              📧 Will send to <span className="font-semibold">{memberCount} member{memberCount !== 1 ? "s" : ""}</span> assigned to this schedule
            </p>
          </div>

          {/* Format selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-900">Select formats to send:</label>

            <div className="space-y-2">
              {/* PDF */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFormats.has("pdf")}
                  onChange={() => toggleFormat("pdf")}
                  disabled={isLoading}
                  className="w-4 h-4 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">PDF Document</p>
                  <p className="text-xs text-slate-500">Professional format, easy to print</p>
                </div>
              </label>

              {/* Excel */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFormats.has("excel")}
                  onChange={() => toggleFormat("excel")}
                  disabled={isLoading}
                  className="w-4 h-4 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Excel Spreadsheet</p>
                  <p className="text-xs text-slate-500">Editable, good for data analysis</p>
                </div>
              </label>

              {/* Image */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFormats.has("image")}
                  onChange={() => toggleFormat("image")}
                  disabled={isLoading}
                  className="w-4 h-4 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">PNG Image</p>
                  <p className="text-xs text-slate-500">Share-friendly image format</p>
                </div>
              </label>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBroadcast}
            disabled={isLoading || selectedFormats.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading ? "Sending..." : "Send to Members"}
          </button>
        </div>
      </div>
    </div>
  );
}
