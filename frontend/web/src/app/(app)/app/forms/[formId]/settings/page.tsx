"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { FormSettings } from "@/components/forms/FormSettings";
import { useCourses } from "@/hooks/useCourses";
import { useAllModules } from "@/hooks/useAllModules";
import { useBatches } from "@/hooks/useBatches";

export default function FormSettingsPage() {
  const params = useParams();
  const formId = params.formId as string;
  const [isSaving, setIsSaving] = useState(false);

  // Fetch form data (stub for now)
  const form = {
    id: formId,
    title: "Sample Form",
    settings: {
      showProgress: true,
      confirmationMessage: "Thank you for your response!"
    },
  } as any;

  // Lift hooks to page level
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: allModules = [], isLoading: modulesLoading } = useAllModules();
  const { data: batchesResponse, isLoading: batchesLoading } = useBatches({ page: 1, size: 500 });
  const batches = batchesResponse?.batches ?? [];

  const handleSave = async (settings: any) => {
    setIsSaving(true);
    try {
      // TODO: Call API endpoint: PUT /api/forms/:id/settings
      console.log("Saving settings for form", formId, ":", settings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{
      backgroundColor: `hsl(var(--groups1-background))`
    }}>
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-2" style={{color: `hsl(var(--groups1-text))`}}>Form Settings</h1>
        <p className="mb-6" style={{color: `hsl(var(--groups1-text-secondary))`}}>Customize how your form looks and behaves</p>
        <FormSettings
          form={form}
          onSave={handleSave}
          isSubmitting={isSaving}
          courses={courses}
          allModules={allModules}
          batches={batches}
          coursesLoading={coursesLoading}
          modulesLoading={modulesLoading}
          batchesLoading={batchesLoading}
        />
      </div>
    </div>
  );
}
