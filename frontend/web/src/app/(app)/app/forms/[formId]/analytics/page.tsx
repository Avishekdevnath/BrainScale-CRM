"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AnalyticsDashboard } from "@/components/forms/AnalyticsDashboard";
import { useForm, useFormResponses } from "@/hooks/useForms";
import { apiClient } from "@/lib/api-client";

export default function FormAnalyticsPage() {
  const params = useParams();
  const formId = params.formId as string;
  const [exportingFormat, setExportingFormat] = useState<"csv" | "json" | null>(null);

  const { data: form, isLoading: isFormLoading, error: formError } = useForm(formId);
  const { data: responses = [], isLoading: isResponsesLoading, error: responsesError } = useFormResponses(formId, {
    page: 1,
    size: 1000,
  });

  const isLoading = isFormLoading || isResponsesLoading;
  const error = formError || responsesError;

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!formId) return;
    setExportingFormat("csv");
    apiClient
      .exportFormResponses(formId, "csv")
      .then((blob) => {
        const fileName = `${(form?.slug || formId).replace(/\s+/g, "-")}-responses.csv`;
        downloadBlob(blob, fileName);
        toast.success("CSV export ready");
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to export CSV");
      })
      .finally(() => setExportingFormat(null));
  };

  const handleExportJSON = () => {
    if (!formId) return;
    setExportingFormat("json");
    apiClient
      .exportFormResponses(formId, "json")
      .then((blob) => {
        const fileName = `${(form?.slug || formId).replace(/\s+/g, "-")}-responses.json`;
        downloadBlob(blob, fileName);
        toast.success("JSON export ready");
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to export JSON");
      })
      .finally(() => setExportingFormat(null));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: `hsl(var(--groups1-background))` }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: `hsl(var(--groups1-primary))` }} />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ backgroundColor: `hsl(var(--groups1-background))` }}>
        <p style={{ color: `hsl(var(--groups1-text-secondary))` }}>Failed to load form analytics.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{
      backgroundColor: `hsl(var(--groups1-background))`
    }}>
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-2" style={{color: `hsl(var(--groups1-text))`}}>{form.title} Analytics</h1>
        <p className="mb-6" style={{color: `hsl(var(--groups1-text-secondary))`}}>View responses and insights</p>
        <AnalyticsDashboard
          form={form}
          responses={responses}
          exportingFormat={exportingFormat}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
        />
      </div>
    </div>
  );
}
