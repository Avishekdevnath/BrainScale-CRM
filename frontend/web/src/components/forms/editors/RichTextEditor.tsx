import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

type RichTextEditorProps = {
  value?: any; // TipTap JSON or HTML string
  onChange?: (json: any) => void;
  placeholder?: string;
  className?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write a description...",
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: true }),
    ],
    content: value ?? "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      try {
        const json = editor.getJSON();
        onChange?.(json);
      } catch (e) {
        // swallow - validation will happen at API boundary
      }
    },
  });

  useEffect(() => {
    // if parent passes new value (deserialize), update editor
    if (!editor) return;
    if (!value) return;
    try {
      // Only update when content differs to avoid resetting selection
      const current = editor.getJSON();
      if (JSON.stringify(current) !== JSON.stringify(value)) {
        editor.commands.setContent(value);
      }
    } catch (e) {
      // ignore malformed value
    }
  }, [value, editor]);

  return (
    <div className={`rich-text-editor ${className}`}>
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="text-[var(--groups1-text-secondary)]">Loading editor...</div>
      )}
    </div>
  );
}
