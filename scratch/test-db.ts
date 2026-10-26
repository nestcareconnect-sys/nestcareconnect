import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const rawUrl = process.env.DATABASE_URL || '';
const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ':****@');
console.log('Testing connection to:', maskedUrl);

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Attempting prisma.$connect()...');
    const start = Date.now();
    await prisma.$connect();
    console.log(`Connected successfully in ${Date.now() - start}ms!`);

    const count = await prisma.category.count();
    console.log(`Category count: ${count}`);

    const userCount = await prisma.user.count();
    console.log(`User count: ${userCount}`);
  } catch (error: any) {
    console.error('Connection failed!');
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
