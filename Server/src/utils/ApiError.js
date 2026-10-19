export class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.expected = true;
  }

  static badRequest(message = 'Invalid request.', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Authentication required.') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to do that.') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, message);
  }

  static conflict(message = 'That conflicts with an existing record.', details) {
    return new ApiError(409, message, details);
  }
}

export default ApiError;
