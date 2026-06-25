import { z } from 'zod';

// Strict TipTap node/mark schemas (allows common starter-kit nodes/marks)
const tiptapMarkSchema = z.object({
  type: z.enum(['bold', 'italic', 'code', 'link', 'underline']).optional(),
  attrs: z.record(z.string(), z.any()).optional(),
});

const tiptapNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum([
      'doc',
      'paragraph',
      'text',
      'heading',
      'bullet_list',
      'ordered_list',
      'list_item',
      'code_block',
      'blockquote',
      'horizontal_rule',
      'hard_break',
      'image',
    ]),
    attrs: z.record(z.string(), z.any()).optional(),
    marks: z.array(tiptapMarkSchema).optional(),
    text: z.string().optional(),
    content: z.array(tiptapNodeSchema).optional(),
  })
);

const tiptapContentSchema = z.object({
  type: z.literal('doc').optional(),
  content: z.array(tiptapNodeSchema).optional(),
}).strict();

const FormStatusEnum = z.enum(['draft', 'published', 'archived']);
const FormTypeEnum = z.enum(['general', 'survey', 'quiz', 'attendance']);

const SectionFieldSchema = z.object({
  id: z.string().min(1),
  type: z.literal('section_break'),
  label: z.string().default(''),
  helpText: z.string().optional(),
});

const QuestionFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'short_text', 'long_text', 'email', 'number',
    'date', 'time', 'dropdown', 'radio', 'checkbox',
  ]),
  label: z.string().default(''),
  required: z.boolean().optional().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const FormFieldSchema = z.discriminatedUnion('type', [
  SectionFieldSchema,
  QuestionFieldSchema,
]);

const FormSettingsSchema = z.object({
  confirmationMessage: z.string().optional(),
  showProgress: z.boolean().optional(),
  allowMultipleSubmissions: z.boolean().optional(),
}).catchall(z.any());

export const CreateFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.union([z.string(), tiptapContentSchema]).optional(),
  type: FormTypeEnum.optional().default('general'),
  status: FormStatusEnum.optional().default('draft'),
  slug: z.string().optional(),
  moduleName: z.string().optional(),
  courseName: z.string().optional(),
  batchName: z.string().optional(),
  fields: z.array(FormFieldSchema).optional(),
  settings: FormSettingsSchema.optional(),
});

export const UpdateFormSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.union([z.string(), tiptapContentSchema]).optional(),
  type: FormTypeEnum.optional(),
  status: FormStatusEnum.optional(),
  slug: z.string().optional(),
  moduleName: z.string().optional(),
  courseName: z.string().optional(),
  batchName: z.string().optional(),
  fields: z.array(FormFieldSchema).optional(),
  settings: FormSettingsSchema.optional(),
});

export const SubmitResponseSchema = z.object({
  submissionKey: z.string().optional(),
  responder: z.record(z.string(), z.any()).optional(),
  answers: z.record(z.string(), z.any()),
  startedAt: z.preprocess((val) => {
    if (!val) return undefined;
    const d = new Date(val as string);
    return isNaN(d.getTime()) ? undefined : d;
  }, z.date().optional()),
  durationMs: z.number().int().optional(),
});

export type CreateFormInput = z.infer<typeof CreateFormSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;
export type SubmitResponseInput = z.infer<typeof SubmitResponseSchema>;
