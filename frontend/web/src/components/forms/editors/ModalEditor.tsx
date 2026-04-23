"use client";

import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SharedRichTextEditor } from "./SharedRichTextEditor";
import { useSharedEditor } from "./EditorProvider";

export function ModalEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { editor } = useSharedEditor();

  useEffect(() => {
    if (editor && open) {
      try {
        // focus the editor when modal opens
        editor.commands.focus();
      } catch (e) {
        // ignore
      }
    }
  }, [editor, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit description</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-2">
          <SharedRichTextEditor className="min-h-[60vh]" />
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>

        <DialogClose onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default ModalEditor;
