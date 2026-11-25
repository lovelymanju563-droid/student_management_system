import env from '../config/env.js';
import AppError from '../utils/appError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  if (env.nodeEnv !== 'test' && statusCode >= 500) {
    console.error('[Error]', err);
  }

  const response = {
    success: false,
    message,
  };

  if (details !== undefined) {
    response.errors = details;
  }

  if (env.nodeEnv === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
