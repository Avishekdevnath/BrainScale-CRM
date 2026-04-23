import type { CreateFormPayload, FormField, FormFieldType, QuestionFieldType } from "@/types/forms.types";

export const FIELD_TYPE_GROUPS: Array<{
  label: string;
  options: Array<{ value: FormFieldType; label: string }>;
}> = [
  {
    label: "Text",
    options: [
      { value: "short_text", label: "Short text" },
      { value: "long_text", label: "Long text" },
      { value: "email", label: "Email" },
      { value: "number", label: "Number" },
    ],
  },
  {
    label: "Choice",
    options: [
      { value: "dropdown", label: "Dropdown" },
      { value: "radio", label: "Single choice" },
      { value: "checkbox", label: "Multiple choice" },
    ],
  },
  {
    label: "Date and time",
    options: [
      { value: "date", label: "Date" },
      { value: "time", label: "Time" },
    ],
  },
  {
    label: "Layout",
    options: [{ value: "section_break", label: "Section" }],
  },
];

export const FIELD_TYPE_OPTIONS: Array<{ value: FormFieldType; label: string }> = [
  ...FIELD_TYPE_GROUPS.flatMap((group) => group.options),
];

const BASE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "general", label: "General" },
  { value: "survey", label: "Survey" },
  { value: "attendance", label: "Attendance" },
];

const CHOICE_FIELD_TYPES: FormFieldType[] = ["dropdown", "radio", "checkbox"];

export function isChoiceField(type: FormFieldType): boolean {
  return CHOICE_FIELD_TYPES.includes(type);
}

export function normalizeChoiceOptions(options: string[] = []): string[] {
  const normalized: string[] = [];

  for (const option of options) {
    const trimmed = option.trim();

    if (!trimmed || normalized.includes(trimmed)) {
      continue;
    }

    normalized.push(trimmed);
  }

  return normalized;
}

export function makeField(type: FormFieldType = "short_text", index = 1): FormField {
  if (type === "section_break") {
    return {
      id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "section_break",
      label: `Section ${index}`,
      helpText: "",
    };
  }

  return {
    id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: type as QuestionFieldType,
    label: `Question ${index}`,
    required: false,
    placeholder: "",
    helpText: "",
    options: isChoiceField(type) ? ["Option 1", "Option 2"] : [],
  };
}

export function getFieldTypeLabel(type: FormFieldType): string {
  return FIELD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getVisibleTypeOptions(currentType: string): Array<{ value: string; label: string }> {
  const options = [...BASE_TYPE_OPTIONS];

  if (currentType === "quiz") {
    options.push({ value: "quiz", label: "Quiz (legacy)" });
  }

  return options;
}

type BuildFormPayloadInput = {
  title: string;
  description: string;
  type: string;
  slug: string;
  moduleName: string;
  courseName: string;
  batchName: string;
  fields: FormField[];
  settings: Record<string, unknown>;
};

export function buildFormPayload(input: BuildFormPayloadInput): CreateFormPayload {
  const normalizedFields: FormField[] = input.fields.map((field) => {
    if (field.type === "section_break") return field;

    if (!isChoiceField(field.type)) {
      return { ...field, options: [] };
    }

    return { ...field, options: normalizeChoiceOptions(field.options ?? []) };
  });

  return {
    title: input.title.trim(),
    description: input.description.trim() || undefined,
    type: input.type,
    slug: input.slug.trim() || undefined,
    moduleName: input.moduleName.trim() || undefined,
    courseName: input.courseName.trim() || undefined,
    batchName: input.batchName.trim() || undefined,
    fields: normalizedFields,
    settings: input.settings,
  };
}
