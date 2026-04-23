"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "@/hooks/useForms";
import { apiClient } from "@/lib/api-client";
import type { FormField, FormFieldType } from "@/types/forms.types";
import { FormBuilderAddToolbar } from "@/components/forms/builder/FormBuilderAddToolbar";
import { PREVIEW_SESSION_KEY } from "@/app/forms/preview/page";
import { FormBuilderEmptyState } from "@/components/forms/builder/FormBuilderEmptyState";
import { FormBuilderHeaderCard } from "@/components/forms/builder/FormBuilderHeaderCard";
import { FormBuilderMetadataCard } from "@/components/forms/builder/FormBuilderMetadataCard";
import { useCourses } from "@/hooks/useCourses";
import { useAllModules } from "@/hooks/useAllModules";
import { useBatches } from "@/hooks/useBatches";
import { FormBuilderQuestionCard } from "@/components/forms/builder/FormBuilderQuestionCard";
import { FormBuilderTopbar } from "@/components/forms/builder/FormBuilderTopbar";
import { EditorProvider } from "@/components/forms/editors";
import {
  buildFormPayload,
  FIELD_TYPE_OPTIONS,
  getFieldTypeLabel,
  getVisibleTypeOptions,
  isChoiceField,
  makeField,
  normalizeChoiceOptions,
} from "@/components/forms/formBuilderStudio.helpers";

type Props = {
  formId?: string;
};

type PersistedFormState = {
  id: string;
  settings: Record<string, unknown>;
};

function supportsPlaceholder(type: FormFieldType): boolean {
  return !["dropdown", "radio", "checkbox"].includes(type);
}

function parseSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getInitialFields(value: unknown): FormField[] {
  return Array.isArray(value) ? (value as FormField[]) : [];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function FormBuilderStudio({ formId }: Props) {
  const router = useRouter();
  const isEdit = !!formId;
  const { data: form, error, isLoading, mutate: mutateForm } = useForm(formId);

  // Fetch lookup data at Studio level so it's ready before the dialog opens
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: allModules = [], isLoading: modulesLoading } = useAllModules();
  const { data: batchesResponse, isLoading: batchesLoading } = useBatches({ page: 1, size: 500 });

  const [persistedFormState, setPersistedFormState] = useState<PersistedFormState | null>(null);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null);
  const [typeOverride, setTypeOverride] = useState<string | null>(null);
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [moduleNameOverride, setModuleNameOverride] = useState<string | null>(null);
  const [courseNameOverride, setCourseNameOverride] = useState<string | null>(null);
  const [batchNameOverride, setBatchNameOverride] = useState<string | null>(null);
  const [fieldsOverride, setFieldsOverride] = useState<FormField[] | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const dragFieldIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (fieldId: string) => {
    dragFieldIdRef.current = fieldId;
  };

  const handleDragOver = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    if (dragFieldIdRef.current && dragFieldIdRef.current !== fieldId) {
      setDragOverId(fieldId);
    }
  };

  const handleDrop = (targetFieldId: string) => {
    const sourceId = dragFieldIdRef.current;
    dragFieldIdRef.current = null;
    setDragOverId(null);
    if (!sourceId || sourceId === targetFieldId) return;
    updateBuilderState(() => {
      setFieldsOverride((prev) => {
        const list = [...(prev ?? initialFields)];
        const fromIdx = list.findIndex((f) => f.id === sourceId);
        const toIdx = list.findIndex((f) => f.id === targetFieldId);
        if (fromIdx < 0 || toIdx < 0) return list;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        return list;
      });
    });
  };

  const handleDragEnd = () => {
    dragFieldIdRef.current = null;
    setDragOverId(null);
  };

  const openPreview = () => {
    try {
      sessionStorage.setItem(PREVIEW_SESSION_KEY, JSON.stringify({ title, description, type, moduleName, courseName, batchName, fields }));
    } catch { /* ignore */ }
    window.open("/forms/preview", "_blank");
  };
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "publishing">("idle");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userEditedSlugRef = useRef(false);

  const initialTitle = form?.title ?? "";
  const initialDescription = form?.description ?? "";
  const initialType = String(form?.type ?? "general");
  const initialSlug = form?.slug ?? "";
  const initialModuleName = form?.moduleName ?? "";
  const initialCourseName = form?.courseName ?? "";
  const initialBatchName = form?.batchName ?? "";
  const initialFields = useMemo(() => getInitialFields(form?.fields), [form?.fields]);
  const initialSettings = useMemo(() => parseSettings(form?.settings), [form?.settings]);

  const currentFormId = persistedFormState?.id ?? form?.id ?? formId ?? "";
  const settings = persistedFormState?.settings ?? initialSettings;
  const title = titleOverride ?? initialTitle;
  const description = descriptionOverride ?? initialDescription;
  const type = typeOverride ?? initialType;
  const slug = slugOverride ?? initialSlug;
  const moduleName = moduleNameOverride ?? initialModuleName;
  const courseName = courseNameOverride ?? initialCourseName;
  const batchName = batchNameOverride ?? initialBatchName;
  const fields = fieldsOverride ?? initialFields;
  const typeOptions = useMemo(() => getVisibleTypeOptions(type), [type]);
  const resolvedActiveFieldId = activeFieldId ?? fields[0]?.id ?? null;
  const isBusy = status === "saving" || status === "publishing";
  const questionCount = useMemo(
    () => fields.filter((field) => field.type !== "section_break").length,
    [fields]
  );

  // If the stored description is serialized TipTap JSON, parse it for the shared editor provider.
  // Memoized to avoid passing a new object every render (which can reset editor content while typing).
  const parsedInitialDescription = useMemo(() => {
    if (!initialDescription) return "";
    try {
      return JSON.parse(initialDescription);
    } catch (e) {
      return initialDescription;
    }
  }, [initialDescription]);

  useEffect(() => {
    if (status !== "saved") {
      return;
    }

    const timeout = setTimeout(() => setStatus("idle"), 1400);
    return () => clearTimeout(timeout);
  }, [status]);

  // Auto-generate slug from title (only when user has not manually edited the slug)
  const titleForSlug = titleOverride ?? "";
  useEffect(() => {
    if (userEditedSlugRef.current) return;
    if (!titleForSlug.trim()) return;
    const generated = titleForSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);
    setSlugOverride(generated);
  }, [titleForSlug]);

  // Debounced slug availability check against DB
  const checkSlug = useCallback(
    (slugValue: string) => {
      if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
      const trimmed = slugValue.trim();
      if (!trimmed) { setSlugStatus("idle"); return; }
      setSlugStatus("checking");
      slugDebounceRef.current = setTimeout(async () => {
        try {
          const result = await apiClient.checkFormSlugAvailability(trimmed, currentFormId || undefined);
          setSlugStatus(result.available ? "available" : "taken");
        } catch {
          setSlugStatus("idle");
        }
      }, 500);
    },
    [currentFormId]
  );

  useEffect(() => {
    const current = slugOverride ?? initialSlug;
    if (current) checkSlug(current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugOverride, initialSlug]);

  const updateBuilderState = (updater: () => void) => {
    if (status === "saved") {
      setStatus("idle");
    }

    updater();
  };

  const updateField = (fieldId: string, patch: Partial<FormField>) => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;

        return previousFields.map((field) => {
          if (field.id !== fieldId) {
            return field;
          }

          const nextType = (patch.type ?? field.type) as FormFieldType;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nextField = { ...field, ...patch } as any;

          if (patch.type && nextType !== "section_break") {
            const prevOptions = (field as any).options ?? [];
            nextField.options = isChoiceField(nextType)
              ? normalizeChoiceOptions(prevOptions).length > 0
                ? normalizeChoiceOptions(prevOptions)
                : ["Option 1", "Option 2"]
              : [];

            if (!supportsPlaceholder(nextType)) {
              nextField.placeholder = "";
            }
          }

          return nextField as FormField;
        });
      });
      setActiveFieldId(fieldId);
    });
  };

  const addField = (fieldType: FormFieldType) => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;
        const sameTypeCount = fieldType === "section_break"
          ? previousFields.filter((f) => f.type === "section_break").length
          : previousFields.filter((f) => f.type !== "section_break").length;
        const nextField = makeField(fieldType, sameTypeCount + 1);
        setActiveFieldId(nextField.id);
        return [...previousFields, nextField];
      });
    });
  };

  const addFieldAfter = (afterIndex: number, fieldType: FormFieldType) => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;
        const fieldsUpToIndex = previousFields.slice(0, afterIndex + 1);
        const sameTypeCount = fieldType === "section_break"
          ? fieldsUpToIndex.filter((f) => f.type === "section_break").length
          : fieldsUpToIndex.filter((f) => f.type !== "section_break").length;
        const nextField = makeField(fieldType, sameTypeCount + 1);
        setActiveFieldId(nextField.id);
        const updated = [...previousFields];
        updated.splice(afterIndex + 1, 0, nextField);
        return updated;
      });
    });
  };

  const duplicateField = (fieldId: string) => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;
        const index = previousFields.findIndex((field) => field.id === fieldId);

        if (index < 0) {
          return previousFields;
        }

        const source = previousFields[index];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const src = source as any;
        const duplicate: FormField = {
          ...source,
          id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ...(src.options !== undefined ? { options: [...src.options] } : {}),
        } as FormField;

        const nextFields = [...previousFields];
        nextFields.splice(index + 1, 0, duplicate);
        setActiveFieldId(duplicate.id);
        return nextFields;
      });
    });
  };

  const deleteField = (fieldId: string) => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;
        const index = previousFields.findIndex((field) => field.id === fieldId);

        if (index < 0) {
          return previousFields;
        }

        const nextFields = previousFields.filter((field) => field.id !== fieldId);

        if (resolvedActiveFieldId === fieldId) {
          setActiveFieldId(nextFields[index]?.id ?? nextFields[index - 1]?.id ?? null);
        }

        return nextFields;
      });
    });
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;
        const currentIndex = previousFields.findIndex((field) => field.id === fieldId);
        const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= previousFields.length) {
          return previousFields;
        }

        const nextFields = [...previousFields];
        [nextFields[currentIndex], nextFields[nextIndex]] = [nextFields[nextIndex], nextFields[currentIndex]];
        setActiveFieldId(fieldId);
        return nextFields;
      });
    });
  };

  const addOption = (fieldId: string) => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;

        return previousFields.map((field) => {
          if (field.id !== fieldId || !isChoiceField(field.type)) {
            return field;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const f = field as any;
          const nextOptions = [...(f.options ?? []), `Option ${(f.options?.length ?? 0) + 1}`];
          return { ...field, options: nextOptions } as FormField;
        });
      });
    });
  };

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;

        return previousFields.map((field) => {
          if (field.id !== fieldId || !isChoiceField(field.type)) {
            return field;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nextOptions = [...((field as any).options ?? [])];
          nextOptions[optionIndex] = value;
          return { ...field, options: nextOptions } as FormField;
        });
      });
    });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    updateBuilderState(() => {
      setFieldsOverride((previousOverride) => {
        const previousFields = previousOverride ?? initialFields;

        return previousFields.map((field) => {
          if (field.id !== fieldId || !isChoiceField(field.type)) {
            return field;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const opts: string[] = (field as any).options ?? [];
          if (opts.length <= 1) return field;
          return { ...field, options: opts.filter((_, i) => i !== optionIndex) } as FormField;
        });
      });
    });
  };

  const getValidationError = () => {
    if (!title.trim()) {
      return "Form title is required";
    }

    for (const field of fields) {
      if (!isChoiceField(field.type)) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (normalizeChoiceOptions((field as any).options ?? []).length === 0) {
        return `${field.label || "Choice question"} must include at least one option`;
      }
    }

    return null;
  };

  const upsertDraft = async () => {
    const payload = buildFormPayload({
      title,
      description,
      type,
      slug,
      moduleName,
      courseName,
      batchName,
      fields,
      settings,
    });

    if (currentFormId) {
      const updated = await apiClient.updateForm(currentFormId, payload);
      setPersistedFormState({ id: updated.id, settings: parseSettings(updated.settings) });
      // Refresh form data in cache and clear all overrides for fresh state
      await mutateForm(updated, false);
      setTitleOverride(null);
      setDescriptionOverride(null);
      setTypeOverride(null);
      setSlugOverride(null);
      setModuleNameOverride(null);
      setCourseNameOverride(null);
      setBatchNameOverride(null);
      setFieldsOverride(null);
      return updated;
    }

    const created = await apiClient.createForm(payload);
    setPersistedFormState({ id: created.id, settings: parseSettings(created.settings) });
    // Refresh form data in cache and clear all overrides for fresh state
    await mutateForm(created, false);
    setTitleOverride(null);
    setDescriptionOverride(null);
    setTypeOverride(null);
    setSlugOverride(null);
    setModuleNameOverride(null);
    setCourseNameOverride(null);
    setBatchNameOverride(null);
    setFieldsOverride(null);
    router.replace(`/app/forms/${created.id}/builder`);
    return created;
  };

  const saveDraft = async () => {
    const validationError = getValidationError();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setStatus("saving");

    try {
      await upsertDraft();
      setStatus("saved");
      toast.success(currentFormId ? "Draft saved" : "Form created");
    } catch (saveError: unknown) {
      setStatus("idle");
      toast.error(getErrorMessage(saveError, "Failed to save draft"));
    }
  };

  const publish = async () => {
    const validationError = getValidationError();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setStatus("publishing");

    try {
      const saved = await upsertDraft();
      await apiClient.publishForm(saved.id);
      toast.success("Form published");
      router.push("/app/forms");
    } catch (publishError: unknown) {
      setStatus("idle");
      toast.error(getErrorMessage(publishError, "Failed to publish form"));
    }
  };

  if (isEdit && isLoading) {
    return <div className="p-8 text-center text-[var(--groups1-text-secondary)]">Loading form builder...</div>;
  }

  if (isEdit && (error || !form)) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card variant="groups1" className="rounded-[24px]">
          <CardContent variant="groups1" className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--groups1-text)]">Form unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--groups1-text-secondary)]">
                The builder could not load this form. You can safely return to the forms list.
              </p>
            </div>
            <Button
              className="rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              onClick={() => router.push("/app/forms")}
            >
              Back to forms
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EditorProvider initialContent={parsedInitialDescription}>
      <div className="min-h-screen bg-[var(--groups1-background)]">
      <FormBuilderTopbar
        title={title}
        isEdit={isEdit}
        isBusy={isBusy}
        status={status}
        onBack={() => router.push("/app/forms")}
        onSave={saveDraft}
        onPublish={publish}
        onOpenSettings={() => setMetadataOpen(true)}
        onPreview={openPreview}
      />

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-6 lg:px-6">
        <main className="space-y-4 lg:col-span-2 lg:space-y-5">
          <FormBuilderHeaderCard
            title={title}
            description={description}
            questionCount={questionCount}
            onTitleChange={(value) => updateBuilderState(() => setTitleOverride(value))}
            onDescriptionChange={(value) => updateBuilderState(() => setDescriptionOverride(value))}
            useRichEditor={true}
          />

          <FormBuilderMetadataCard
            open={metadataOpen}
            type={type}
            slug={slug}
            typeOptions={typeOptions}
            moduleName={moduleName}
            courseName={courseName}
            batchName={batchName}
            courses={courses}
            allModules={allModules}
            batches={batchesResponse?.batches ?? []}
            coursesLoading={coursesLoading}
            modulesLoading={modulesLoading}
            batchesLoading={batchesLoading}
            onOpenChange={setMetadataOpen}
            slugStatus={slugStatus}
            onTypeChange={(value) => updateBuilderState(() => setTypeOverride(value))}
            onSlugChange={(value) => {
              userEditedSlugRef.current = true;
              updateBuilderState(() => setSlugOverride(value));
            }}
            onModuleNameChange={(value) => updateBuilderState(() => setModuleNameOverride(value))}
            onCourseNameChange={(value) => updateBuilderState(() => setCourseNameOverride(value))}
            onBatchNameChange={(value) => updateBuilderState(() => setBatchNameOverride(value))}
          />

          {fields.length === 0 ? (
            <>
              <FormBuilderEmptyState />
              <FormBuilderAddToolbar
                onAddQuestion={() => addField("short_text")}
                onAddSection={() => addField("section_break")}
              />
            </>
          ) : (
            <>
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const questionNumber =
                    field.type === "section_break"
                      ? null
                      : fields.slice(0, index + 1).filter((item) => item.type !== "section_break").length;

                  const sectionNumber =
                    field.type === "section_break"
                      ? fields.slice(0, index + 1).filter((item) => item.type === "section_break").length
                      : null;

                  return (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={() => handleDragStart(field.id)}
                      onDragOver={(e) => handleDragOver(e, field.id)}
                      onDrop={() => handleDrop(field.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        opacity: dragFieldIdRef.current === field.id ? 0.4 : 1,
                        outline: dragOverId === field.id ? `2px solid hsl(var(--groups1-primary))` : "none",
                        borderRadius: "24px",
                        transition: "opacity 0.15s, outline 0.1s",
                      }}
                    >
                      <FormBuilderQuestionCard
                        field={field}
                        index={index}
                        questionNumber={questionNumber}
                        sectionNumber={sectionNumber}
                        totalFields={fields.length}
                        isActive={field.id === resolvedActiveFieldId}
                        fieldTypeOptions={FIELD_TYPE_OPTIONS}
                        fieldTypeLabel={getFieldTypeLabel(field.type)}
                        onFocus={() => setActiveFieldId(field.id)}
                        onUpdateField={(patch) => updateField(field.id, patch)}
                        onUpdateOption={(optionIndex, value) => updateOption(field.id, optionIndex, value)}
                        onAddOption={() => addOption(field.id)}
                        onRemoveOption={(optionIndex) => removeOption(field.id, optionIndex)}
                        onDuplicate={() => duplicateField(field.id)}
                        onDelete={() => deleteField(field.id)}
                        onMoveField={(direction) => moveField(field.id, direction)}
                        onAddAfter={() => addFieldAfter(index, "short_text")}
                        onAddSectionAfter={() => addFieldAfter(index, "section_break")}
                      />
                    </div>
                  );
                })}
              </div>
              <FormBuilderAddToolbar
                onAddQuestion={() => addField("short_text")}
                onAddSection={() => addField("section_break")}
              />
            </>
          )}
        </main>
      </div>
    </div>
    </EditorProvider>
  );
}
