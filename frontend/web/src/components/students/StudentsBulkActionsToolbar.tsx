"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Download } from "lucide-react";
import { AddStudentsToCallListDialog } from "./AddStudentsToCallListDialog";

export interface StudentsBulkActionsToolbarProps {
  selectedStudentIds: string[];
  onChanged?: () => void;
  onClearSelection?: () => void;
  onRequestExportSelected?: () => void;
}

export function StudentsBulkActionsToolbar({
  selectedStudentIds,
  onChanged,
  onClearSelection,
  onRequestExportSelected,
}: StudentsBulkActionsToolbarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isAddToCallListOpen, setIsAddToCallListOpen] = React.useState(false);

  const hasSelection = selectedStudentIds.length > 0;
  if (!hasSelection) return null;

  const handleConfirmDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsDeleting(true);
    try {
      const result = await apiClient.bulkDeleteStudents({ studentIds: selectedStudentIds });
      toast.success(`${result.deletedCount} student(s) deleted`);
      setIsDeleteDialogOpen(false);
      onClearSelection?.();
      onChanged?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to delete students");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-20 bg-[var(--groups1-background)] border-b border-[var(--groups1-border)] py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-[var(--groups1-text)]">
            {selectedStudentIds.length} selected
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddToCallListOpen(true)}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Call List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestExportSelected}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <AddStudentsToCallListDialog
        open={isAddToCallListOpen}
        onOpenChange={setIsAddToCallListOpen}
        studentIds={selectedStudentIds}
        onSuccess={() => {
          onClearSelection?.();
          onChanged?.();
        }}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Students</DialogTitle>
            <DialogClose onClose={() => setIsDeleteDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Delete {selectedStudentIds.length} student(s)? This is a soft delete and can’t be undone from the UI.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

