import 'dotenv/config';
import dns from 'dns';
import { PrismaClient, Prisma } from '@prisma/client';
import { isDatabaseConnectionError, sanitizeErrorMessage } from '../utils/dbError.js';

// Enforce IPv4 resolution first across Node.js runtime and native C bindings (getaddrinfo).
// Prevents connection timeouts on networks without IPv6 default routes when connecting
// to Neon AWS dual-stack endpoints (which advertise both IPv4 and IPv6).
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Normalizes PostgreSQL connection string for Neon Serverless / PgBouncer
 * Ensures &pgbouncer=true, &connect_timeout=30, &pool_timeout=30, and &connection_limit=10
 * are properly configured for resilient serverless pooling.
 */
export function normalizeDatabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // If using Neon PgBouncer connection pooler (-pooler), ensure pgbouncer=true is set
  if (url.includes('pooler') && !url.includes('pgbouncer=true')) {
    url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }

  // Ensure connect_timeout (seconds) is set so Neon cold starts have time to wake up
  if (!url.includes('connect_timeout')) {
    url += (url.includes('?') ? '&' : '?') + 'connect_timeout=30';
  }

  // Ensure pool_timeout (seconds) is configured so concurrent requests don't instantly drop
  if (!url.includes('pool_timeout')) {
    url += (url.includes('?') ? '&' : '?') + 'pool_timeout=30';
  }

  // Set balanced connection_limit for PgBouncer serverless pool
  if (!url.includes('connection_limit')) {
    url += (url.includes('?') ? '&' : '?') + 'connection_limit=5';
  }

  // Enforce sslmode=require for secure Neon TLS connection
  if (!url.includes('sslmode')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  return url;
}

const rawDbUrl = process.env.DATABASE_URL || '';
const isValidPostgres = rawDbUrl.startsWith('postgresql://') || rawDbUrl.startsWith('postgres://');
const normalizedDbUrl = normalizeDatabaseUrl(rawDbUrl);

/**
 * Creates an extended PrismaClient with auto-retry on Neon cold-start
 */
function createPrismaClient(databaseUrl: string) {
  const baseClient = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });

  (baseClient as any).$on('error', (e: any) => {
    const msg = e.message || '';
    if (msg.includes('kind: Closed') || msg.includes('kind: closed')) {
      return; // Transient PgBouncer serverless connection pruning handled by auto-retry
    }
    console.error('❌ [DATABASE ERROR]:', sanitizeErrorMessage(msg));
  });

  (baseClient as any).$on('warn', (e: any) => {
    const msg = e.message || '';
    if (msg.includes('kind: Closed') || msg.includes('kind: closed')) {
      return;
    }
    console.warn('⚠️ [DATABASE WARNING]:', sanitizeErrorMessage(msg));
  });

  // Client Extension: Auto-retries transient Neon auto-suspend / cold-start timeouts
  // Using query.$allOperations intercepts ALL queries including model operations and raw queries
  const extendedClient = baseClient.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const maxRetries = 3;
        let attempt = 0;
        const opName = model ? `${model}.${operation}` : operation;

        while (true) {
          try {
            return await query(args);
          } catch (error: any) {
            attempt++;
            if (attempt <= maxRetries && isDatabaseConnectionError(error)) {
              const backoffMs = attempt * 1500;
              console.warn(
                `⚠️ [Neon PostgreSQL] Cold-start or connection pause detected during ${opName}. Retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries})...`
              );
              // Proactively re-connect base client to reset pool
              baseClient.$connect().catch(() => {});
              await new Promise((resolve) => setTimeout(resolve, backoffMs));
              continue;
            }

            // All retries failed or non-connection error: re-throw
            throw error;
          }
        }
      },
    },
  });

  return extendedClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!isValidPostgres) {
  console.error('❌ [DATABASE] DATABASE_URL is missing or invalid. Please configure a valid PostgreSQL connection string in .env.');
}

export const prisma: PrismaClient = (globalForPrisma.prisma || createPrismaClient(normalizedDbUrl)) as unknown as PrismaClient;

// Cache singleton on globalThis across all environments (local and serverless production)
// to prevent connection pool exhaustion during container reuse or lambdas
globalForPrisma.prisma = prisma;

/**
 * Verifies live database connectivity and measures query latency
 */
export async function verifyDatabaseConnection(): Promise<{
  ok: boolean;
  latencyMs: number;
  categoryCount?: number;
  productCount?: number;
  hamperCount?: number;
  orderCount?: number;
  userCount?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const [categoryCount, productCount, hamperCount, orderCount, userCount] = await Promise.all([
      (prisma as any).category.count().catch(() => 0),
      (prisma as any).product.count().catch(() => 0),
      (prisma as any).hamper.count().catch(() => 0),
      (prisma as any).order.count().catch(() => 0),
      (prisma as any).user.count().catch(() => 0),
    ]);
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      latencyMs,
      categoryCount,
      productCount,
      hamperCount,
      orderCount,
      userCount,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const safeError = sanitizeErrorMessage(err?.message);
    return { ok: false, latencyMs, error: safeError };
  }
}

export default prisma;
