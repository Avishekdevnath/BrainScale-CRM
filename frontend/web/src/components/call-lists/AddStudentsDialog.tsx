"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StudentSelector } from "./StudentSelector";
import { BulkEmailPasteTab } from "./BulkEmailPasteTab";
import { CallListImportWizard } from "./CallListImportWizard";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, UserPlus, Upload } from "lucide-react";
import { useCallList } from "@/hooks/useCallLists";
import { cn } from "@/lib/utils";

export interface AddStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callListId: string;
  onSuccess?: () => void;
}

type TabType = 'select' | 'paste' | 'import';

export function AddStudentsDialog({
  open,
  onOpenChange,
  callListId,
  onSuccess,
}: AddStudentsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('select');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  // Fetch call list to get groupId and batchId
  const { data: callList } = useCallList(callListId);
  const groupId = callList?.groupId || undefined;
  const batchId = callList?.meta?.batchId || undefined;

  const handleAdd = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setAdding(true);
    try {
      const result = await apiClient.addCallListItems(callListId, {
        studentIds: selectedStudentIds,
      });
      toast.success(`Added ${result.added} ${result.added === 1 ? "student" : "students"} to call list`);
      setSelectedStudentIds([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.message || error?.error?.message || "Failed to add students";
      toast.error(errorMessage);
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    if (!adding) {
      setSelectedStudentIds([]);
      setActiveTab('select');
      onOpenChange(false);
    }
  };

  const handleSuccess = () => {
    setSelectedStudentIds([]);
    setActiveTab('select');
    onOpenChange(false);
    onSuccess?.();
  };

  const tabs: Array<{ id: TabType; label: string; icon?: React.ReactNode }> = [
    { id: 'select', label: 'Select from List' },
    { id: 'paste', label: 'Paste Emails' },
    { id: 'import', label: 'Import from File' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle>Add Students to Call List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabs */}
          <div className="border-b border-[var(--groups1-border)]">
            <nav className="flex gap-1" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-[var(--groups1-primary)] text-[var(--groups1-primary)]"
                      : "border-transparent text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:border-[var(--groups1-border)]"
                  )}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'select' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--groups1-text-secondary)]">
                  Select students to add to this call list. Only students not already in the list will be shown.
                </p>

                <StudentSelector
                  callListId={callListId}
                  selectedStudentIds={selectedStudentIds}
                  onSelectionChange={setSelectedStudentIds}
                  disabled={adding}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--groups1-border)]">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={adding}
                    className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={adding || selectedStudentIds.length === 0}
                    className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                  >
                    {adding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add {selectedStudentIds.length > 0 ? `${selectedStudentIds.length} ` : ""}Students
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'paste' && (
              <BulkEmailPasteTab
                callListId={callListId}
                groupId={groupId}
                batchId={batchId}
                onSuccess={handleSuccess}
                onCancel={handleClose}
              />
            )}

            {activeTab === 'import' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--groups1-text-secondary)]">
                  Import students from a CSV or XLSX file. The import wizard will guide you through column mapping and settings.
                </p>
                <Button
                  onClick={() => setIsImportWizardOpen(true)}
                  className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Start Import Wizard
                </Button>
              </div>
            )}
          </div>
        </div>

        <CallListImportWizard
          callListId={callListId}
          isOpen={isImportWizardOpen}
          onClose={() => setIsImportWizardOpen(false)}
          onSuccess={() => {
            setIsImportWizardOpen(false);
            handleSuccess();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

