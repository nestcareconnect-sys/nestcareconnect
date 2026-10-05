import { PrismaClient } from '@prisma/client';
import { INITIAL_HERO_SLIDES as API_HERO, INITIAL_PRODUCTS as API_PRODS, INITIAL_HAMPERS as API_HAMPERS, INITIAL_CATEGORIES as API_CATS, INITIAL_HAMPER_BOXES as API_BOXES } from '../api/config/constants.js';
import { INITIAL_HERO_SLIDES as SRC_HERO, INITIAL_PRODUCTS as SRC_PRODS, INITIAL_HAMPERS as SRC_HAMPERS, INITIAL_CATEGORIES as SRC_CATS, INITIAL_HAMPER_BOXES as SRC_BOXES } from '../src/constants/index.js';

const prisma = new PrismaClient();

async function checkAll() {
  console.log('====================================================');
  console.log('1. HERO SLIDES');
  console.log('====================================================');
  const dbHeroes = await prisma.heroSlide.findMany({ orderBy: { displayOrder: 'asc' } });
  for (const h of dbHeroes) {
    const apiH = API_HERO.find(x => x.id === h.id);
    const srcH = SRC_HERO.find(x => x.id === h.id);
    console.log(`Slide ${h.id} (${h.title}):`);
    console.log(`  DB  Desktop: ${h.desktopImage}`);
    console.log(`  SRC Desktop: ${srcH?.desktopImage}`);
    console.log(`  API Desktop: ${apiH?.desktopImage}`);
    console.log(`  DB  Mobile:  ${h.mobileImage}`);
    console.log(`  SRC Mobile:  ${srcH?.mobileImage}`);
    console.log(`  API Mobile:  ${apiH?.mobileImage}`);
  }

  console.log('\n====================================================');
  console.log('2. CATEGORIES');
  console.log('====================================================');
  const dbCats = await prisma.category.findMany();
  for (const c of dbCats) {
    const apiC = API_CATS.find(x => x.id === c.id || x.slug === c.slug);
    const srcC = SRC_CATS.find(x => x.id === c.id || x.slug === c.slug);
    if (c.image !== srcC?.image || c.image !== apiC?.image) {
      console.log(`Category ${c.slug}: DB=${c.image} | SRC=${srcC?.image} | API=${apiC?.image}`);
    }
  }

  console.log('\n====================================================');
  console.log('3. HAMPERS');
  console.log('====================================================');
  const dbHampers = await prisma.hamper.findMany();
  for (const h of dbHampers) {
    const srcH = SRC_HAMPERS.find(x => x.id === h.id || x.slug === h.slug);
    const apiH = API_HAMPERS.find(x => x.id === h.id || x.slug === h.slug);
    console.log(`Hamper ${h.slug} (${h.name}):`);
    console.log(`  DB:  ${JSON.stringify(h.images)}`);
    console.log(`  SRC: ${JSON.stringify(srcH?.images)}`);
    console.log(`  API: ${JSON.stringify(apiH?.images)}`);
  }

  console.log('\n====================================================');
  console.log('4. PRODUCTS');
  console.log('====================================================');
  const dbProds = await prisma.product.findMany();
  for (const p of dbProds) {
    const srcP = SRC_PRODS.find(x => x.id === p.id || x.slug === p.slug);
    const apiP = API_PRODS.find(x => x.id === p.id || x.slug === p.slug);
    if (JSON.stringify(p.images) !== JSON.stringify(srcP?.images) || JSON.stringify(p.images) !== JSON.stringify(apiP?.images)) {
      console.log(`Product ${p.slug} (${p.name}):`);
      console.log(`  DB:  ${JSON.stringify(p.images)}`);
      console.log(`  SRC: ${JSON.stringify(srcP?.images)}`);
      console.log(`  API: ${JSON.stringify(apiP?.images)}`);
    }
  }

  console.log('\n====================================================');
  console.log('5. HAMPER BOXES');
  console.log('====================================================');
  const dbBoxes = await prisma.hamperBox.findMany();
  for (const b of dbBoxes) {
    const srcB = SRC_BOXES.find(x => x.id === b.id || x.slug === b.slug);
    const apiB = API_BOXES.find(x => x.id === b.id || x.slug === b.slug);
    console.log(`Box ${b.slug} (${b.name}):`);
    console.log(`  DB:  ${JSON.stringify(b.images)}`);
    console.log(`  SRC: ${JSON.stringify(srcB?.images)}`);
    console.log(`  API: ${JSON.stringify(apiB?.images)}`);
  }
}

checkAll().catch(console.error).finally(() => prisma.$disconnect());
