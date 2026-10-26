import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const basePrisma = new PrismaClient();

const extended = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        console.log(`[Prisma Extension] Intercepted ${model}.${operation}`);
        return query(args);
      },
    },
  },
});

async function test() {
  try {
    const cats = await extended.category.findMany({ take: 1 });
    console.log('Result length:', cats.length);
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await basePrisma.$disconnect();
  }
}

test();
