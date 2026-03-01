"use client";

import { Copy, ThumbsUp, ThumbsDown } from "lucide-react";
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
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
      onCopy?.();
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type);
    onFeedback?.(messageId, type);
    toast.success(type === "positive" ? "Marked as helpful" : "Feedback recorded");
  };

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-[var(--groups1-secondary)]"
        onClick={handleCopy}
        title="Copy"
      >
        <Copy className="w-3 h-3" />
      </Button>
      {role === "assistant" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 hover:bg-[var(--groups1-secondary)]",
              feedback === "positive" && "text-[var(--groups1-primary)]"
            )}
            onClick={() => handleFeedback("positive")}
            title="Helpful"
          >
            <ThumbsUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 hover:bg-[var(--groups1-secondary)]",
              feedback === "negative" && "text-red-500"
            )}
            onClick={() => handleFeedback("negative")}
            title="Not helpful"
          >
            <ThumbsDown className="w-3 h-3" />
          </Button>
        </>
      )}
    </div>
  );
}
