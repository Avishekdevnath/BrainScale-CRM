"use client";

import * as React from "react";

/**
 * Read-only renderer for the announcement rich-text subset
 * (paragraph, heading 1-3, bullet/ordered list, hard break; bold/italic/link).
 * Renders from sanitized Tiptap JSON — never uses dangerouslySetInnerHTML.
 */

interface RichNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: RichNode[];
}

export interface RichDoc {
  type: "doc";
  content?: RichNode[];
}

function renderText(node: RichNode, key: number): React.ReactNode {
  let el: React.ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") el = <strong key={key}>{el}</strong>;
    else if (mark.type === "italic") el = <em key={key}>{el}</em>;
    else if (mark.type === "strike") el = <s key={key}>{el}</s>;
    else if (mark.type === "code")
      el = (
        <code key={key} className="rounded bg-zinc-900 text-zinc-100 px-1.5 py-0.5 font-mono text-xs">
          {el}
        </code>
      );
    else if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "");
      if (/^https?:\/\//i.test(href)) {
        el = (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--groups1-primary)] underline underline-offset-2 break-all"
          >
            {el}
          </a>
        );
      }
    }
  }
  return <React.Fragment key={key}>{el}</React.Fragment>;
}

function renderNode(node: RichNode, key: number): React.ReactNode {
  const children = (node.content ?? []).map((child, i) => renderNode(child, i));
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "hardBreak":
      return <br key={key} />;
    case "paragraph":
      return (
        <p key={key} className="min-h-[1em]">
          {children}
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const Tag = (level === 1 ? "h3" : level === 2 ? "h4" : "h5") as keyof React.JSX.IntrinsicElements;
      const size = level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-semibold" : "text-sm font-semibold";
      return (
        <Tag key={key} className={`${size} text-[var(--groups1-text)]`}>
          {children}
        </Tag>
      );
    }
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-2 border-[var(--groups1-border)] pl-3 text-[var(--groups1-text-secondary)]"
        >
          {children}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre key={key} className="rounded-lg bg-zinc-900 text-zinc-100 p-3 font-mono text-xs overflow-x-auto">
          <code>{children}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} className="border-[var(--groups1-border)] my-3" />;
    case "bulletList":
      return (
        <ul key={key} className="list-disc pl-5 space-y-0.5">
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="list-decimal pl-5 space-y-0.5">
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    default:
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}

export function RichTextView({ doc, className }: { doc: unknown; className?: string }) {
  const root = doc as RichDoc | null | undefined;
  if (!root || root.type !== "doc" || !Array.isArray(root.content)) return null;
  return (
    <div className={className ?? "space-y-2 text-sm text-[var(--groups1-text-secondary)]"}>
      {root.content.map((node, i) => renderNode(node, i))}
    </div>
  );
}

export function isRichDoc(value: unknown): value is RichDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as RichDoc).type === "doc" &&
    Array.isArray((value as RichDoc).content)
  );
}
