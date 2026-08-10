import { Router } from 'express';
import { health, ready } from '../controllers/healthController';
import { asyncHandler } from '../utils/errors';

const router = Router();

router.get('/', asyncHandler(health));
router.get('/ready', asyncHandler(ready));

export default router;
