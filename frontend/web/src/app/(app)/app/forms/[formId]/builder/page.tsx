"use client";

import { useParams } from "next/navigation";
import { FormBuilderStudio } from "@/components/forms/FormBuilderStudio";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function EditFormBuilderPage() {
  const params = useParams<{ formId: string }>();
  const formId = params?.formId;
  usePageTitle("Edit Form Builder");

  if (!formId) {
    return <div className="p-6 text-sm text-red-600">Invalid form id.</div>;
  }

  return <FormBuilderStudio formId={formId} />;
}
