import { PrismaClient } from '@prisma/client';
import { INITIAL_HERO_SLIDES as API_HERO, INITIAL_PRODUCTS as API_PRODS, INITIAL_HAMPERS as API_HAMPERS, INITIAL_CATEGORIES as API_CATS, INITIAL_HAMPER_BOXES as API_BOXES } from '../api/config/constants.js';
import { INITIAL_HERO_SLIDES as SRC_HERO, INITIAL_PRODUCTS as SRC_PRODS, INITIAL_HAMPERS as SRC_HAMPERS, INITIAL_CATEGORIES as SRC_CATS, INITIAL_HAMPER_BOXES as SRC_BOXES } from '../src/constants/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. COMPARE HERO SLIDES ===');
  for (let i = 0; i < API_HERO.length; i++) {
    const a = API_HERO[i];
    const s = SRC_HERO[i];
    if (a.desktopImage !== s.desktopImage) {
      console.log(`Hero ${a.id} desktop diff:\n  API=${a.desktopImage}\n  SRC=${s.desktopImage}`);
    }
    if (a.mobileImage !== s.mobileImage) {
      console.log(`Hero ${a.id} mobile diff:\n  API=${a.mobileImage}\n  SRC=${s.mobileImage}`);
    }
  }

  console.log('\n=== 2. COMPARE PRODUCTS ===');
  for (let i = 0; i < API_PRODS.length; i++) {
    const a = API_PRODS[i];
    const s = SRC_PRODS.find(p => p.id === a.id);
    if (s) {
      if (JSON.stringify(a.images) !== JSON.stringify(s.images)) {
        console.log(`Product ${a.id} images diff:\n  API=${JSON.stringify(a.images)}\n  SRC=${JSON.stringify(s.images)}`);
      }
    } else {
      console.log(`Product ${a.id} missing in SRC`);
    }
  }

  console.log('\n=== 3. COMPARE HAMPERS ===');
  for (let i = 0; i < API_HAMPERS.length; i++) {
    const a = API_HAMPERS[i];
    const s = SRC_HAMPERS.find(h => h.id === a.id || h.slug === a.slug);
    if (s) {
      if (JSON.stringify(a.images) !== JSON.stringify(s.images)) {
        console.log(`Hamper ${a.id} images diff:\n  API=${JSON.stringify(a.images)}\n  SRC=${JSON.stringify(s.images)}`);
      }
    }
  }

  console.log('\n=== 4. DATABASE HERO SLIDES IN NEON ===');
  const dbHeroes = await prisma.heroSlide.findMany({ orderBy: { displayOrder: 'asc' } });
  console.log(JSON.stringify(dbHeroes.map(h => ({ id: h.id, title: h.title, desktopImage: h.desktopImage, mobileImage: h.mobileImage })), null, 2));

  console.log('\n=== 5. DATABASE PRODUCTS IN NEON (FIRST 5) ===');
  const dbProds = await prisma.product.findMany({ select: { id: true, name: true, images: true }, take: 5 });
  console.log(JSON.stringify(dbProds, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
