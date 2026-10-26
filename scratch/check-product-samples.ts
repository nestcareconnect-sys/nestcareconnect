import prisma from '../api/config/prisma.js';

async function checkProducts() {
  const prods = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      weight: true,
      dimensions: true,
      packageWeight: true,
      packageLength: true,
      packageWidth: true,
      packageHeight: true,
    },
    take: 10,
  });
  console.log('Sample products:', JSON.stringify(prods, null, 2));
}
checkProducts();
