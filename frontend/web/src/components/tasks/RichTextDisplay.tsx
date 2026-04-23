"use client";

import { useMemo } from "react";
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

interface RichTextDisplayProps {
  content: string | null | undefined;
  className?: string;
  /** Render a plain 1-line truncated preview instead of full formatted HTML */
  preview?: boolean;
}

function isTiptapJson(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return parsed?.type === "doc";
  } catch {
    return false;
  }
}

function tiptapToPlainPreview(value: string): string {
  try {
    const doc = JSON.parse(value);
    const walk = (nodes: any[]): string =>
      (nodes ?? [])
        .map((n) => {
          if (n.type === "text") return n.text ?? "";
          if (n.content) return walk(n.content);
          return "";
        })
        .join("");
    return walk(doc.content ?? "").replace(/\s+/g, " ").trim();
  } catch {
    return value;
  }
}

export function RichTextDisplay({ content, className = "", preview = false }: RichTextDisplayProps) {
  const html = useMemo(() => {
    if (!content) return "";
    if (!isTiptapJson(content)) return content; // plain text fallback
    if (preview) return tiptapToPlainPreview(content);
    try {
      return generateHTML(JSON.parse(content), [StarterKit, Link]);
    } catch {
      return content;
    }
  }, [content, preview]);

  if (!html) return null;

  if (preview) {
    return (
      <span className={`line-clamp-2 text-xs text-[var(--groups1-text-secondary)] ${className}`}>
        {html}
      </span>
    );
  }

  return (
    <div
      className={`prose-preview text-sm text-[var(--groups1-text)] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
