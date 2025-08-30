class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
  }
}

// Common error types
const createError = {
  badRequest: (message) => new ApiError(message, 400),
  unauthorized: (message) => new ApiError(message, 401),
  forbidden: (message) => new ApiError(message, 403),
  notFound: (message) => new ApiError(message, 404),
  conflict: (message) => new ApiError(message, 409),
  internal: (message) => new ApiError(message, 500)
};

module.exports = { ApiError, createError };
