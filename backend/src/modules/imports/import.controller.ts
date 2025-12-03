import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as importService from './import.service';
import { prisma } from '../../db/client';

export const previewImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const file = req.file;
  
  if (!file) {
    throw new Error('No file uploaded');
  }

  const result = await importService.previewImport(
    req.user!.workspaceId!,
    file.buffer,
    file.originalname
  );

  // Store import record with parsed data in meta for commit later
  const importRecord = await (prisma.import.create as any)({
    data: {
      workspaceId: req.user!.workspaceId!,
      fileName: file.originalname,
      totalRows: result.totalRows,
      status: 'PENDING',
      meta: {
        headers: result.headers,
        rows: result.parsedData.rows, // Store all rows for commit
      },
    },
  });

  // Remove parsedData from response (don't send all rows to client)
  const { parsedData, ...responseData } = result;

  res.json({
    ...responseData,
    importId: importRecord.id,
  });
});

export const commitImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { importId } = req.params;
  const result = await importService.commitImport(
    req.user!.workspaceId!,
    req.user!.sub,
    importId,
    req.validatedData!
  );
  res.json(result);
});

export const listImports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const imports = await importService.listImports(req.user!.workspaceId!);
  res.json(imports);
});

export const getImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { importId } = req.params;
  const importRecord = await importService.getImport(
    importId,
    req.user!.workspaceId!
  );
  res.json(importRecord);
});

