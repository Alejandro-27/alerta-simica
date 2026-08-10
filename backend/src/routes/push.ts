import { Router } from 'express';
import * as push from '../controllers/pushController';
import { requireAuth } from '../middleware/auth';
import { pushLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.get('/public-key', asyncHandler(push.getPublicKey));
router.get('/status', requireAuth, asyncHandler(push.status));
router.post('/subscribe', requireAuth, pushLimiter, asyncHandler(push.subscribe));
router.delete('/unsubscribe', requireAuth, asyncHandler(push.unsubscribe));

export default router;
