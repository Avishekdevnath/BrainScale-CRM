import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import * as svc from './platform-features.service';

export const getFeatures = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ features: await svc.getPlatformFeatures() }); } catch (e) { next(e); }
};

export const patchFeature = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { feature, enabled } = req.validatedData;
    res.json({ features: await svc.patchFeature(req.user!.sub, feature, enabled) });
  } catch (e) { next(e); }
};

export const listFeatureWorkspaces = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listWorkspacesWithFeatures(req.validatedData)); } catch (e) { next(e); }
};
