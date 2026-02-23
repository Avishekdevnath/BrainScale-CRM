import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler, AppError } from '../../middleware/error-handler';
import * as callListImportService from './call-list-import.service';
import { prisma } from '../../db/client';

const IMPORT_TTL = 60 * 60 * 1000; // 60 minutes

export const previewCallListImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const file = req.file;

  if (!file) {
    throw new AppError(400, 'No file uploaded');
  }

  try {
    const startedAt = Date.now();
    console.info('[callListImport.preview] start', {
      listId,
      workspaceId: req.user!.workspaceId,
      userId: req.user!.sub,
      fileName: file.originalname,
      fileSizeBytes: file.size,
    });

    const parsedAt = Date.now();
    const result = await callListImportService.previewCallListImport(
      listId,
      req.user!.workspaceId!,
      req.user!.sub,
      file.buffer,
      file.originalname
    );
    console.info('[callListImport.preview] parsed', {
      ms: Date.now() - parsedAt,
      totalRows: result.totalRows,
      headersCount: result.headers.length,
    });

    // Store parsed data in database for commit
    const dbAt = Date.now();
    const importRecord = await prisma.import.create({
      data: {
        workspaceId: req.user!.workspaceId!,
        fileName: file.originalname,
        totalRows: result.totalRows,
        status: 'PREVIEW',
        meta: {
          parsedData: JSON.parse(JSON.stringify(result.parsedData)),
          callListId: listId,
          userId: req.user!.sub,
          createdAt: new Date().toISOString(),
        },
      },
    });
    console.info('[callListImport.preview] stored', {
      ms: Date.now() - dbAt,
      importId: importRecord.id,
      totalMs: Date.now() - startedAt,
    });

    // Remove parsedData from response (don't send all rows to client)
    const { parsedData, ...responseData } = result;

    res.json({
      ...responseData,
      importId: importRecord.id, // Return import record ID as importId for commit
    });
  } catch (error: any) {
    // Re-throw AppError as-is, wrap other errors
    if (error instanceof AppError) {
      throw error;
    }
    // Provide more context for file parsing errors
    if (error.message && (error.message.includes('CSV') || error.message.includes('Excel') || error.message.includes('parse'))) {
      throw new AppError(400, `File parsing error: ${error.message}`);
    }
    // Re-throw with more context
    throw new AppError(500, error.message || 'Failed to process import file');
  }
});

export const commitCallListImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const { importId } = req.body;

  if (!importId) {
    throw new AppError(400, 'Import ID is required. Please re-upload the file.');
  }

  // Start the chunked import
  await callListImportService.startCallListImportCommit(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    importId,
    req.validatedData!
  );

  // Process all chunks synchronously (legacy behaviour: returns only when fully done)
  let status = 'IN_PROGRESS';
  let lastResult: any = null;
  let safety = 0;
  while (status === 'IN_PROGRESS') {
    safety++;
    if (safety > 5000) throw new AppError(500, 'Import timed out during processing');
    const chunk = await callListImportService.processCallListImportCommitChunk(
      listId,
      req.user!.workspaceId!,
      req.user!.sub,
      importId,
      250
    );
    status = chunk.status;
    if (chunk.result) lastResult = chunk.result;
  }

  res.json(lastResult ?? { message: 'Import completed', stats: {}, errors: [] });
});

export const startCallListImportCommit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const { importId } = req.body;

  if (!importId) {
    throw new AppError(400, 'Import ID is required. Please re-upload the file.');
  }

  const result = await callListImportService.startCallListImportCommit(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    importId,
    req.validatedData!
  );

  res.json(result);
});

export const processCallListImportCommit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const { importId } = req.body;

  if (!importId) {
    throw new AppError(400, 'Import ID is required. Please re-upload the file.');
  }

  const chunkSize = (req.validatedData as any)?.chunkSize;

  const result = await callListImportService.processCallListImportCommitChunk(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    importId,
    chunkSize
  );

  res.json(result);
});

export const getCallListImportStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId, importId } = req.params as any;

  const importRecord = await prisma.import.findFirst({
    where: {
      id: importId,
      workspaceId: req.user!.workspaceId!,
    },
  });

  if (!importRecord) {
    throw new AppError(404, 'Import not found');
  }

  const meta = importRecord.meta as any;
  if (meta?.callListId && meta.callListId !== listId) {
    throw new AppError(403, 'Import does not belong to this call list');
  }

  if (meta?.userId && meta.userId !== req.user!.sub) {
    throw new AppError(403, 'Import does not belong to this user');
  }

  res.json({
    importId: importRecord.id,
    status: importRecord.status,
    progress: meta?.progress ?? null,
    stats: meta?.stats ?? null,
    message: meta?.resultMessage ?? null,
  });
});
