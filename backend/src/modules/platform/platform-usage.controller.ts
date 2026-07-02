import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import * as svc from './platform-usage.service';

export const listUsage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listUsage(req.validatedData ?? req.query)); } catch (e) { next(e); }
};

export const getSettings = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({
      settings: await svc.getUsageNudgeSettings(),
      defaults: { subject: svc.DEFAULT_NUDGE_SUBJECT, body: svc.DEFAULT_NUDGE_BODY },
    });
  } catch (e) { next(e); }
};

export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ settings: await svc.updateUsageNudgeSettings(req.user!.sub, req.validatedData ?? req.body) });
  } catch (e) { next(e); }
};

export const sendNudges = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await svc.sendUsageNudges(req.user!.sub, req.validatedData ?? req.body));
  } catch (e) { next(e); }
};
