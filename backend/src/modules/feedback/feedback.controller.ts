import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import * as svc from './feedback.service';

export const submit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const headerWs = (req.headers['x-workspace-id'] as string | undefined) ?? null;
    res.status(201).json(await svc.submitFeedback(req.user!.sub, headerWs, req.validatedData));
  } catch (e) { next(e); }
};

export const mine = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.getMyFeedback(req.user!.sub)); } catch (e) { next(e); }
};
