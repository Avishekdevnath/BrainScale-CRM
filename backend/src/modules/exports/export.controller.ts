import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as exportService from './export.service';

export const exportData = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await exportService.exportData(
    req.user!.workspaceId!,
    req.validatedData!
  );

  // Set headers for file download
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

  // Send buffer or stream
  if (Buffer.isBuffer(result.buffer)) {
    res.send(result.buffer);
  } else {
    result.buffer.pipe(res);
  }
});

