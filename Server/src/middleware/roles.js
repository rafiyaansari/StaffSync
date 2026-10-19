import { ApiError } from '../utils/ApiError.js';

export function requireRole(...roles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Your role does not have access to this action.'));
    }
    return next();
  };
}

export const requireHr = requireRole('hr');
export const requireManagerOrHr = requireRole('manager', 'hr');
export default requireRole;
