import prisma from '../api/config/prisma.js';

async function testAll() {
  console.log('Testing all models against Neon PostgreSQL...');
  try {
    const [categories, hampers, boxes, products, users, orders, settings, rules] = await Promise.all([
      prisma.category.count(),
      prisma.hamper.count(),
      prisma.hamperBox.count(),
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.siteSetting.count(),
      prisma.shippingRule.count(),
    ]);

    console.log('Counts in Neon DB:');
    console.log('  Categories:', categories);
    console.log('  Hampers:', hampers);
    console.log('  HamperBoxes:', boxes);
    console.log('  Products:', products);
    console.log('  Users:', users);
    console.log('  Orders:', orders);
    console.log('  SiteSettings:', settings);
    console.log('  ShippingRules:', rules);
  } catch (err: any) {
    console.error('Error querying models:', err.message);
  } finally {
    if (prisma.$disconnect) await prisma.$disconnect();
  }
}

testAll();
