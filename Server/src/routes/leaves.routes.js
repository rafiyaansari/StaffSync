import { Router } from 'express';
import { applyLeave, cancelLeave, decideLeave, listLeaves } from '../controllers/leaves.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireManagerOrHr } from '../middleware/roles.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { applyLeaveSchema, leaveDecisionSchema, leaveListQuerySchema } from '../validation/schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: leaveListQuerySchema }), asyncHandler(listLeaves));
router.post('/', validate({ body: applyLeaveSchema }), asyncHandler(applyLeave));
router.patch('/:id/status', requireManagerOrHr, validate({ body: leaveDecisionSchema }), asyncHandler(decideLeave));
router.patch('/:id/cancel', asyncHandler(cancelLeave));

export default router;
