import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { memoryDb } from './memoryDb.js';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || '';
const isValidPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

let clientInstance: any;

if (isValidPostgres) {
  try {
    const globalForPrisma = global as unknown as { prisma: PrismaClient };
    clientInstance =
      globalForPrisma.prisma ||
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = clientInstance;
    console.log('📦 Connected to PostgreSQL / Neon Database via Prisma.');
  } catch (err) {
    console.warn('⚠️ PostgreSQL connection failed, switching to Memory Store mode:', err);
    clientInstance = memoryDb;
  }
} else {
  console.log('⚡ Running in In-Memory Database Mode with pre-seeded data (Configure DATABASE_URL to connect to Neon/PostgreSQL).');
  clientInstance = memoryDb;
}

export const prisma = clientInstance;
export default prisma;
