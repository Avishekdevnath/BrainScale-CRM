"use client";

import { Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export interface FollowUpItem {
  id: string;
  name: string;
  status: "NEW" | "IN_PROGRESS" | "FOLLOW_UP";
  due: string;
  actionType?: "call" | "email" | "whatsapp";
}

interface FollowUpListProps {
  followUps: FollowUpItem[];
  className?: string;
  onAction?: (id: string, actionType: string) => void;
}

const statusVariantMap = {
  NEW: "success" as const,
  IN_PROGRESS: "warning" as const,
  FOLLOW_UP: "info" as const,
};

const actionIcons = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
};

export function FollowUpList({
  followUps,
  className,
  onAction,
}: FollowUpListProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {followUps.map((followUp) => {
        const ActionIcon =
          followUp.actionType && actionIcons[followUp.actionType];
        return (
          <div
            key={followUp.id}
            className="flex items-center justify-between gap-3 p-3 bg-[var(--groups1-background)] rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--groups1-text)] mb-1">
                {followUp.name}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge
                  variant={statusVariantMap[followUp.status]}
                  size="sm"
                >
                  {followUp.status.replace("_", " ")}
                </StatusBadge>
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  {followUp.due}
                </span>
              </div>
            </div>
            {followUp.actionType && (
              <Button
                size="sm"
                variant={followUp.actionType === "call" ? "default" : "secondary"}
                onClick={() => onAction?.(followUp.id, followUp.actionType!)}
                className={
                  followUp.actionType === "call"
                    ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                    : "bg-[var(--groups1-secondary)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary-hover)]"
                }
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                {followUp.actionType === "call" && "Call now"}
                {followUp.actionType === "email" && "Email"}
                {followUp.actionType === "whatsapp" && "WhatsApp"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

