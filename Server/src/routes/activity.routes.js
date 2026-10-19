import { Router } from 'express';
import { listActivity } from '../controllers/activity.controller.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { activityQuerySchema } from '../validation/schemas.js';

const router = Router();

router.use(requireAuth);
router.get('/', validate({ query: activityQuerySchema }), asyncHandler(listActivity));

export default router;
