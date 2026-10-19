import { Router } from 'express';
import mongoose from 'mongoose';
import activityRoutes from './activity.routes.js';
import announcementsRoutes from './announcements.routes.js';
import attendanceRoutes from './attendance.routes.js';
import authRoutes from './auth.routes.js';
import employeesRoutes from './employees.routes.js';
import leavesRoutes from './leaves.routes.js';
import notificationsRoutes from './notifications.routes.js';
import registrationsRoutes from './registrations.routes.js';
import settingsRoutes from './settings.routes.js';
import trainingRoutes from './training.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    data: {
      status: 'ok',
      database: states[mongoose.connection.readyState] || 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/employees', employeesRoutes);
router.use('/leaves', leavesRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/announcements', announcementsRoutes);
router.use('/training', trainingRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/registrations', registrationsRoutes);
router.use('/settings', settingsRoutes);
router.use('/activity', activityRoutes);

export default router;
