import { Router, Response, NextFunction } from 'express';
import { authGuard, AuthRequest } from '../../middleware/auth-guard';
import { getPlatformFeatures } from '../platform/platform-features.service';

const router = Router();

// Any authenticated user can read platform feature flags (read-only).
router.get('/platform-features', authGuard, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ features: await getPlatformFeatures() });
  } catch (e) {
    next(e);
  }
});

export default router;
