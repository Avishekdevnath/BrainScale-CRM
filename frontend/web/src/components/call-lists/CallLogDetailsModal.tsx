"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCallDuration, formatAnswer, getStatusLabel, getStatusColor } from "@/lib/call-list-utils";
import type { CallLog } from "@/types/call-lists.types";
import { Calendar, Clock, User, Phone } from "lucide-react";

export interface CallLogDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callLog: CallLog | null;
}

export function CallLogDetailsModal({
  open,
  onOpenChange,
  callLog,
}: CallLogDetailsModalProps) {
  if (!callLog) return null;

  const statusColor = getStatusColor(callLog.status);
  const statusVariant = statusColor === "green" ? "success" : statusColor === "red" ? "error" : statusColor === "yellow" ? "warning" : "info";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call Log Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          {callLog.student && (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Student Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>{" "}
                  <span className="font-medium text-[var(--groups1-text)]">{callLog.student.name}</span>
                </div>
                {callLog.student.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{callLog.student.email}</span>
                  </div>
                )}
                {callLog.student.phones && callLog.student.phones.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Phone:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">
                      {callLog.student.phones.find(p => p.isPrimary)?.phone || callLog.student.phones[0].phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Call Information */}
          <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
            <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Call Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <StatusBadge variant={statusVariant} size="sm" className="ml-2">
                  {getStatusLabel(callLog.status)}
                </StatusBadge>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>{" "}
                <span className="font-medium text-[var(--groups1-text)]">
                  {formatCallDuration(callLog.callDuration)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Call Date:</span>{" "}
                <span className="font-medium text-[var(--groups1-text)]">
                  {new Date(callLog.callDate).toLocaleString()}
                </span>
              </div>
              {callLog.callList && (
                <div>
                  <span className="text-gray-500">Call List:</span>{" "}
                  <span className="font-medium text-[var(--groups1-text)]">
                    {callLog.callList.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Questions and Answers */}
          {callLog.answers && callLog.answers.length > 0 && (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3">
                Questions & Answers
              </h3>
              <div className="space-y-3">
                {callLog.answers.map((answer, index) => (
                  <div
                    key={index}
                    className="p-3 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-background)]"
                  >
                    <p className="text-sm font-medium text-[var(--groups1-text)] mb-1">
                      {answer.question}
                    </p>
                    <p className="text-sm text-[var(--groups1-text-secondary)]">
                      {formatAnswer(answer)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {(callLog.notes || callLog.callerNote || callLog.summaryNote) && (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3">Notes</h3>
              <div className="space-y-3 text-sm">
                {callLog.notes && (
                  <div>
                    <span className="font-medium text-[var(--groups1-text)] block mb-1">Notes:</span>
                    <p className="text-[var(--groups1-text-secondary)] whitespace-pre-wrap">
                      {callLog.notes}
                    </p>
                  </div>
                )}
                {callLog.callerNote && (
                  <div>
                    <span className="font-medium text-[var(--groups1-text)] block mb-1">Caller Note:</span>
                    <p className="text-[var(--groups1-text-secondary)] whitespace-pre-wrap">
                      {callLog.callerNote}
                    </p>
                  </div>
                )}
                {callLog.summaryNote && (
                  <div>
                    <span className="font-medium text-[var(--groups1-text)] block mb-1">AI Summary:</span>
                    <p className="text-[var(--groups1-text-secondary)] whitespace-pre-wrap">
                      {callLog.summaryNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Information */}
          {callLog.followUpRequired && (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Follow-up Information
              </h3>
              <div className="text-sm">
                <div>
                  <span className="text-gray-500">Follow-up Required:</span>{" "}
                  <span className="font-medium text-[var(--groups1-text)]">Yes</span>
                </div>
                {callLog.followUpDate && (
                  <div className="mt-1">
                    <span className="text-gray-500">Follow-up Date:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">
                      {new Date(callLog.followUpDate).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Caller Information */}
          {callLog.assignee && (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Caller Information
              </h3>
              <div className="text-sm">
                <div>
                  <span className="text-gray-500">Caller:</span>{" "}
                  <span className="font-medium text-[var(--groups1-text)]">
                    {callLog.assignee.user.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  <span className="font-medium text-[var(--groups1-text)]">
                    {callLog.assignee.user.email}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

