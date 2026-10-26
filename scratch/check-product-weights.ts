import prisma from '../api/config/prisma.js';

async function main() {
  const products = await prisma.product.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
      sku: true,
      weight: true,
      packageWeight: true,
      chargeableWeight: true,
      length: true,
      width: true,
      height: true,
    },
  });

  console.log('Sample Products:');
  for (const p of products) {
    console.log(`- ${p.name} (SKU: ${p.sku}): weight=${p.weight}kg, packageWeight=${p.packageWeight}kg, chargeableWeight=${p.chargeableWeight}kg, dims=${p.length}x${p.width}x${p.height}cm`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
