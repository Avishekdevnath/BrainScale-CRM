"use client";

import { UserPlus, Phone, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  type: "user_added" | "call_logged" | "converted" | "status_update";
  description: string;
  timestamp: string;
}

interface ActivityListProps {
  activities: ActivityItem[];
  className?: string;
}

const activityIcons = {
  user_added: UserPlus,
  call_logged: Phone,
  converted: CheckCircle,
  status_update: Clock,
};

export function ActivityList({ activities, className }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          No activities yet
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type];
        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-bg-1)] flex items-center justify-center text-[var(--groups1-primary)]">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--groups1-text)] mb-0.5">
                {activity.description}
              </div>
              <div className="text-xs text-[var(--groups1-text-secondary)]">
                {activity.timestamp}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

