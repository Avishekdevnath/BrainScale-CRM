"use client";

import { useEffect, useRef, useState } from "react";
import { useStudents } from "@/hooks/useStudents";
import { cn } from "@/lib/utils";
import { Loader2, User, ChevronRight, Phone, Mail } from "lucide-react";
import type { Student } from "@/types/students.types";

interface GlobalSearchDropdownProps {
  query: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** When true, renders as a flat list (no absolute positioning) for mobile overlay */
  inline?: boolean;
}

export function GlobalSearchDropdown({ query, onSelect, onClose, inline = false }: GlobalSearchDropdownProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const { data, isLoading } = useStudents(
    query.length > 0 ? { q: query, size: 8 } : undefined
  );

  const students: Student[] = data?.students ?? [];

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard navigation (listen on document — input is outside this component)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, students.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const student = students[activeIndex];
        if (student) onSelect(student.id);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [students, activeIndex, onSelect, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (query.length === 0) return null;

  return (
    <div className={cn(
      "bg-[var(--groups1-surface)] overflow-hidden",
      inline
        ? "w-full"
        : "absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-[var(--groups1-border)] shadow-xl"
    )}>
      {isLoading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-sm text-[var(--groups1-text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching...
        </div>
      ) : students.length === 0 ? (
        <div className="py-6 text-center text-sm text-[var(--groups1-text-secondary)]">
          No students found for <span className="font-medium text-[var(--groups1-text)]">&ldquo;{query}&rdquo;</span>
        </div>
      ) : (
        <>
          <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--groups1-text-secondary)]">
            Students — {students.length} result{students.length !== 1 ? "s" : ""}
          </div>
          <ul ref={listRef} className={cn("py-1", !inline && "max-h-72 overflow-y-auto")}>
            {students.map((student, i) => {
              const primaryPhone = student.phones?.find((p) => p.isPrimary) ?? student.phones?.[0];
              const isActive = i === activeIndex;

              return (
                <li key={student.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => onSelect(student.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-[var(--groups1-secondary)]"
                        : "hover:bg-[var(--groups1-secondary)]"
                    )}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--groups1-muted)] border border-[var(--groups1-border)] flex items-center justify-center">
                      <User className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--groups1-text)] truncate">
                        {student.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {student.email && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--groups1-text-secondary)] truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            {student.email}
                          </span>
                        )}
                        {primaryPhone && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--groups1-text-secondary)]">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            {primaryPhone.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={cn(
                      "w-4 h-4 flex-shrink-0 transition-colors",
                      isActive ? "text-[var(--groups1-primary)]" : "text-[var(--groups1-text-secondary)]"
                    )} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-[var(--groups1-border)] px-3 py-2 text-[10px] text-[var(--groups1-text-secondary)] flex items-center justify-between">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[var(--groups1-muted)] border border-[var(--groups1-border)] font-mono text-[10px]">↑↓</kbd> navigate
              &nbsp;&nbsp;
              <kbd className="px-1 py-0.5 rounded bg-[var(--groups1-muted)] border border-[var(--groups1-border)] font-mono text-[10px]">↵</kbd> open
              &nbsp;&nbsp;
              <kbd className="px-1 py-0.5 rounded bg-[var(--groups1-muted)] border border-[var(--groups1-border)] font-mono text-[10px]">Esc</kbd> close
            </span>
          </div>
        </>
      )}
    </div>
  );
}
