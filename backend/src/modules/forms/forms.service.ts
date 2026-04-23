import { prisma } from '../../db/client';
import {
  CreateFormInput,
  UpdateFormInput,
  SubmitResponseInput,
} from './forms.schemas';

/**
 * Create a new form
 */
export const createForm = async ({ workspaceId, ownerUserId, data }: { workspaceId: string; ownerUserId: string; data: CreateFormInput }) => {
  try {
    const form = await prisma.form.create({
      data: {
        workspaceId,
        ownerUserId,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'general',
        status: data.status ?? 'draft',
        slug: data.slug ?? '',
        moduleName: data.moduleName ?? null,
        courseName: data.courseName ?? null,
        batchName: data.batchName ?? null,
        fields: (data.fields ?? {}) as any,
        settings: (data.settings ?? {}) as any,
      },
    });
    return form;
  } catch (err: any) {
    throw new Error(`Failed to create form: ${err?.message || String(err)}`);
  }
};

/**
 * List forms for a workspace
 */
export const getForms = async ({ workspaceId, limit = 20, offset = 0, q }: { workspaceId: string; limit?: number; offset?: number; q?: string }) => {
  try {
    const where: any = { workspaceId };
    if (q && q.trim().length > 0) {
      where.OR = [
        { title: { contains: q.trim(), mode: 'insensitive' } },
        { description: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return forms;
  } catch (err: any) {
    throw new Error(`Failed to list forms: ${err?.message || String(err)}`);
  }
};

/**
 * Get a single form by id (workspace-scoped)
 */
export const getFormById = async ({ workspaceId, formId }: { workspaceId: string; formId: string }) => {
  try {
    const form = await prisma.form.findFirst({ where: { id: formId, workspaceId } });
    return form;
  } catch (err: any) {
    throw new Error(`Failed to get form: ${err?.message || String(err)}`);
  }
};

/**
 * Update a form
 */
export const updateForm = async ({ workspaceId, formId, data }: { workspaceId: string; formId: string; data: UpdateFormInput }) => {
  try {
    const existing = await prisma.form.findFirst({ where: { id: formId, workspaceId } });
    if (!existing) throw new Error('Form not found');

    const updated = await prisma.form.update({
      where: { id: formId },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        status: data.status ?? existing.status,
        slug: data.slug ?? existing.slug,
        moduleName: data.moduleName ?? existing.moduleName,
        courseName: data.courseName ?? existing.courseName,
        batchName: data.batchName ?? existing.batchName,
        fields: (data.fields ?? existing.fields) as any,
        settings: (data.settings ?? existing.settings) as any,
      },
    });

    return updated;
  } catch (err: any) {
    throw new Error(`Failed to update form: ${err?.message || String(err)}`);
  }
};

/**
 * Publish a form. If slug is missing, set it to form.id
 */
export const publishForm = async ({ workspaceId, formId, publishData }: { workspaceId: string; formId: string; publishData?: any }) => {
  try {
    const existing = await prisma.form.findFirst({ where: { id: formId, workspaceId } });
    if (!existing) throw new Error('Form not found');

    const explicitSlug = typeof publishData?.slug === 'string' ? publishData.slug.trim() : '';
    const existingSlug = typeof existing.slug === 'string' ? existing.slug.trim() : '';
    const slug = explicitSlug || existingSlug || existing.id;
    const status = publishData?.status ?? 'published';

    const updated = await prisma.form.update({
      where: { id: formId },
      data: {
        slug,
        status,
        settings: publishData?.settings ? (publishData.settings as any) : existing.settings,
      },
    });

    return updated;
  } catch (err: any) {
    throw new Error(`Failed to publish form: ${err?.message || String(err)}`);
  }
};

/**
 * Check if a slug is available within a workspace.
 * Excludes the current form (for edit mode).
 */
export const checkSlugAvailability = async ({
  workspaceId,
  slug,
  excludeFormId,
}: {
  workspaceId: string;
  slug: string;
  excludeFormId?: string;
}): Promise<{ available: boolean }> => {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return { available: false };

  const conflict = await prisma.form.findFirst({
    where: {
      workspaceId,
      slug: trimmed,
      ...(excludeFormId ? { id: { not: excludeFormId } } : {}),
    },
    select: { id: true },
  });

  return { available: !conflict };
};

/**
 * Archive a form (soft lifecycle state change)
 */
export const archiveForm = async ({ workspaceId, formId }: { workspaceId: string; formId: string }) => {
  try {
    const existing = await prisma.form.findFirst({ where: { id: formId, workspaceId } });
    if (!existing) throw new Error('Form not found');

    const updated = await prisma.form.update({
      where: { id: formId },
      data: { status: 'archived' },
    });

    return updated;
  } catch (err: any) {
    throw new Error(`Failed to archive form: ${err?.message || String(err)}`);
  }
};

/**
 * Submit a response for a form
 */
export const submitResponse = async ({ workspaceId, formId, submission, formObj }: { workspaceId: string; formId: string; submission: SubmitResponseInput; formObj?: any }) => {
  try {
    // If form object is passed, use it; otherwise fetch (backwards compatibility)
    const form = formObj || (await prisma.form.findFirst({ where: { id: formId, workspaceId } }));
    if (!form) throw new Error('Form not found');

    const created = await prisma.formResponse.create({
      data: {
        workspaceId,
        formId,
        submissionKey: (submission as any).submissionKey ?? null,
        responder: (submission as any).responder ?? null,
        answers: (submission as any).answers,
        startedAt: (submission as any).startedAt ?? null,
        durationMs: (submission as any).durationMs ?? null,
      },
    });

    return created;
  } catch (err: any) {
    throw new Error(`Failed to submit form response: ${err?.message || String(err)}`);
  }
};

/**
 * List responses for a form
 */
export const listResponses = async ({ workspaceId, formId, limit = 50, offset = 0 }: { workspaceId: string; formId: string; limit?: number; offset?: number }) => {
  try {
    const responses = await prisma.formResponse.findMany({
      where: { workspaceId, formId },
      orderBy: { submittedAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return responses;
  } catch (err: any) {
    throw new Error(`Failed to list form responses: ${err?.message || String(err)}`);
  }
};

/**
 * Export responses for a form
 */
export const exportResponses = async ({ workspaceId, formId, format = 'json' }: { workspaceId: string; formId: string; format?: 'json' | 'csv' }) => {
  try {
    const form = await prisma.form.findFirst({ where: { id: formId, workspaceId } });
    if (!form) throw new Error('Form not found');

    const responses = await prisma.formResponse.findMany({
      where: { workspaceId, formId },
      orderBy: { submittedAt: 'desc' },
    });

    if (format === 'csv') {
      const rows = responses.map((r) => ({
        id: r.id,
        submittedAt: r.submittedAt.toISOString(),
        responder: JSON.stringify(r.responder ?? {}),
        answers: JSON.stringify(r.answers ?? {}),
        durationMs: r.durationMs ?? '',
      }));

      const header = ['id', 'submittedAt', 'responder', 'answers', 'durationMs'];
      const csv = [
        header.join(','),
        ...rows.map((row) =>
          header
            .map((k) => `"${String((row as any)[k]).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      return {
        format: 'csv' as const,
        filename: `form-${formId}-responses.csv`,
        contentType: 'text/csv',
        content: csv,
      };
    }

    return {
      format: 'json' as const,
      filename: `form-${formId}-responses.json`,
      contentType: 'application/json',
      content: JSON.stringify(responses),
    };
  } catch (err: any) {
    throw new Error(`Failed to export form responses: ${err?.message || String(err)}`);
  }
};
