import { Router } from 'express';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  markAnnouncementRead,
  updateAnnouncement,
} from '../controllers/announcements.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireHr } from '../middleware/roles.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAnnouncementSchema, updateAnnouncementSchema } from '../validation/schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listAnnouncements));
router.post('/', requireHr, validate({ body: createAnnouncementSchema }), asyncHandler(createAnnouncement));
router.patch('/:id', requireHr, validate({ body: updateAnnouncementSchema }), asyncHandler(updateAnnouncement));
router.delete('/:id', requireHr, asyncHandler(deleteAnnouncement));
router.post('/:id/read', asyncHandler(markAnnouncementRead));

export default router;
