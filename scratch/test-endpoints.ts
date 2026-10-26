import prisma from '../api/config/prisma.js';

async function test() {
  try {
    console.log('Testing category findMany via api/config/prisma.ts...');
    const categories = await prisma.category.findMany();
    console.log(`Found ${categories.length} categories.`);
    
    console.log('Testing hamper findMany...');
    const hampers = await prisma.hamper.findMany();
    console.log(`Found ${hampers.length} hampers.`);

    console.log('Testing cart findFirst...');
    const cart = await prisma.cart.findFirst();
    console.log(`Cart:`, cart ? cart.id : 'No cart found (empty table)');

    console.log('Testing siteSetting findUnique...');
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'general' } });
    console.log(`Setting:`, setting ? setting.key : 'Not found');

    console.log('Testing user findUnique...');
    const user = await prisma.user.findFirst();
    console.log(`User:`, user ? user.email : 'No user found');
    
    console.log('SUCCESS! All queries succeeded against Neon PostgreSQL.');
  } catch (err: any) {
    console.error('ERROR during query:', err.message);
  } finally {
    if (prisma.$disconnect) {
      await prisma.$disconnect();
    }
  }
}

test();
