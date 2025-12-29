import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler, AppError } from '../../middleware/error-handler';
import * as callListImportService from './call-list-import.service';

// Store parsed data temporarily in memory
// NOTE: This in-memory cache has limitations:
// - Not shared across multiple instances (won't work in multi-instance deployments)
// - Data is lost on server restart
// - For production with horizontal scaling, consider using Redis or a database-backed cache
const importCache = new Map<string, { parsedData: any; expiresAt: number }>();

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const previewCallListImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const file = req.file;
  
  if (!file) {
    throw new AppError(400, 'No file uploaded');
  }

  try {
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

  // Get parsed data from cache
  const cached = importCache.get(importId);
  if (!cached || cached.expiresAt < Date.now()) {
    throw new AppError(400, 'Import data expired. Please re-upload the file.');
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

