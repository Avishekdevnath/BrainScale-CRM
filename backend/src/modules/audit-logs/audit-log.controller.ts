import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as auditLogService from './audit-log.service';

export const listAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await auditLogService.listAuditLogs(
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(result);
});
