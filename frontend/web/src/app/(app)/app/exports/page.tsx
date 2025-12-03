"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportColumnSelector } from "@/components/students/ExportColumnSelector";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { Download, Users, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ExportsPage() {
  const router = useRouter();
  const [isExportColumnSelectorOpen, setIsExportColumnSelectorOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  usePageTitle("Export Students");

  const handleExport = async (columns?: string[]) => {
    setIsExporting(true);
    try {
      const blob = await apiClient.exportStudentsCSV({
        batchId: batchId || undefined,
        columns: columns?.join(","),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `students-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Students exported successfully");
    } catch (error: unknown) {
      let errorMessage = "Failed to export students";
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("network") || msg.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (msg.includes("unauthorized") || msg.includes("401")) {
          errorMessage = "Your session has expired. Please refresh the page.";
        } else if (msg.includes("forbidden") || msg.includes("403")) {
          errorMessage = "You don't have permission to export students.";
        } else if (msg.length < 100) {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportConfirm = (columns: string[]) => {
    handleExport(columns);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Export Students</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Export student data to CSV format or navigate to the Students page for more options
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Export */}
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Export All Students</CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-4 pb-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Export all students from your workspace. Choose which columns to include in the export.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                Filter by Batch (Optional)
              </Label>
              <BatchFilter
                value={batchId}
                onChange={setBatchId}
                placeholder="All Batches"
              />
            </div>
            <Button
              onClick={() => setIsExportColumnSelectorOpen(true)}
              disabled={isExporting}
              className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Select Columns & Export
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Navigate to Students */}
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Students Management</CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-4 pb-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              View all students, filter by group, and access advanced export options on the Students page.
            </p>
            <Button
              onClick={() => router.push("/app/students")}
              className="w-full border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              <Users className="w-4 h-4 mr-2" />
              Go to Students Page
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Export Column Selector */}
      <ExportColumnSelector
        open={isExportColumnSelectorOpen}
        onOpenChange={setIsExportColumnSelectorOpen}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
