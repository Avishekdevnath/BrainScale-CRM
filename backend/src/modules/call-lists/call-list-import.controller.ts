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

  // Get parsed data from database
  const importRecord = await prisma.import.findFirst({
    where: {
      id: importId,
      workspaceId: req.user!.workspaceId!,
      status: 'PREVIEW',
    },
  });

  if (!importRecord) {
    throw new AppError(400, 'Import data not found. Please re-upload the file and complete the import quickly.');
  }

  // Check if expired (older than 60 minutes)
  const createdAt = new Date(importRecord.createdAt);
  if (Date.now() - createdAt.getTime() > IMPORT_TTL) {
    // Clean up expired record
    await prisma.import.delete({ where: { id: importId } });
    throw new AppError(400, 'Import data expired. Please re-upload the file.');
  }

  const meta = importRecord.meta as any;
  if (!meta || !meta.parsedData) {
    throw new AppError(400, 'Import data corrupted. Please re-upload the file.');
  }

  const result = await callListImportService.commitCallListImport(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    meta.parsedData,
    req.validatedData!
  );

  // Update import record status
  await prisma.import.update({
    where: { id: importId },
    data: {
      status: 'COMPLETED',
      successCount: result.stats.added,
      duplicateCount: result.stats.duplicates,
      errorCount: result.stats.errors,
    },
  });

  res.json(result);
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
