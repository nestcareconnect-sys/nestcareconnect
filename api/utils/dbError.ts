import { Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Sanitizes sensitive connection strings, passwords, and database hostnames from error messages
 * so internal infrastructure details are NEVER leaked to the client or public logs.
 */
export function sanitizeErrorMessage(message?: string): string {
  if (!message || typeof message !== 'string') {
    return 'An unexpected error occurred.';
  }

  let sanitized = message
    // Mask full PostgreSQL connection URLs
    .replace(/postgresql:\/\/[^@\s]+@[^\/\s]+\/[^\s?]+/gi, 'postgresql://****@****/****')
    // Mask database hostnames ending in neon.tech or similar
    .replace(/[a-zA-Z0-9.-]+\.neon\.tech(?::\d+)?/gi, '[database-endpoint]')
    // Mask passwords or tokens in strings
    .replace(/password[:=]\s*[^\s,;&]+/gi, 'password=****')
    .replace(/token[:=]\s*[^\s,;&]+/gi, 'token=****')
    .replace(/secret[:=]\s*[^\s,;&]+/gi, 'secret=****');

  return sanitized;
}

/**
 * Checks if an error represents a database connectivity or cold-start issue
 */
export function isDatabaseConnectionError(error: any): boolean {
  if (!error) return false;

  // Prisma Client Initialization Error
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  // Prisma Known Request Errors related to connection/pool timeout
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1000: Authentication failed
    // P1001: Can't reach database server
    // P1002: Database server was reached but timed out
    // P1003: Database does not exist
    // P1008: Operations timed out
    // P1017: Server has closed the connection
    // P2024: Timed out fetching a new connection from the connection pool
    const connectionCodes = ['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'P2024'];
    if (connectionCodes.includes(error.code)) {
      return true;
    }
  }

  // Prisma Rust Panic or Unknown Request Error
  if (error instanceof Prisma.PrismaClientRustPanicError || error instanceof Prisma.PrismaClientUnknownRequestError) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('connection') || msg.includes('socket') || msg.includes('timeout')) {
      return true;
    }
  }

  // Generic connection error patterns
  const msg = (typeof error.message === 'string' ? error.message : '').toLowerCase();
  return (
    msg.includes("can't reach database") ||
    msg.includes('connection refused') ||
    msg.includes('connection timed out') ||
    msg.includes('timed out fetching a new connection') ||
    msg.includes('connection closed') ||
    msg.includes('connection reset') ||
    msg.includes('kind: closed') ||
    msg.includes('postgresql connection: error') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout')
  );
}

/**
 * Centralized HTTP error handler for controllers.
 * - Categorizes database connection errors as HTTP 503 (Service Unavailable)
 * - Sanitizes sensitive credentials and internal endpoints
 * - Never returns fake/fabricated data
 * - Logs technical diagnostics safely
 */
export function handleControllerError(
  res: Response,
  error: any,
  defaultMessage = 'An unexpected error occurred.'
): Response {
  const isConnErr = isDatabaseConnectionError(error);

  if (isConnErr) {
    console.error('🚨 [DATABASE CONNECTION ERROR]:', {
      code: error?.code || 'CONNECTION_FAILURE',
      message: sanitizeErrorMessage(error?.message),
    });

    return res.status(503).json({
      success: false,
      message: 'Database service is temporarily unavailable. Please try again in a few moments.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  // Prisma unique constraint violation (P2002)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? (error.meta?.target as string[]).join(', ') : 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${target} already exists.`,
      code: 'CONFLICT',
    });
  }

  // Prisma record not found (P2025)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: error.meta?.cause ? String(error.meta.cause) : 'Requested record was not found.',
      code: 'NOT_FOUND',
    });
  }

  // Generic application error
  const statusCode = error?.statusCode || (error?.status >= 400 && error?.status < 600 ? error.status : 500);
  const rawMessage = error?.message || defaultMessage;
  const safeMessage = sanitizeErrorMessage(rawMessage);

  console.error('⚠️ [API ERROR]:', {
    status: statusCode,
    message: safeMessage,
  });

  return res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
}
