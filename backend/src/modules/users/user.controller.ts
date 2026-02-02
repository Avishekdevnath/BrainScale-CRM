import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as userService from './user.service';

export const exportMyAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { buffer, filename } = await userService.exportMyAccountXlsx(req.user!.sub);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

export const deleteMyAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await userService.deleteMyAccount(req.user!.sub);
  res.json(result);
});

