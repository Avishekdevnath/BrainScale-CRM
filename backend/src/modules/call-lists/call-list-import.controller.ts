import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler, AppError } from '../../middleware/error-handler';
import * as callListImportService from './call-list-import.service';

// Store parsed data temporarily in memory
// NOTE: This in-memory cache has limitations:
// - Not shared across multiple instances (won't work in multi-instance deployments)
// - Data is lost on server restart
// - In serverless environments (Vercel, AWS Lambda), each invocation may be a new instance,
//   so the cache won't persist between preview and commit requests
// - For production with horizontal scaling, consider using Redis or a database-backed cache
// - Users should complete the import process quickly after uploading to avoid cache expiration
const importCache = new Map<string, { parsedData: any; expiresAt: number }>();

const CACHE_TTL = 60 * 60 * 1000; // 60 minutes (increased for serverless environments, but may still fail in serverless)

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

  if (!importId) {
    throw new AppError(400, 'Import ID is required. Please re-upload the file.');
  }

  // Get parsed data from cache
  const cached = importCache.get(importId);
  
  if (!cached) {
    // In serverless environments, cache might not persist across instances
    // Provide a helpful error message
    throw new AppError(400, 'Import data not found. This may happen in serverless environments. Please re-upload the file and complete the import quickly.');
  }
  
  if (cached.expiresAt < Date.now()) {
    // Clean up expired entry
    importCache.delete(importId);
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

