import { Router } from 'express';
import * as earthquakes from '../controllers/earthquakeController';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.get('/', optionalAuth, asyncHandler(earthquakes.listEarthquakes));
router.get('/recent', optionalAuth, asyncHandler(earthquakes.recentEarthquakes));
router.get('/:id', optionalAuth, asyncHandler(earthquakes.getEarthquake));

export default router;
