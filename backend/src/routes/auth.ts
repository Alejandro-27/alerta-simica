import { Router } from 'express';
import * as auth from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.post('/register', authLimiter, asyncHandler(auth.register));
router.post('/login', authLimiter, asyncHandler(auth.login));
router.post('/refresh', authLimiter, asyncHandler(auth.refresh));
router.post('/forgot-password', authLimiter, asyncHandler(auth.forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(auth.resetPasswordAction));
router.post('/logout', requireAuth, asyncHandler(auth.logout));
router.get('/me', requireAuth, asyncHandler(auth.me));

export default router;
