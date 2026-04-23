'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useRef, useEffect, useState } from 'react';
import { Bold, Italic, Link as LinkIcon, Code, List, ListOrdered, Quote } from 'lucide-react';

interface TiptapEditorProps {
  onSend: (content: any) => Promise<void>;
  placeholder?: string;
  onMentionDetected?: (usernames: string[]) => void;
  onKeyDown?: () => void;
}

/**
 * Tiptap Rich Text Editor Component
 * Provides rich text editing with formatting, links, and mentions
 */
export function TiptapEditor({
  onSend,
  placeholder = 'Send a message...',
  onMentionDetected,
  onKeyDown,
}: TiptapEditorProps) {
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    immediatelyRender: false,
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    onUpdate: ({ editor }) => {
      // Detect mentions in content
      const text = editor.getText();
      const mentionRegex = /@(\w+)/g;
      const mentions: string[] = [];
      let match;

      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
      }

      if (mentions.length > 0 && onMentionDetected) {
        onMentionDetected(mentions);
      }
    },
  });

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  const handleSend = async () => {
    const json = editor.getJSON();
    const text = editor.getText();

    if (!text.trim()) {
      setError('Message cannot be empty');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Extract mentions
      const mentionRegex = /@(\w+)/g;
      const mentionedUsers: string[] = [];
      let match;

      while ((match = mentionRegex.exec(text)) !== null) {
        mentionedUsers.push(match[1]);
      }

      await onSend(json);

      // Clear editor
      editor.commands.clearContent();
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSend();
    } else {
      onKeyDown?.();
    }
  };

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleCode = () => editor.chain().focus().toggleCode().run();
  const toggleCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border border-gray-200 rounded-t-lg bg-gray-50">
        <button
          onClick={toggleBold}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>

        <button
          onClick={toggleItalic}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>

        <button
          onClick={toggleCode}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('code') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Inline Code"
        >
          <Code size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300" />

        <button
          onClick={toggleBulletList}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Bullet List"
        >
          <List size={16} />
        </button>

        <button
          onClick={toggleOrderedList}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </button>

        <button
          onClick={toggleBlockquote}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('blockquote') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Quote"
        >
          <Quote size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300" />

        <button
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('link') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Add Link"
        >
          <LinkIcon size={16} />
        </button>
      </div>

      {/* Editor */}
      <div
        className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => editor.commands.focus()}
      >
        <EditorContent
          editor={editor}
          onKeyDown={handleKeyDown}
          className="tiptap-container"
        />
      </div>

      {/* Send Button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleSend}
          disabled={isLoading || !editor.getText().trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⟳</span>
              Sending...
            </>
          ) : (
            'Send'
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Press <kbd className="bg-gray-100 px-2 py-1 rounded">Enter</kbd> to send,{' '}
        <kbd className="bg-gray-100 px-2 py-1 rounded">Shift+Enter</kbd> for new line. Type{' '}
        <kbd className="bg-gray-100 px-2 py-1 rounded">@</kbd> to mention someone.
      </p>
    </div>
  );
}

export default TiptapEditor;
