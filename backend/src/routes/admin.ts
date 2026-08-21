import { Router } from 'express';
import * as admin from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { adminMutationLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/dashboard', asyncHandler(admin.dashboard));
router.get('/users', asyncHandler(admin.listUsers));
router.patch('/users/:id', adminMutationLimiter, asyncHandler(admin.updateUser));
router.get('/earthquakes', asyncHandler(admin.listAdminEarthquakes));
router.delete('/earthquakes/:id', adminMutationLimiter, asyncHandler(admin.deleteEarthquake));
router.get('/notifications', asyncHandler(admin.listNotifications));
router.get('/logs', asyncHandler(admin.listLogs));
router.get('/sources', asyncHandler(admin.listSources));
router.get('/config', asyncHandler(admin.getConfig));
router.put('/config', adminMutationLimiter, asyncHandler(admin.putConfig));
router.post('/push/test', adminMutationLimiter, asyncHandler(admin.sendPushTest));

export default router;
