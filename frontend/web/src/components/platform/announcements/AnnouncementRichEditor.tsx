"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Link2, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnouncementRichEditorProps {
  onChange: (json: unknown, plainText: string) => void;
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors cursor-pointer",
        isActive
          ? "bg-[var(--groups1-primary)]/15 text-[var(--groups1-primary)]"
          : "text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-primary)]/8 hover:text-[var(--groups1-text)]"
      )}
    >
      {children}
    </button>
  );
}

export function AnnouncementRichEditor({ onChange }: AnnouncementRichEditorProps) {
  const editor = useEditor({
    extensions: [
      // Discord-style markdown input rules come with StarterKit:
      // "# " headings, "**bold**", "*italic*", "~~strike~~", "`code`",
      // "> " blockquote, "- " / "1. " lists, "---" divider.
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: "Message shown to workspace members…" }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
    ],
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getText());
    },
  });

  const setLink = () => {
    if (!editor) return;
    const existing = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…)", existing ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Only http(s) links are allowed.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] focus-within:border-[var(--groups1-primary)]">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--groups1-border)] px-2 py-1.5">
        <ToolbarButton
          title="Heading 1 (# )"
          isActive={editor?.isActive("heading", { level: 1 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2 (## )"
          isActive={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3 (### )"
          isActive={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-[var(--groups1-border)]" />
        <ToolbarButton
          title="Bold (**text**)"
          isActive={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic (*text*)"
          isActive={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough (~~text~~)"
          isActive={editor?.isActive("strike")}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Inline code (`code`)"
          isActive={editor?.isActive("code")}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code className="w-3.5 h-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-[var(--groups1-border)]" />
        <ToolbarButton
          title="Quote (> )"
          isActive={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list (- )"
          isActive={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list (1. )"
          isActive={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-[var(--groups1-border)]" />
        <ToolbarButton title="Add link" isActive={editor?.isActive("link")} onClick={setLink}>
          <Link2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Remove link" onClick={() => editor?.chain().focus().unsetLink().run()}>
          <Link2Off className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:min-h-[10rem] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-[var(--groups1-text)] [&_.ProseMirror]:outline-none [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_a]:text-[var(--groups1-primary)] [&_.ProseMirror_a]:underline [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-[var(--groups1-border)] [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-[var(--groups1-text-secondary)] [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-zinc-900 [&_.ProseMirror_code]:text-zinc-100 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-xs [&_.ProseMirror_code]:font-mono [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-zinc-900 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_pre]:text-zinc-100 [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_hr]:border-[var(--groups1-border)] [&_.ProseMirror_hr]:my-3 [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-[var(--groups1-text-secondary)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0"
      />
      <p className="border-t border-[var(--groups1-border)] px-3 py-1.5 text-[10px] text-[var(--groups1-text-secondary)]">
        Markdown shortcuts: <code># heading</code> · <code>**bold**</code> · <code>*italic*</code> · <code>~~strike~~</code> · <code>`code`</code> · <code>&gt; quote</code> · <code>- list</code> · <code>1. list</code> · <code>---</code> divider
      </p>
    </div>
  );
}
