import { Response, Request } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as formsService from './forms.service';
import { prisma } from '../../db/client';

export const createForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = (req as any).validatedData;
  const result = await formsService.createForm({
    workspaceId: req.user!.workspaceId!,
    ownerUserId: req.user!.sub,
    data,
  });
  res.status(201).json({ success: true, data: result });
});

export const listForms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt((req.query.page as any) || '1', 10) || 1;
  const size = Math.min(parseInt((req.query.size as any) || '20', 10) || 20, 200);
  const offset = (page - 1) * size;
  const q = (req.query.q as string) || undefined;

  const result = await formsService.getForms({
    workspaceId: req.user!.workspaceId!,
    limit: size,
    offset,
    q,
  });

  res.json({ success: true, data: result });
});

export const getForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { formId } = req.params;
  const form = await formsService.getFormById({ workspaceId: req.user!.workspaceId!, formId });
  if (!form) throw new Error('Form not found');
  res.json({ success: true, data: form });
});

export const checkSlugAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const slug = (req.query.slug as string) || '';
  const excludeFormId = (req.query.exclude as string) || undefined;
  const result = await formsService.checkSlugAvailability({
    workspaceId: req.user!.workspaceId!,
    slug,
    excludeFormId,
  });
  res.json({ success: true, data: result });
});

export const updateForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { formId } = req.params;
  const data = (req as any).validatedData;
  const result = await formsService.updateForm({ workspaceId: req.user!.workspaceId!, formId, data });
  res.json({ success: true, data: result });
});

export const publishForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { formId } = req.params;
  const publishData = (req as any).validatedData || req.body || undefined;
  const result = await formsService.publishForm({ workspaceId: req.user!.workspaceId!, formId, publishData });
  res.json({ success: true, data: result });
});

export const listResponses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { formId } = req.params;
  const limit = Math.min(parseInt((req.query.size as any) || '50', 10) || 50, 1000);
  const page = parseInt((req.query.page as any) || '1', 10) || 1;
  const offset = (page - 1) * limit;

  const result = await formsService.listResponses({ workspaceId: req.user!.workspaceId!, formId, limit, offset });
  res.json({ success: true, data: result });
});

export const archiveForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { formId } = req.params;
  const result = await formsService.archiveForm({ workspaceId: req.user!.workspaceId!, formId });
  res.json({ success: true, data: result });
});

export const exportResponses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { formId } = req.params;
  const format = ((req.query.format as string) || 'json') as 'json' | 'csv';
  const result = await formsService.exportResponses({ workspaceId: req.user!.workspaceId!, formId, format });

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.content);
});

// Public get route (no auth) - fetch form by slug for rendering
export const publicGetForm = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const form = await prisma.form.findFirst({
    where: { slug, status: 'published' },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      fields: true,
      settings: true,
      moduleName: true,
      courseName: true,
      batchName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!form) {
    res.status(404).json({ success: false, error: 'Form not found' });
    return;
  }

  res.json({ success: true, data: form });
});

// Public submit route (no auth) - find form by slug then submit
export const publicSubmit = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const submission = (req as any).validatedData;

  const form = await prisma.form.findFirst({ where: { slug } });
  if (!form) {
    res.status(404).json({ success: false, error: 'Form not found' });
    return;
  }

  const result = await formsService.submitResponse({ workspaceId: form.workspaceId, formId: form.id, submission, formObj: form });
  res.status(201).json({ success: true, data: result });
});
