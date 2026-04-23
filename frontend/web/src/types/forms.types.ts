export type FormStatus = 'draft' | 'published' | 'archived';
export type FormType = 'general' | 'survey' | 'quiz' | 'attendance';

export type QuestionFieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'number'
  | 'date'
  | 'time'
  | 'dropdown'
  | 'radio'
  | 'checkbox';

export type FormFieldType = QuestionFieldType | 'section_break';

export interface SectionField {
  id: string;
  type: 'section_break';
  label: string;
  helpText?: string;
}

export interface QuestionField {
  id: string;
  type: QuestionFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
}

export type FormField = SectionField | QuestionField;

export interface FormSettings {
  confirmationMessage?: string;
  showProgress?: boolean;
  allowMultipleSubmissions?: boolean;
  [key: string]: unknown;
}

export interface FormItem {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  title: string;
  description?: string | null;
  type: FormType | string;
  status: FormStatus | string;
  slug: string;
  moduleName?: string | null;
  courseName?: string | null;
  batchName?: string | null;
  fields: FormField[];
  settings: FormSettings;
  responseCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormPayload {
  title: string;
  description?: string;
  type?: FormType | string;
  status?: FormStatus | string;
  slug?: string;
  moduleName?: string;
  courseName?: string;
  batchName?: string;
  fields?: FormField[];
  settings?: FormSettings;
}

export interface UpdateFormPayload {
  title?: string;
  description?: string;
  type?: FormType | string;
  status?: FormStatus | string;
  slug?: string;
  moduleName?: string;
  courseName?: string;
  batchName?: string;
  fields?: FormField[];
  settings?: FormSettings;
}

export interface SubmitFormPayload {
  submissionKey?: string;
  responder?: Record<string, unknown>;
  answers: Record<string, unknown>;
  startedAt?: string;
  durationMs?: number;
}

export interface FormResponseItem {
  id: string;
  workspaceId: string;
  formId: string;
  submissionKey?: string | null;
  responder?: Record<string, unknown> | null;
  answers: Record<string, unknown>;
  startedAt?: string | null;
  submittedAt: string;
  durationMs?: number | null;
}
