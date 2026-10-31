import rateLimit from 'express-rate-limit';

/**
 * Authentication Rate Limiter
 * Restricts sensitive auth operations (login, registration)
 * In development, allows unrestricted local testing.
 * In production, restricts to 50 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: (req) => {
    // In local development or testing, do not lock out developers
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  },
});

/**
 * Password Reset Rate Limiter
 * In development, skipped so testing the multi-step OTP reset flow is unrestricted.
 * In production, 20 requests per 15 minutes per IP (allowing complete OTP validation & reset cycles).
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please wait a few minutes before requesting again.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: () => {
    // In local development, allow unrestricted testing of forgot password and OTP
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
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
