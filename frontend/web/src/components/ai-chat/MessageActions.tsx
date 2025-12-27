"use client";

import { Copy, ThumbsUp, ThumbsDown, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  messageId: string;
  content: string;
  role: "user" | "assistant";
  onCopy?: () => void;
  onFeedback?: (messageId: string, feedback: "positive" | "negative") => void;
}

export function MessageActions({ messageId, content, role, onCopy, onFeedback }: MessageActionsProps) {
  const [showActions, setShowActions] = useState(false);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Message copied to clipboard");
      onCopy?.();
      setShowActions(false);
    } catch (err) {
      toast.error("Failed to copy message");
    }
  };

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type);
    onFeedback?.(messageId, type);
    toast.success(`Feedback ${type === "positive" ? "sent" : "recorded"}`);
    setShowActions(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setShowActions(!showActions)}
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </Button>
      {showActions && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowActions(false)}
          />
          <div className="absolute right-0 top-6 z-20 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-lg shadow-lg p-1 min-w-[140px]">
            <button
              onClick={handleCopy}
              className="w-full text-left px-3 py-2 text-sm text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] rounded flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            {role === "assistant" && (
              <>
                <button
                  onClick={() => handleFeedback("positive")}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2",
                    feedback === "positive"
                      ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                      : "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                  )}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Helpful
                </button>
                <button
                  onClick={() => handleFeedback("negative")}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2",
                    feedback === "negative"
                      ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                      : "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                  )}
                >
                  <ThumbsDown className="w-4 h-4" />
                  Not helpful
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

