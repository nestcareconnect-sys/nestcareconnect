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

export function cleanDbUrl(url?: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

// Verified primary production Neon PostgreSQL cluster connection string
export const PRIMARY_PRODUCTION_DB_URL =
  'postgresql://neondb_owner:npg_QbEzlVxIC64O@ep-lively-wind-b5lekx11-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30&pool_timeout=30&connection_limit=5';

/**
 * Normalizes PostgreSQL connection string for Neon Serverless / PgBouncer
 * Ensures &pgbouncer=true, &connect_timeout=30, &pool_timeout=30, and &connection_limit=10
 * are properly configured for resilient serverless pooling.
 */
export function normalizeDatabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = cleanDbUrl(rawUrl);

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

let configuredDbUrl = cleanDbUrl(process.env.DATABASE_URL || '');
export let isUsingDatabaseFallback = false;

// If DATABASE_URL is missing, empty, or set to placeholder/test text, fallback to verified primary production cluster
if (
  !configuredDbUrl ||
  configuredDbUrl.includes('placeholder') ||
  configuredDbUrl.includes('dry-pond') ||
  configuredDbUrl.includes('123456')
) {
  console.warn('⚠️ [DATABASE] DATABASE_URL in environment was missing or placeholder. Using verified primary Neon production database.');
  configuredDbUrl = PRIMARY_PRODUCTION_DB_URL;
  isUsingDatabaseFallback = true;
}

const rawDbUrl = configuredDbUrl;
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
  diagnostics?: {
    hasDatabaseUrl: boolean;
    dbHost: string;
    isUsingFallback: boolean;
    isPooler: boolean;
  };
}> {
  const start = Date.now();
  let dbHost = 'none';
  let isPooler = false;

  try {
    if (rawDbUrl) {
      const parsed = new URL(rawDbUrl);
      dbHost = parsed.hostname;
      isPooler = rawDbUrl.includes('pooler');
    }
  } catch {}

  const diagnostics = {
    hasDatabaseUrl: Boolean(rawDbUrl),
    dbHost,
    isUsingFallback: isUsingDatabaseFallback,
    isPooler,
  };

  try {
    // Perform live query without swallowing errors
    const categoryCount = await (prisma as any).category.count();
    const [productCount, hamperCount, orderCount, userCount] = await Promise.all([
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
      diagnostics,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const safeError = sanitizeErrorMessage(err?.message || String(err));
    return {
      ok: false,
      latencyMs,
      error: safeError,
      diagnostics,
    };
  }
}

export default prisma;
