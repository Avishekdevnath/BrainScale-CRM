import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard';
import { apiLimiter } from '../../middleware/rate-limit';
import { zodValidator } from '../../middleware/validate';
import * as ctrl from './feedback.controller';
import { SubmitFeedbackBody } from './feedback.schemas';

const router = Router();

// User-facing feedback: any authenticated user. NOT tenant-scoped.
router.use(authGuard, apiLimiter);
router.post('/', zodValidator(SubmitFeedbackBody), ctrl.submit);
router.get('/mine', ctrl.mine);

export default router;
