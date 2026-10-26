import rateLimit from 'express-rate-limit';

/**
 * Authentication Rate Limiter
 * Restricts sensitive auth operations (login, registration, forgot password, reset password)
 * to 10 requests per 15 minutes per IP to block credential stuffing and brute force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: (req) => {
    // In local automated test runs, allow skipping with an internal header if explicitly configured
    if (process.env.NODE_ENV === 'test' && req.headers['x-bypass-test-rate-limit'] === 'true') {
      return true;
    }
    return false;
  },
});

/**
 * Password Reset Rate Limiter
 * Stricter limit for password reset requests: 5 requests per hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please wait an hour before requesting again.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * File Upload Rate Limiter
 * Prevents denial-of-service via resource exhaustion: 30 uploads per 10 minutes
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Upload frequency limit exceeded. Please wait a few minutes before uploading more files.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Order Creation Rate Limiter
 * Prevents automated spam order creation: 25 orders per hour per IP
 */
export const orderCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many order requests from this IP. Please wait before creating another order.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * General API Rate Limiter
 * Global defense-in-depth: 300 requests per minute
 */
export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
