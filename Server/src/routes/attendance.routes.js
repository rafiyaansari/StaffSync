import { Router } from 'express';
import {
  clockIn,
  clockOut,
  listAttendance,
  todayAttendance,
} from '../controllers/attendance.controller.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { attendanceQuerySchema, clockInSchema, clockOutSchema } from '../validation/schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: attendanceQuerySchema }), asyncHandler(listAttendance));
router.get('/today', asyncHandler(todayAttendance));
router.post('/clock-in', validate({ body: clockInSchema }), asyncHandler(clockIn));
router.post('/clock-out', validate({ body: clockOutSchema }), asyncHandler(clockOut));

export default router;
