"use client";

import { useParams } from "next/navigation";
import { FormRenderer } from "@/components/forms/FormRenderer";

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  if (!slug) {
    return <div className="p-8 text-center text-zinc-600">Invalid form link.</div>;
  }

  return <FormRenderer slug={slug} />;
}
