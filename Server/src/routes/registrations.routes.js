import { Router } from 'express';
import { decideRegistration, listRegistrations } from '../controllers/registrations.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireHr } from '../middleware/roles.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { registrationDecisionSchema } from '../validation/schemas.js';

const router = Router();

router.use(requireAuth, requireHr);

router.get('/', asyncHandler(listRegistrations));
router.patch('/:id', validate({ body: registrationDecisionSchema }), asyncHandler(decideRegistration));

export default router;
