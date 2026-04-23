"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

interface OverdueBannerProps {
  count: number;
}

export function OverdueBanner({ count }: OverdueBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (count === 0 || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm flex-1">
        You have{" "}
        <strong>{count}</strong>{" "}
        overdue {count === 1 ? "task" : "tasks"}.{" "}
        <Link
          href="/app/tasks/my-tasks"
          className="underline font-medium hover:opacity-80"
        >
          View My Tasks →
        </Link>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
