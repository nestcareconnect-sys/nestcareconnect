import prisma from '../api/config/prisma.js';

async function main() {
  const orders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
          hamper: true,
        },
      },
    },
  });

  console.log(`Found ${orders.length} orders:`);
  for (const o of orders) {
    console.log(`\nOrder: ${o.orderNumber} (ID: ${o.id})`);
    console.log(`  Items count: ${o.items.length}`);
    console.log(`  Total: ${o.total} ${o.currency}`);
    for (const it of o.items) {
      console.log(`    - Item: "${it.name}", Type: ${it.itemType}, SKU: ${it.sku || it.product?.sku}, Qty: ${it.quantity}, Product: ${it.product?.name || 'N/A'}`);
      console.log(`      Product Weight: ${it.product?.weight}kg, packageWeight: ${it.product?.packageWeight}kg, chargeableWeight: ${it.product?.chargeableWeight}kg`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
