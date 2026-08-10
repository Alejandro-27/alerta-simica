import { Router } from 'express';
import * as earthquakes from '../controllers/earthquakeController';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.get('/', asyncHandler(earthquakes.listEarthquakes));
router.get('/recent', asyncHandler(earthquakes.recentEarthquakes));
router.get('/:id', asyncHandler(earthquakes.getEarthquake));

export default router;
