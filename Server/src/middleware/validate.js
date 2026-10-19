import { ApiError } from '../utils/ApiError.js';

/**
 * Zod validation middleware. Replaces req.body / req.query with the parsed,
 * whitelisted values so unknown fields can never reach a model.
 */
export function validate({ body, query, params } = {}) {
  return function validateRequest(req, _res, next) {
    try {
      if (body) req.body = body.parse(req.body ?? {});
      if (query) req.query = query.parse(req.query ?? {});
      if (params) req.params = params.parse(req.params ?? {});
      next();
    } catch (error) {
      if (error?.issues?.length) {
        const details = {};
        for (const issue of error.issues) {
          const key = issue.path.join('.') || 'form';
          if (!details[key]) details[key] = issue.message;
        }
        return next(ApiError.badRequest(error.issues[0].message, details));
      }
      next(error);
    }
  };
}

export default validate;
