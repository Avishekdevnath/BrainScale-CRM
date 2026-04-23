import React, { useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { useSharedEditor } from "./EditorProvider";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors cursor-pointer",
        isActive
          ? "bg-[hsl(var(--groups1-primary)/0.15)] text-[hsl(var(--groups1-primary))]"
          : "text-[var(--groups1-text-secondary)] hover:bg-[hsl(var(--groups1-primary)/0.08)] hover:text-[var(--groups1-text)]"
      )}
    >
      {children}
    </button>
  );
}

export function SharedRichTextEditor({
  className = "",
  onChange,
}: {
  className?: string;
  onChange?: (json: any) => void;
}) {
  const { editor } = useSharedEditor();

  useEffect(() => {
    if (!editor || !onChange) return;
    const handler = () => {
      try {
        onChange(editor.getJSON());
      } catch (e) {
        // ignore
      }
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, onChange]);

  if (!editor) return <div className="text-[var(--groups1-text-secondary)] text-sm p-2">Editor not initialized</div>;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
        style={{ borderColor: `var(--groups1-border)` }}
      >
        <ToolbarButton
          title="Bold (Ctrl+B)"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic (Ctrl+I)"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px" style={{ backgroundColor: `var(--groups1-border)` }} />

        <ToolbarButton
          title="Heading 1 (# + space)"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2 (## + space)"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3 (### + space)"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px" style={{ backgroundColor: `var(--groups1-border)` }} />

        <ToolbarButton
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px" style={{ backgroundColor: `var(--groups1-border)` }} />

        <ToolbarButton
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Divider line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="flex-1 px-3 py-2 overflow-y-auto"
      />
    </div>
  );
}
