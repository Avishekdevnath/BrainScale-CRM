import React, { createContext, useContext, PropsWithChildren, useEffect } from "react";
import { Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

type EditorContextValue = {
  editor: Editor | null;
};

const EditorContext = createContext<EditorContextValue>({ editor: null });

export function EditorProvider({ children, initialContent }: PropsWithChildren<{ initialContent?: any }>) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Write a description..." }), Link.configure({ openOnClick: true })],
    content: initialContent ?? "",
    immediatelyRender: false,
  });

  // If the initialContent prop changes (e.g., loading a new form), update the editor content.
  useEffect(() => {
    if (!editor) return;
    try {
      if (initialContent) {
        const current = editor.getJSON();
        if (JSON.stringify(current) !== JSON.stringify(initialContent)) {
          editor.commands.setContent(initialContent);
        }
      }
    } catch (e) {
      // ignore malformed content
    }
  }, [editor, initialContent]);

  return <EditorContext.Provider value={{ editor }}>{children}</EditorContext.Provider>;
}

export function useSharedEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) return { editor: null };
  return ctx;
}
