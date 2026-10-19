import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies the Bearer token and loads the linked employee.
 * Rejects expired / tampered tokens, pending accounts and deactivated users.
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Authentication required. Please sign in.');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Your session has expired. Please sign in again.');
      }
      throw ApiError.unauthorized('Your session is invalid. Please sign in again.');
    }

    const user = await User.findById(payload.sub).populate('employee');
    if (!user || !user.employee) {
      throw ApiError.unauthorized('This account is no longer available.');
    }
    if (user.status !== 'active') {
      throw ApiError.forbidden('This account is not active. Contact your HR administrator.');
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      employeeId: user.employee._id.toString(),
      employee: user.employee,
      tokenIssuedAt: payload.iat,
    };
    next();
  } catch (error) {
    next(error);
  }
}

/** Optional auth: used by public endpoints that adapt when a user is present. */
export async function optionalAuth(req, _res, next) {
  if (!req.headers.authorization) return next();
  return requireAuth(req, _res, next);
}

export default requireAuth;
