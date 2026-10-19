import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { changePassword, login, me, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { changePasswordSchema, loginSchema, registerSchema } from '../validation/schemas.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(register));
router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));
router.put('/password', requireAuth, validate({ body: changePasswordSchema }), asyncHandler(changePassword));

export default router;
