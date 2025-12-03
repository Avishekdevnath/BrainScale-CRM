"use client";

import { useState, useEffect } from "react";
import { useStudentBatches, useBatches } from "@/hooks/useBatches";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BatchSelector } from "./BatchSelector";
import Link from "next/link";

export interface StudentBatchManagerProps {
  studentId: string;
  onUpdate?: () => void;
}

export function StudentBatchManager({
  studentId,
  onUpdate,
}: StudentBatchManagerProps) {
  const { data: studentBatches, isLoading, mutate } = useStudentBatches(studentId);
  const { data: allBatchesData } = useBatches({ isActive: true });
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (studentBatches) {
      setSelectedBatchIds(studentBatches.map((sb) => sb.batchId));
    }
  }, [studentBatches]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.setStudentBatches(studentId, {
        batchIds: selectedBatchIds,
      });
      toast.success("Student batches updated");
      mutate();
      onUpdate?.();
    } catch (error: any) {
      console.error("Update student batches error:", error);
      const errorMessage =
        error?.message || error?.error?.message || "Failed to update student batches";
      
      if (error?.status === 403) {
        toast.error("Admin access required");
      } else if (error?.status === 404) {
        toast.error("Student or batch not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Batches</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const allBatches = allBatchesData?.batches || [];
  const currentBatchNames = studentBatches
    ?.map((sb) => sb.batch?.name)
    .filter(Boolean) || [];

  return (
    <Card variant="groups1">
      <CardHeader variant="groups1">
        <CardTitle>Batches</CardTitle>
      </CardHeader>
      <CardContent variant="groups1" className="pb-6 space-y-4">
        {allBatches.length === 0 ? (
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            No batches available
          </p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Select Batches
              </label>
              <BatchSelector
                value={selectedBatchIds}
                onChange={(value) =>
                  setSelectedBatchIds(
                    Array.isArray(value) ? value : value ? [value] : []
                  )
                }
                multiple={true}
                placeholder="Select batches"
                isActiveOnly={true}
              />
              <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                Student can belong to multiple batches
              </p>
            </div>

            {currentBatchNames.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[var(--groups1-text)] mb-2">
                  Current Batches:
                </p>
                <div className="flex flex-wrap gap-2">
                  {studentBatches?.map((sb) => (
                    <Link
                      key={sb.id}
                      href={`/app/batches/${sb.batchId}`}
                      className="px-2 py-1 text-xs rounded-md bg-[var(--groups1-secondary)] text-[var(--groups1-text)] hover:bg-[var(--groups1-primary)] hover:text-[var(--groups1-btn-primary-text)] transition-colors"
                    >
                      {sb.batch?.name || "Unknown"}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Batches"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

