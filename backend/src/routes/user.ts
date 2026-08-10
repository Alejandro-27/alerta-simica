import { Router } from 'express';
import * as user from '../controllers/userController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/errors';

const router = Router();
router.use(requireAuth);

router.get('/profile', asyncHandler(user.getProfile));
router.put('/profile', asyncHandler(user.updateProfile));
router.put('/location', asyncHandler(user.updateLocation));
router.put('/location/manual', asyncHandler(user.updateManualLocation));
router.delete('/location', asyncHandler(user.deleteLocation));
router.get('/alerts', asyncHandler(user.getAlertSettings));
router.put('/alerts', asyncHandler(user.updateAlertSettings));
router.delete('/account', asyncHandler(user.deleteAccount));

export default router;
