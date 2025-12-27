"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Batch, CreateBatchPayload, UpdateBatchPayload } from "@/types/batches.types";

export interface BatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: Batch;
  onSuccess?: () => void;
}

export function BatchFormDialog({
  open,
  onOpenChange,
  batch,
  onSuccess,
}: BatchFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const isEditMode = !!batch;

  useEffect(() => {
    if (open) {
      if (batch) {
        setForm({
          name: batch.name || "",
          description: batch.description || "",
          startDate: batch.startDate ? batch.startDate.split("T")[0] : "",
          endDate: batch.endDate ? batch.endDate.split("T")[0] : "",
          isActive: batch.isActive ?? true,
        });
      } else {
        setForm({
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          isActive: true,
        });
      }
    }
  }, [open, batch]);

  const validateForm = (): boolean => {
    if (form.name.trim().length < 2) {
      toast.error("Batch name must be at least 2 characters");
      return false;
    }

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) {
        toast.error("End date must be after start date");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && batch) {
        const payload: UpdateBatchPayload = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          startDate: form.startDate ? `${form.startDate}T00:00:00.000Z` : null,
          endDate: form.endDate ? `${form.endDate}T23:59:59.999Z` : null,
          isActive: form.isActive,
        };
        await apiClient.updateBatch(batch.id, payload);
        toast.success("Batch updated successfully");
      } else {
        const payload: CreateBatchPayload = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          startDate: form.startDate ? `${form.startDate}T00:00:00.000Z` : undefined,
          endDate: form.endDate ? `${form.endDate}T23:59:59.999Z` : undefined,
          isActive: form.isActive,
        };
        await apiClient.createBatch(payload);
        toast.success("Batch created successfully");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Batch save error:", error);
      const errorMessage =
        error?.message || error?.error?.message || "Failed to save batch";
      
      if (error?.status === 403) {
        toast.error("Admin access required");
      } else if (error?.status === 409) {
        toast.error("Batch name already exists");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Batch" : "Create Batch"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label
              htmlFor="batch-name"
              className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
            >
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="batch-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter batch name"
              className="bg-[var(--groups1-background)] border-[var(--groups1-border)]"
              disabled={saving}
            />
          </div>

          <div>
            <Label
              htmlFor="batch-description"
              className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
            >
              Description
            </Label>
            <textarea
              id="batch-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter batch description"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-none"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="batch-start-date"
                className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
              >
                Start Date
              </Label>
              <Input
                id="batch-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)]"
                disabled={saving}
              />
            </div>

            <div>
              <Label
                htmlFor="batch-end-date"
                className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1"
              >
                End Date
              </Label>
              <Input
                id="batch-end-date"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)]"
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="batch-active"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--groups1-border)]"
              disabled={saving}
            />
            <Label
              htmlFor="batch-active"
              className="text-sm font-medium text-[var(--groups1-text)] cursor-pointer"
            >
              Active
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? "Update" : "Create"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

