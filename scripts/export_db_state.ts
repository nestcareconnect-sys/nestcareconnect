import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function exportDbState() {
  const heroSlides = await prisma.heroSlide.findMany({ orderBy: { displayOrder: 'asc' } });
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'asc' }, include: { countryPrices: true } });
  const hampers = await prisma.hamper.findMany({ orderBy: { createdAt: 'asc' }, include: { items: true, countryPrices: true } });
  const boxes = await prisma.hamperBox.findMany({ orderBy: { sortOrder: 'asc' }, include: { countryPrices: true } });

  const data = {
    heroSlides,
    categories,
    products,
    hampers,
    boxes,
  };

  fs.writeFileSync('./scripts/db_dump.json', JSON.stringify(data, null, 2));
  console.log('✅ Exported DB state to ./scripts/db_dump.json');
  console.log(`Summary: ${heroSlides.length} slides, ${categories.length} categories, ${products.length} products, ${hampers.length} hampers, ${boxes.length} boxes.`);
}

exportDbState().catch(console.error).finally(() => prisma.$disconnect());
