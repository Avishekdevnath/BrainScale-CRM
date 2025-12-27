"use client";

import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--groups1-primary)] flex items-center justify-center">
        <Bot className="w-4 h-4 text-[var(--groups1-btn-primary-text)]" />
      </div>
      <div className="bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-lg px-4 py-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-[var(--groups1-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-[var(--groups1-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-[var(--groups1-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

