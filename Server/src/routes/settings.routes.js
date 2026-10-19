import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { settingsSchema } from '../validation/schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/:employeeId', asyncHandler(getSettings));
router.put('/:employeeId', validate({ body: settingsSchema }), asyncHandler(updateSettings));

export default router;
