import { Request, Response, NextFunction } from 'express';
import { isDatabaseConnectionError, sanitizeErrorMessage } from '../utils/dbError.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isConnErr = isDatabaseConnectionError(err);
  const safeMessage = sanitizeErrorMessage(err.message);

  console.error('API Error:', {
    message: safeMessage,
    path: req.path,
    method: req.method,
    isDbError: isConnErr,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (isConnErr) {
    return res.status(503).json({
      success: false,
      message: 'Database service is temporarily unavailable. Please try again in a few moments.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);

  // In production, mask internal 500 server errors so implementation details are never exposed to clients
  const clientMessage =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : safeMessage;

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    errors: process.env.NODE_ENV === 'production' && statusCode === 500 ? undefined : (err.errors || undefined),
  });
}

