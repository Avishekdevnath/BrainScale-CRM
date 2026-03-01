"use client";

import { Lightbulb } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--groups1-primary)] to-purple-600 flex items-center justify-center shadow-sm">
        <Lightbulb className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-lg px-4 py-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-[var(--groups1-primary)] rounded-full animate-bounce opacity-70" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-[var(--groups1-primary)] rounded-full animate-bounce opacity-70" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-[var(--groups1-primary)] rounded-full animate-bounce opacity-70" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-xs text-[var(--groups1-text-secondary)] mt-1.5">Brain is thinking...</p>
      </div>
    </div>
  );
}
