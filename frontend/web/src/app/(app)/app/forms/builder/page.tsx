"use client";

import { FormBuilderStudio } from "@/components/forms/FormBuilderStudio";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function NewFormBuilderPage() {
  usePageTitle("Forms Builder");
  return <FormBuilderStudio />;
}
