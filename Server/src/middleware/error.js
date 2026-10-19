import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`No API route matches ${req.method} ${req.originalUrl}.`));
}

/* eslint-disable no-unused-vars */
export function errorHandler(error, req, res, _next) {
  let status = error.status || error.statusCode || 500;
  let message = error.message || 'Something went wrong on our side.';
  let details = error.details;

  if (error.name === 'ValidationError' && error.errors) {
    status = 400;
    details = {};
    for (const [key, value] of Object.entries(error.errors)) {
      details[key] = value.message;
    }
    message = 'Please check the highlighted fields.';
  } else if (error.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${error.path}.`;
  } else if (error.code === 11000) {
    status = 409;
    const field = Object.keys(error.keyPattern || {})[0] || 'record';
    message =
      field === 'email'
        ? 'An account with this email already exists.'
        : 'That record already exists.';
  } else if (error.type === 'entity.too.large') {
    status = 413;
    message = 'That request is too large. Try a smaller image.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  }

  if (status >= 500 && (!env.isTest || process.env.DEBUG_ERRORS === '1')) {
    // Never log request bodies here: they can contain passwords or tokens.
    console.error(`[StaffSync] ${req.method} ${req.originalUrl} failed:`, error.message);
    if (!env.isProduction) console.error(error.stack);
    message = 'Something went wrong on our side. Please try again.';
  }

  const payload = { message };
  if (details) payload.errors = details;
  res.status(status).json(payload);
}
