import { Router } from 'express';
import {
  assignTraining,
  enrollTraining,
  listTraining,
  updateTrainingProgress,
} from '../controllers/training.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireManagerOrHr } from '../middleware/roles.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  assignTrainingSchema,
  enrollTrainingSchema,
  trainingProgressSchema,
} from '../validation/schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listTraining));
router.post('/:id/enroll', validate({ body: enrollTrainingSchema }), asyncHandler(enrollTraining));
router.patch('/:id/progress', validate({ body: trainingProgressSchema }), asyncHandler(updateTrainingProgress));
router.post('/:id/assign', requireManagerOrHr, validate({ body: assignTrainingSchema }), asyncHandler(assignTraining));

export default router;
