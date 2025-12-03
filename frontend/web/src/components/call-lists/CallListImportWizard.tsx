"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/common/FileUpload";
import { ColumnMappingTable } from "./ColumnMappingTable";
import { ImportSettingsForm } from "./ImportSettingsForm";
import { ImportResults } from "./ImportResults";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ImportPreviewResponse, CommitImportResponse } from "@/types/call-lists.types";

export interface CallListImportWizardProps {
  callListId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export function CallListImportWizard({
  callListId,
  isOpen,
  onClose,
  onSuccess,
}: CallListImportWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState({ name: '', email: '', phone: '' });
  const [importSettings, setImportSettings] = useState<{
    matchBy: 'email' | 'phone' | 'name' | 'email_or_phone';
    createNewStudents: boolean;
    skipDuplicates: boolean;
  }>({
    matchBy: 'email_or_phone',
    createNewStudents: true,
    skipDuplicates: true,
  });
  const [results, setResults] = useState<CommitImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when closing
      setCurrentStep(1);
      setFile(null);
      setPreviewData(null);
      setColumnMapping({ name: '', email: '', phone: '' });
      setImportSettings({
        matchBy: 'email_or_phone',
        createNewStudents: true,
        skipDuplicates: true,
      });
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

  // Auto-populate column mapping from suggestions
  useEffect(() => {
    if (previewData?.suggestions && !columnMapping.name) {
      setColumnMapping({
        name: previewData.suggestions.name || '',
        email: previewData.suggestions.email || '',
        phone: previewData.suggestions.phone || '',
      });
    }
  }, [previewData, columnMapping.name]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const preview = await apiClient.previewCallListImport(callListId, selectedFile);
      setPreviewData(preview);
      setCurrentStep(2);
      toast.success("File uploaded successfully. Please map the columns.");
    } catch (error: any) {
      console.error("Preview import error:", error);
      const errorMessage = error?.message || error?.error?.message || "Failed to upload file";
      setError(errorMessage);
      toast.error(errorMessage);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      // Validate column mapping
      if (!columnMapping.name) {
        toast.error("Please select a column for the Name field");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      handleCommit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.commitCallListImport(callListId, {
        importId: previewData.importId,
        columnMapping: {
          name: columnMapping.name,
          email: columnMapping.email || undefined,
          phone: columnMapping.phone || undefined,
        },
        matchBy: importSettings.matchBy,
        createNewStudents: importSettings.createNewStudents,
        skipDuplicates: importSettings.skipDuplicates,
      });

      setResults(response);
      setCurrentStep(5);
      toast.success("Import completed successfully!");
    } catch (error: any) {
      console.error("Commit import error:", error);
      const errorMessage = error?.message || error?.error?.message || "Failed to import students";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCallList = () => {
    onClose();
    onSuccess();
    router.push(`/app/call-lists/${callListId}`);
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const canProceed = () => {
    if (currentStep === 1) return !!file && !loading;
    if (currentStep === 2) return !!columnMapping.name;
    if (currentStep === 3) return true;
    if (currentStep === 4) return !loading;
    return false;
  };

  const stepLabels = [
    "Upload File",
    "Map Columns",
    "Import Settings",
    "Review",
    "Results",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Import Students to Call List</span>
            <span className="text-sm font-normal text-[var(--groups1-text-secondary)]">
              Step {currentStep} of 5
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-6">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            return (
              <div key={stepNum} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                        : "bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      isActive
                        ? "text-[var(--groups1-text)] font-medium"
                        : "text-[var(--groups1-text-secondary)]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {stepNum < 5 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      isCompleted
                        ? "bg-green-500"
                        : currentStep > stepNum
                        ? "bg-[var(--groups1-primary)]"
                        : "bg-[var(--groups1-border)]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--groups1-text-secondary)]">
                Upload a CSV or XLSX file containing student information. The file should have columns for name, email, and/or phone.
              </p>
              <FileUpload
                accept=".csv,.xlsx"
                maxSize={10 * 1024 * 1024}
                onFileSelect={handleFileSelect}
                disabled={loading}
                error={error || undefined}
              />
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-primary)]" />
                  <span className="ml-2 text-sm text-[var(--groups1-text-secondary)]">
                    Processing file...
                  </span>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && previewData && (
            <ColumnMappingTable
              headers={previewData.headers}
              previewRows={previewData.previewRows}
              suggestions={previewData.suggestions}
              mapping={columnMapping}
              onMappingChange={(mapping) => {
                setColumnMapping({
                  name: mapping.name,
                  email: mapping.email || '',
                  phone: mapping.phone || '',
                });
              }}
            />
          )}

          {currentStep === 3 && previewData && (
            <ImportSettingsForm
              matchingStats={previewData.matchingStats}
              settings={importSettings}
              onSettingsChange={setImportSettings}
            />
          )}

          {currentStep === 4 && previewData && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[var(--groups1-text)]">Review Import Settings</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-[var(--groups1-text)]">File: </span>
                  <span className="text-[var(--groups1-text-secondary)]">{file?.name} ({previewData.totalRows} rows)</span>
                </div>
                <div>
                  <span className="font-medium text-[var(--groups1-text)]">Column Mapping: </span>
                  <span className="text-[var(--groups1-text-secondary)]">
                    Name: {columnMapping.name}
                    {columnMapping.email && `, Email: ${columnMapping.email}`}
                    {columnMapping.phone && `, Phone: ${columnMapping.phone}`}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-[var(--groups1-text)]">Settings: </span>
                  <span className="text-[var(--groups1-text-secondary)]">
                    Match by: {importSettings.matchBy.replace('_', ' ')}
                    {importSettings.createNewStudents && ", Create new students"}
                    {importSettings.skipDuplicates && ", Skip duplicates"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-[var(--groups1-text)]">Expected Results: </span>
                  <span className="text-[var(--groups1-text-secondary)]">
                    {previewData.matchingStats.willMatch} matched, {previewData.matchingStats.willCreate} created, {previewData.matchingStats.willSkip} skipped
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && results && (
            <ImportResults
              results={results}
              onViewCallList={handleViewCallList}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 5 && (
          <div className="flex justify-between pt-4 border-t border-[var(--groups1-border)]">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handleBack}
              disabled={loading}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              {currentStep === 1 ? (
                "Cancel"
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </>
              )}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : currentStep === 4 ? (
                "Commit Import"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

