"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkspaceMember } from "@/types/members.types";

function getMemberDisplay(member: WorkspaceMember) {
  return member.user.name?.trim() || member.user.email || member.id;
}

interface EditableMemberCellProps {
  /** Currently assigned member IDs */
  selectedIds: string[];
  members: WorkspaceMember[];
  isEditing: boolean;
  onChange: (memberIds: string[]) => void;
  /** Extra td class names */
  className?: string;
}

/**
 * A table cell that shows assigned members as pills in view mode,
 * and a searchable multi-select dropdown in edit mode.
 */
export function EditableMemberCell({
  selectedIds,
  members,
  isEditing,
  onChange,
  className = "",
}: EditableMemberCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const memberById = new Map(members.map((m) => [m.id, m]));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (memberId: string) => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter((id) => id !== memberId));
    } else {
      onChange([...selectedIds, memberId]);
    }
  };

  const filtered = members.filter((m) => {
    const display = getMemberDisplay(m).toLowerCase();
    return display.includes(search.toLowerCase());
  });

  // ── View mode ────────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <td className={`border-2 border-black px-2 py-1 text-center ${className}`}>
        <div className="flex flex-wrap justify-center gap-1 min-h-8">
          {selectedIds.length === 0 ? (
            <span className="text-slate-400">-</span>
          ) : (
            selectedIds.map((id) => {
              const member = memberById.get(id);
              const label = member ? getMemberDisplay(member) : id;
              return (
                <span
                  key={id}
                  title={id}
                  className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                >
                  {label}
                </span>
              );
            })
          )}
        </div>
      </td>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <td className={`border-2 border-black px-1 py-1 ${className}`}>
      <div ref={containerRef} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full min-h-8 text-left rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {selectedIds.length === 0 ? (
            <span className="text-slate-400">Assign…</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {selectedIds.map((id) => {
                const member = memberById.get(id);
                const label = member ? getMemberDisplay(member) : id;
                return (
                  <span
                    key={id}
                    className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800"
                  >
                    {label}
                  </span>
                );
              })}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 left-0 top-full mt-1 w-52 rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="p-1 border-b border-slate-100">
              <input
                autoFocus
                type="text"
                placeholder="Search member…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-xs text-slate-400">No members found</li>
              )}
              {filtered.map((m) => {
                const selected = selectedIds.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 ${
                        selected ? "font-semibold text-blue-700" : "text-slate-700"
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 flex-shrink-0 rounded border ${
                          selected ? "bg-blue-600 border-blue-600" : "border-slate-300"
                        }`}
                      />
                      {getMemberDisplay(m)}
                    </button>
                  </li>
                );
              })}
            </ul>
            {selectedIds.length > 0 && (
              <div className="border-t border-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="w-full rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 text-left"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </td>
  );
}
