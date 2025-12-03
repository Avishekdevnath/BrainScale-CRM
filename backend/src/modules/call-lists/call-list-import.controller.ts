import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as callListImportService from './call-list-import.service';

// Store parsed data temporarily in memory (in production, consider using Redis or similar)
const importCache = new Map<string, { parsedData: any; expiresAt: number }>();

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const previewCallListImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const file = req.file;
  
  if (!file) {
    throw new Error('No file uploaded');
  }

  const result = await callListImportService.previewCallListImport(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    file.buffer,
    file.originalname
  );

  // Store parsed data in cache for commit
  const cacheKey = `${req.user!.workspaceId!}:${listId}:${Date.now()}`;
  importCache.set(cacheKey, {
    parsedData: result.parsedData,
    expiresAt: Date.now() + CACHE_TTL,
  });

  // Clean up old cache entries
  for (const [key, value] of importCache.entries()) {
    if (value.expiresAt < Date.now()) {
      importCache.delete(key);
    }
  }

  // Remove parsedData from response (don't send all rows to client)
  const { parsedData, ...responseData } = result;

  res.json({
    ...responseData,
    importId: cacheKey, // Return cache key as importId for commit
  });
});

export const commitCallListImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const { importId } = req.body;

  // Get parsed data from cache
  const cached = importCache.get(importId);
  if (!cached || cached.expiresAt < Date.now()) {
    throw new Error('Import data expired. Please re-upload the file.');
  }

  const result = await callListImportService.commitCallListImport(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    cached.parsedData,
    req.validatedData!
  );

  // Remove from cache after commit
  importCache.delete(importId);

  res.json(result);
});

