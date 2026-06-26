import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { AppError } from './error-handler';
import { getPlatformFeatures } from '../modules/platform/platform-features.service';
import { PlatformFeature, WORKSPACE_FIELD, FEATURE_LABEL } from '../config/platform-features';

/**
 * Gates a feature at mount time. Checks the platform-global flag first, then the
 * per-workspace flag (resolved from the X-Workspace-Id header). Self-contained:
 * does not require tenantGuard to have run. Membership is still enforced by the
 * router's own guards downstream.
 */
export const requireFeature = (feature: PlatformFeature) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const platform = await getPlatformFeatures();
      if (platform[feature] === false) {
        throw new AppError(403, `${FEATURE_LABEL[feature]} is disabled on this platform`);
      }

      const workspaceId = req.headers['x-workspace-id'] as string | undefined;
      if (workspaceId) {
        const field = WORKSPACE_FIELD[feature];
        const ws = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { [field]: true } as any,
        });
        if (ws && (ws as any)[field] === false) {
          throw new AppError(403, `${FEATURE_LABEL[feature]} is disabled for this workspace`);
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
