import { Router } from 'express';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notifications.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listNotifications));
router.patch('/read-all', asyncHandler(markAllNotificationsRead));
router.patch('/:id/read', asyncHandler(markNotificationRead));

export default router;
