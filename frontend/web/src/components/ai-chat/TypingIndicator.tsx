"use client";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--groups1-primary)] to-purple-600 flex items-center justify-center shadow-sm">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
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
